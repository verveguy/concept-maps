/**
 * Invitation acceptance page.
 * Presents pending invitations addressed to the authenticated user when
 * arriving via a tokenised share link. Handles accept/decline actions and
 * transitions back into the main application once a decision is made.
 */

import { useMemo, useState } from 'react'
import { db, tx, id } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { navigateToMap, navigateToRoot } from '@/utils/navigation'
import type { ShareInvitation } from '@/lib/schema'

/**
 * Component props for {@link InvitationPage}.
 */
interface InvitationPageProps {
  /** Token extracted from the invitation link */
  inviteToken: string
}

/**
 * Invitation acceptance/decline flow tied to a tokenised link.
 *
 * @param inviteToken - Secure invitation token from the URL
 * @returns The invitation page JSX
 */
export function InvitationPage({ inviteToken }: InvitationPageProps) {
  const auth = db.useAuth()
  const { setCurrentMapId } = useMapStore()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Query the current user's email from the $users entity
  const { data: currentUserData } = db.useQuery(
    auth.user?.id
      ? {
          $users: {
            $: { where: { id: auth.user.id } },
          },
        }
      : null
  )

  const currentUserEmail = currentUserData?.$users?.[0]?.email || null

  const invitationQuery = db.useQuery(
    inviteToken
      ? {
          shareInvitations: {
            $: {
              where: { token: inviteToken },
            },
            creator: {},
            map: {
              creator: {},
            },
          },
        }
      : null
  )

  const invitationRecord = invitationQuery?.data?.shareInvitations?.[0] ?? null
  const isLoading = invitationQuery?.isLoading ?? false

  const invitation: (ShareInvitation & { map?: { id: string; name: string; createdBy: string } }) | null = useMemo(() => {
    if (!invitationRecord) return null

    // Map is now has: 'one', so it's a single object, not an array
    const map = invitationRecord.map

    return {
      id: invitationRecord.id,
      mapId: map?.id || '',
      invitedEmail: invitationRecord.invitedEmail,
      invitedUserId: invitationRecord.invitedUserId ?? null,
      permission: invitationRecord.permission as ShareInvitation['permission'],
      token: invitationRecord.token,
      status: invitationRecord.status as ShareInvitation['status'],
      createdBy: invitationRecord.creator?.id || '',
      createdAt: new Date(invitationRecord.createdAt),
      expiresAt: invitationRecord.expiresAt ? new Date(invitationRecord.expiresAt) : null,
      respondedAt: invitationRecord.respondedAt ? new Date(invitationRecord.respondedAt) : null,
      revokedAt: invitationRecord.revokedAt ? new Date(invitationRecord.revokedAt) : null,
      map: map
        ? {
            id: map.id,
            name: map.name,
            createdBy: map.creator?.id || '',
          }
        : undefined,
    }
  }, [invitationRecord])


  /**
   * Accepts the invitation and provisions a share for the authenticated user.
   * Validates that the authenticated user's email matches the invited email.
   */
  const handleAccept = async () => {
    if (!auth.user?.id) {
      setErrorMessage('Please sign in to accept the invitation.')
      return
    }
    if (!invitation) {
      setErrorMessage('Invitation not found or already processed.')
      return
    }
    if (invitation.status !== 'pending') {
      setErrorMessage('This invitation is no longer pending.')
      return
    }
    if (!invitation.map?.id) {
      setErrorMessage('Map information is missing. Please contact the map owner.')
      return
    }

    // Validate that the authenticated user's email matches the invited email
    if (!currentUserEmail) {
      setErrorMessage('Unable to verify your email address. Please ensure your account has an email associated with it.')
      return
    }
    
    // Compare emails case-insensitively (invitedEmail is stored lowercase)
    const invitedEmailLower = invitation.invitedEmail.toLowerCase()
    const currentEmailLower = currentUserEmail.toLowerCase()
    
    if (invitedEmailLower !== currentEmailLower) {
      setErrorMessage(`This invitation was sent to ${invitation.invitedEmail}, but you are signed in as ${currentUserEmail}. Please sign in with the correct email address.`)
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      // Get the map owner (invitation creator) from the raw query data
      // The invitation creator is the map owner who created the invitation
      const mapOwnerId = invitationRecord?.creator?.id || invitationRecord?.map?.creator?.id
      if (!mapOwnerId || mapOwnerId.trim() === '') {
        console.error('Invitation data:', { invitationRecord, invitation })
        setErrorMessage('Map owner information is missing. Cannot accept invitation.')
        return
      }

      // Generate a new share ID (don't reuse invitation ID)
      const shareId = id()

      // Combine both operations in a single transaction to ensure atomicity
      await db.transact([
        tx.shareInvitations[invitation.id].update({
          status: 'accepted',
          invitedUserId: auth.user.id,
          respondedAt: Date.now(),
          revokedAt: null,
        }),
        tx.shares[shareId]
          .update({
            permission: invitation.permission,
            createdAt: Date.now(),
            acceptedAt: Date.now(),
            status: 'active',
            revokedAt: null,
          })
          .link({
            user: auth.user.id,
            map: invitation.map.id,
            creator: mapOwnerId, // Link creator to map owner for permission checks
            invitation: invitation.id, // Link to the invitation that created this share
          }),
        // Create permission links based on the invitation permission
        ...(invitation.permission === 'edit'
          ? [tx.maps[invitation.map.id].link({ writePermissions: auth.user.id })]
          : [tx.maps[invitation.map.id].link({ readPermissions: auth.user.id })]),
      ])

      // Navigate to the map URL after accepting the invitation
      navigateToMap(invitation.map.id)
    } catch (error) {
      console.error('Failed to accept invitation', error)
      setErrorMessage('Failed to accept the invitation. Please try again or contact the owner.')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Declines the invitation for the authenticated user.
   * Validates that the authenticated user's email matches the invited email.
   */
  const handleDecline = async () => {
    if (!auth.user?.id) {
      setErrorMessage('Please sign in to decline the invitation.')
      return
    }
    if (!invitation) {
      setErrorMessage('Invitation not found or already processed.')
      return
    }
    if (invitation.status !== 'pending') {
      setErrorMessage('This invitation is no longer pending.')
      return
    }

    // Validate that the authenticated user's email matches the invited email
    if (!currentUserEmail) {
      setErrorMessage('Unable to verify your email address. Please ensure your account has an email associated with it.')
      return
    }
    
    // Compare emails case-insensitively (invitedEmail is stored lowercase)
    const invitedEmailLower = invitation.invitedEmail.toLowerCase()
    const currentEmailLower = currentUserEmail.toLowerCase()
    
    if (invitedEmailLower !== currentEmailLower) {
      setErrorMessage(`This invitation was sent to ${invitation.invitedEmail}, but you are signed in as ${currentUserEmail}. Please sign in with the correct email address.`)
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      await db.transact([
        tx.shareInvitations[invitation.id].update({
          status: 'declined',
          invitedUserId: auth.user.id,
          respondedAt: Date.now(),
        }),
      ])
    } catch (error) {
      console.error('Failed to decline invitation', error)
      setErrorMessage('Failed to decline the invitation. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Loading state while fetching the invitation
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground">Loading invitation…</div>
      </div>
    )
  }

  // Invitation not found state
  if (!invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center max-w-md">
          <h1 className="text-2xl font-semibold">Invitation Not Found</h1>
          <p className="text-sm text-muted-foreground">
            This invitation could not be located. It may have been revoked or the link may be incorrect.
          </p>
          <button
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            onClick={() => navigateToRoot()}
          >
            Return to app
          </button>
        </div>
      </div>
    )
  }

  const isAccepted = invitation.status === 'accepted'
  const isDeclined = invitation.status === 'declined'
  
  // Check if emails match (case-insensitive comparison)
  // Returns false if user is not authenticated or email is not available
  const emailsMatch = auth.user && currentUserEmail 
    ? invitation.invitedEmail.toLowerCase() === currentUserEmail.toLowerCase()
    : false

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-lg bg-card border rounded-lg shadow-md p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Join "{invitation.map?.name ?? 'Shared Map'}"</h1>
          <p className="text-sm text-muted-foreground">
            {invitation.permission === 'edit'
              ? 'You have been invited to collaborate with edit access.'
              : 'You have been invited to view this map.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
            {errorMessage}
          </div>
        )}

        {isAccepted && (
          <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-md">
            Invitation accepted! You now have access to this map.
          </div>
        )}

        {isDeclined && (
          <div className="p-3 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-md">
            This invitation has been declined.
          </div>
        )}

        {!auth.user && (
          <div className="p-3 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md">
            Sign in with the email address that received this invitation ({invitation.invitedEmail}) to accept or decline.
          </div>
        )}

        {auth.user && currentUserEmail && invitation.invitedEmail.toLowerCase() !== currentUserEmail.toLowerCase() && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
            <strong>Email mismatch:</strong> This invitation was sent to <strong>{invitation.invitedEmail}</strong>, but you are signed in as <strong>{currentUserEmail}</strong>. Please sign out and sign in with the correct email address to accept this invitation.
          </div>
        )}

        {invitation.expiresAt && invitation.expiresAt.getTime() < Date.now() && (
          <div className="p-3 text-sm text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-md">
            This invitation has expired. Contact the map owner to request a new link.
          </div>
        )}

        {invitation.status !== 'pending' && invitation.status !== 'accepted' && invitation.status !== 'declined' && (
          <div className="p-3 text-sm text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-md">
            This invitation is marked as {invitation.status}. Please contact the map owner for a new invite if needed.
          </div>
        )}

        <div className="flex flex-col gap-2 text-sm">
          <div><strong>Owner:</strong> {invitation.createdBy}</div>
          <div><strong>Permission:</strong> {invitation.permission}</div>
          <div><strong>Invited Email:</strong> {invitation.invitedEmail}</div>
          {auth.user && currentUserEmail && (
            <div><strong>Your Email:</strong> {currentUserEmail}</div>
          )}
          <div><strong>Token:</strong> {inviteToken.slice(0, 12)}...</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          {!isAccepted && !isDeclined && (
            <button
              onClick={handleDecline}
              disabled={isProcessing || invitation.status !== 'pending' || !!(auth.user && !emailsMatch)}
              className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Decline
            </button>
          )}
          {isAccepted ? (
            <button
              onClick={() => {
                // Navigate to the map URL
                if (invitation.map?.id) {
                  navigateToMap(invitation.map.id)
                } else {
                  navigateToRoot()
                }
              }}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Open Map
            </button>
          ) : (
            <button
              onClick={handleAccept}
              disabled={isProcessing || invitation.status !== 'pending' || !!(auth.user && !emailsMatch)}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Accept Invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


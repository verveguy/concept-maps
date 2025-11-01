/**
 * Invitation acceptance page.
 * Presents pending invitations addressed to the authenticated user when
 * arriving via a tokenised share link. Handles accept/decline actions and
 * transitions back into the main application once a decision is made.
 */

import { useMemo, useState } from 'react'
import { db, tx } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
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
  const [hasCompleted, setHasCompleted] = useState(false)

  const invitationQuery = db.useQuery(
    inviteToken
      ? {
          shareInvitations: {
            $: {
              where: { token: inviteToken },
            },
            map: {
              id: true,
              name: true,
              createdBy: true,
            },
          },
        }
      : null,
    inviteToken
      ? {
          params: {
            token: inviteToken,
          },
        }
      : undefined
  )

  const data = invitationQuery?.data
  const isLoading = invitationQuery?.isLoading ?? false

  const invitation: (ShareInvitation & { map?: { id: string; name: string; createdBy: string } }) | null = useMemo(() => {
    const rawInvitation = data?.shareInvitations?.[0]
    if (!rawInvitation) return null

    return {
      id: rawInvitation.id,
      mapId: rawInvitation.mapId,
      invitedEmail: rawInvitation.invitedEmail,
      invitedUserId: rawInvitation.invitedUserId ?? null,
      permission: rawInvitation.permission as ShareInvitation['permission'],
      token: rawInvitation.token,
      status: rawInvitation.status as ShareInvitation['status'],
      createdBy: rawInvitation.createdBy,
      createdAt: new Date(rawInvitation.createdAt),
      expiresAt: rawInvitation.expiresAt ? new Date(rawInvitation.expiresAt) : null,
      respondedAt: rawInvitation.respondedAt ? new Date(rawInvitation.respondedAt) : null,
      revokedAt: rawInvitation.revokedAt ? new Date(rawInvitation.revokedAt) : null,
      map: rawInvitation.map
        ? {
            id: rawInvitation.map.id,
            name: rawInvitation.map.name,
            createdBy: rawInvitation.map.createdBy,
          }
        : undefined,
    }
  }, [data?.shareInvitations])

  /**
   * Utility to clear the invitation token from the URL after the flow finishes.
   */
  const clearInviteTokenFromUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('inviteToken')
    window.history.replaceState({}, document.title, url.toString())
  }

  /**
   * Accepts the invitation and provisions a share for the authenticated user.
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

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      await db.transact([
        tx.shareInvitations[invitation.id].update({
          status: 'accepted',
          invitedUserId: auth.user.id,
          respondedAt: Date.now(),
          revokedAt: null,
        }),
      ])

      await db.transact([
        tx.shares[invitation.id].update({
          mapId: invitation.mapId,
          userId: auth.user.id,
          permission: invitation.permission,
          createdAt: Date.now(),
          acceptedAt: Date.now(),
          status: 'active',
          revokedAt: null,
          invitationId: invitation.id,
        }),
      ])

      setCurrentMapId(invitation.mapId)
      setHasCompleted(true)
      clearInviteTokenFromUrl()
    } catch (error) {
      console.error('Failed to accept invitation', error)
      setErrorMessage('Failed to accept the invitation. Please try again or contact the owner.')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Declines the invitation for the authenticated user.
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

      clearInviteTokenFromUrl()
      setHasCompleted(true)
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
            onClick={clearInviteTokenFromUrl}
          >
            Return to app
          </button>
        </div>
      </div>
    )
  }

  if (hasCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center max-w-md">
          <h1 className="text-2xl font-semibold">All Set!</h1>
          <p className="text-sm text-muted-foreground">
            You can now continue to the map workspace.
          </p>
          <button
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            onClick={() => clearInviteTokenFromUrl()}
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

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

        {!auth.user && (
          <div className="p-3 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-md">
            Sign in with the email address that received this invitation to accept or decline.
          </div>
        )}

        {invitation.expiresAt && invitation.expiresAt.getTime() < Date.now() && (
          <div className="p-3 text-sm text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-md">
            This invitation has expired. Contact the map owner to request a new link.
          </div>
        )}

        {invitation.status !== 'pending' && (
          <div className="p-3 text-sm text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-md">
            This invitation is marked as {invitation.status}. Please contact the map owner for a new invite if needed.
          </div>
        )}

        <div className="flex flex-col gap-2 text-sm">
          <div><strong>Owner:</strong> {invitation.createdBy}</div>
          <div><strong>Permission:</strong> {invitation.permission}</div>
          <div><strong>Invited Email:</strong> {invitation.invitedEmail}</div>
          <div><strong>Token:</strong> {inviteToken.slice(0, 12)}...</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          <button
            onClick={handleDecline}
            disabled={isProcessing || invitation.status !== 'pending'}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing || invitation.status !== 'pending'}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Accept Invitation'}
          </button>
        </div>
      </div>
    </div>
  )
}


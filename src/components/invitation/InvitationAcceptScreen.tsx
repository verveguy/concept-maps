/**
 * In-app invitation acceptance screen component.
 * Displays an invitation acceptance UI in the Canvas area when a user
 * tries to view a map they have a pending invitation for.
 */

import { useState } from 'react'
import { Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useSharing } from '@/hooks/useSharing'
import type { ShareInvitation } from '@/lib/schema'

/**
 * Component props for {@link InvitationAcceptScreen}.
 */
interface InvitationAcceptScreenProps {
  /** The pending invitation to accept or decline */
  invitation: ShareInvitation & { map?: { id: string; name: string; createdBy: string } }
  /** The map ID this invitation is for */
  mapId: string
}

/**
 * In-app invitation acceptance screen.
 * 
 * Displays an invitation acceptance UI similar to InvitationPage but designed
 * for display within the app's Canvas area. Allows users to accept or decline
 * invitations without needing the invitation token.
 * 
 * **Features:**
 * - Shows map name and permission level
 * - Validates email matches invitation
 * - Accept/decline buttons
 * - Error handling and loading states
 * - Handles expired/revoked invitations
 * 
 * @param props - Component props
 * @param props.invitation - The pending invitation to display
 * @param props.mapId - The map ID this invitation is for
 * @returns The invitation acceptance screen JSX
 */
export function InvitationAcceptScreen({ invitation, mapId }: InvitationAcceptScreenProps) {
  const { acceptInvitation, declineInvitation, currentUserEmail } = useSharing(mapId)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isAccepted, setIsAccepted] = useState(invitation.status === 'accepted')
  const [isDeclined, setIsDeclined] = useState(invitation.status === 'declined')

  /**
   * Handles accepting the invitation.
   * Uses the acceptInvitation function from useSharing hook.
   */
  const handleAccept = async () => {
    if (invitation.status !== 'pending') {
      setErrorMessage('This invitation is no longer pending.')
      return
    }

    // Validate email match
    if (!currentUserEmail) {
      setErrorMessage('Unable to verify your email address. Please ensure your account has an email associated with it.')
      return
    }

    const invitedEmailLower = invitation.invitedEmail.toLowerCase()
    const currentEmailLower = currentUserEmail.toLowerCase()

    if (invitedEmailLower !== currentEmailLower) {
      setErrorMessage(`This invitation was sent to ${invitation.invitedEmail}, but you are signed in as ${currentUserEmail}. Please sign in with the correct email address.`)
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      await acceptInvitation(invitation.id)
      setIsAccepted(true)
      // The map should automatically become accessible after accepting
      // The component will re-render and MapPage will show the canvas
    } catch (error) {
      console.error('Failed to accept invitation', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to accept the invitation. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Handles declining the invitation.
   * Uses the declineInvitation function from useSharing hook.
   */
  const handleDecline = async () => {
    if (invitation.status !== 'pending') {
      setErrorMessage('This invitation is no longer pending.')
      return
    }

    // Validate email match
    if (!currentUserEmail) {
      setErrorMessage('Unable to verify your email address. Please ensure your account has an email associated with it.')
      return
    }

    const invitedEmailLower = invitation.invitedEmail.toLowerCase()
    const currentEmailLower = currentUserEmail.toLowerCase()

    if (invitedEmailLower !== currentEmailLower) {
      setErrorMessage(`This invitation was sent to ${invitation.invitedEmail}, but you are signed in as ${currentUserEmail}. Please sign in with the correct email address.`)
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      await declineInvitation(invitation.id)
      setIsDeclined(true)
    } catch (error) {
      console.error('Failed to decline invitation', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to decline the invitation. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  // Check if emails match (case-insensitive comparison)
  const emailsMatch = currentUserEmail
    ? invitation.invitedEmail.toLowerCase() === currentUserEmail.toLowerCase()
    : false

  // Check if invitation is expired
  const isExpired = invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()

  // Determine permission description
  const permissionDescription =
    invitation.permission === 'manage'
      ? 'You have been invited to collaborate with manage access.'
      : invitation.permission === 'edit'
        ? 'You have been invited to collaborate with edit access.'
        : 'You have been invited to view this map.'

  return (
    <div className="flex items-center justify-center h-full w-full p-8">
      <div className="w-full max-w-lg bg-card border rounded-lg shadow-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-1">
              Join "{invitation.map?.name ?? 'Shared Map'}"
            </h2>
            <p className="text-sm text-muted-foreground">
              {permissionDescription}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-md flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isAccepted && (
          <div className="p-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-md flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Invitation accepted! Setting up access permissions...</span>
          </div>
        )}

        {isDeclined && (
          <div className="p-3 text-sm text-gray-700 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20 border border-gray-100 dark:border-gray-900/30 rounded-md flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>This invitation has been declined.</span>
          </div>
        )}

        {currentUserEmail && !emailsMatch && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-md">
            <strong>Email mismatch:</strong> This invitation was sent to{' '}
            <strong>{invitation.invitedEmail}</strong>, but you are signed in as{' '}
            <strong>{currentUserEmail}</strong>. Please sign out and sign in with the correct
            email address to accept this invitation.
          </div>
        )}

        {isExpired && (
          <div className="p-3 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 rounded-md">
            This invitation has expired. Contact the map owner to request a new link.
          </div>
        )}

        {invitation.status !== 'pending' && invitation.status !== 'accepted' && invitation.status !== 'declined' && (
          <div className="p-3 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 rounded-md">
            This invitation is marked as {invitation.status}. Please contact the map owner for a
            new invite if needed.
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
          {!isAccepted && !isDeclined && (
            <button
              onClick={handleDecline}
              disabled={isProcessing || invitation.status !== 'pending' || !emailsMatch}
              className="px-4 py-2 text-sm border border-input bg-background text-foreground rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Decline
            </button>
          )}
          {isAccepted ? (
            <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              <span>Access granted! Loading map...</span>
            </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={isProcessing || invitation.status !== 'pending' || !emailsMatch || isExpired}
              className="px-4 py-2 text-sm border-2 border-green-600 dark:border-green-500 bg-background text-green-700 dark:text-green-400 rounded-md hover:bg-green-50 dark:hover:bg-green-950/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 border-2 border-green-600/30 dark:border-green-500/30 border-t-green-600 dark:border-t-green-500 rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


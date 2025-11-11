/**
 * Dialog component for managing map sharing and permissions.
 * Provides UI for sharing maps with other users and managing access.
 */

import { useState } from 'react'
import { X, Copy, Mail, Trash2 } from 'lucide-react'
import { useSharing, generateShareLink } from '@/hooks/useSharing'
import { useMap } from '@/hooks/useMap'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { format } from 'date-fns'
import { getAvatarUrl } from '@/lib/avatar'

/**
 * Simple avatar component for displaying user avatars in the share dialog.
 * Shows Gravatar image if available, otherwise shows initials.
 * 
 * @param email - User's email address (used for Gravatar and initials)
 * @param imageURL - Custom image URL (takes priority over Gravatar)
 * @param size - Size of the avatar in pixels (default: 32)
 */
function ShareAvatar({ 
  email, 
  imageURL, 
  size = 32 
}: { 
  email: string | null
  imageURL?: string | null
  size?: number 
}) {
  const avatarUrl = getAvatarUrl(email || undefined, imageURL || undefined, size)
  const [imageError, setImageError] = useState(false)
  
  // Generate initials from email
  const getInitials = (email: string | null): string => {
    if (!email) return '?'
    const parts = email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
    }
    return email.substring(0, 2).toUpperCase()
  }
  
  const initials = getInitials(email)
  
  // Show avatar image if available and not errored
  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={email || 'User'}
        className="rounded-full shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImageError(true)}
      />
    )
  }
  
  // Fallback to initials
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 text-xs font-semibold text-white bg-gray-400"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

/**
 * Props for ShareDialog component.
 */
export interface ShareDialogProps {
  /** Map ID to share, or null */
  mapId: string | null
  /** Callback when dialog should close */
  onClose: () => void
}

/**
 * Dialog component for managing map sharing and permissions.
 * 
 * Provides a comprehensive interface for sharing maps with other users, managing
 * invitations, and controlling access permissions. Supports both view and edit
 * permission levels.
 * 
 * **Features:**
 * - Create invitations by email address
 * - View active shares and pending invitations
 * - Update permission levels (view/edit)
 * - Revoke shares and invitations
 * - Generate shareable links with invitation tokens
 * - Accept/decline invitations (for invitees)
 * 
 * **Permission Levels:**
 * - `'view'`: Read-only access - can view but not modify
 * - `'edit'`: Read-write access - can view and modify
 * - `'manage'`: Manager access - can edit map and manage shares (invite others, update permissions, revoke shares)
 * 
 * **Invitation Flow:**
 * 1. Owner or manager enters email and selects permission level
 * 2. Invitation is created with a secure token
 * 3. Shareable link is generated (can be copied/shared)
 * 4. Invitee clicks link and accepts invitation
 * 5. Share record is created and permissions are granted
 * 
 * **Access Control:**
 * Map owners and managers can manage shares. Users with edit access cannot share the map
 * with others (only owners and managers can).
 * 
 * @param props - Component props
 * @param props.mapId - Map ID to share, or null if no map is selected
 * @param props.onClose - Callback when dialog should close
 * @returns The share dialog JSX
 * 
 * @example
 * ```tsx
 * import { ShareDialog } from '@/components/share/ShareDialog'
 * 
 * function MapHeader() {
 *   const [showShare, setShowShare] = useState(false)
 *   
 *   return (
 *     <>
 *       <button onClick={() => setShowShare(true)}>Share Map</button>
 *       {showShare && (
 *         <ShareDialog
 *           mapId={currentMapId}
 *           onClose={() => setShowShare(false)}
 *         />
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function ShareDialog({ mapId, onClose }: ShareDialogProps) {
  const {
    currentUser,
    currentUserEmail,
    shares,
    invitations,
    createInvitation,
    updateSharePermission,
    revokeShare,
    revokeInvitation,
    deleteInvitation,
  } = useSharing(mapId)
  const { map } = useMap()
  const { hasManageAccess } = useMapPermissions()
  
  const [emailInput, setEmailInput] = useState('')
  const [permissionInput, setPermissionInput] = useState<'view' | 'edit' | 'manage'>('edit')
  const [isSharing, setIsSharing] = useState(false)
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Check if current user is the map owner
  const isOwner = map?.creator?.id === currentUser?.id
  
  // Check if current user can manage shares (owner or manager)
  const canManageShares = isOwner || hasManageAccess

  // Invitations are already filtered in useSharing hook to exclude accepted ones with shares
  // So we can use invitations directly
  const visibleInvitations = invitations

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mapId || !emailInput.trim()) return

    // Clear previous errors
    setEmailError(null)

    const inviteEmail = emailInput.trim().toLowerCase()

    // Validate that user is not sharing with themselves
    if (currentUserEmail && inviteEmail === currentUserEmail.toLowerCase()) {
      setEmailError('You cannot share a map with yourself. Please enter a different email address.')
      return
    }

    // Check if user already has an active share
    const existingActiveShare = shares.find(
      (share) =>
        share.status === 'active' &&
        share.userEmail?.toLowerCase() === inviteEmail
    )
    if (existingActiveShare) {
      setEmailError(
        `This map is already shared with ${inviteEmail}. They have ${existingActiveShare.permission} access.`
      )
      return
    }

    // Check if there's already a pending invitation for this email
    const existingPendingInvitation = invitations.find(
      (inv) =>
        inv.status === 'pending' &&
        inv.invitedEmail.toLowerCase() === inviteEmail
    )
    if (existingPendingInvitation) {
      setEmailError(
        `There is already a pending invitation for ${inviteEmail}. Please revoke the existing invitation first if you want to send a new one.`
      )
      return
    }

    setIsSharing(true)
    try {
      await createInvitation(inviteEmail, permissionInput)
      setEmailInput('')
      setPermissionInput('edit')
      setEmailError(null)
    } catch (error) {
      console.error('Failed to share map:', error)
      alert('Failed to share map. Please try again.')
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = async (invitationId: string, token: string) => {
    if (!mapId) return

    const link = generateShareLink(mapId, token)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedInvitationId(invitationId)
      setTimeout(() => setCopiedInvitationId(null), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      alert('Failed to copy link. Please try again.')
    }
  }

  const handleUpdatePermission = async (shareId: string, permission: 'view' | 'edit' | 'manage') => {
    try {
      await updateSharePermission(shareId, permission)
    } catch (error) {
      console.error('Failed to update permission:', error)
      alert('Failed to update permission. Please try again.')
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to revoke this share? This will immediately remove access.')) return

    try {
      await revokeShare(shareId)
    } catch (error) {
      console.error('Failed to revoke share:', error)
      alert('Failed to revoke share. Please try again.')
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Revoke this invitation? This action will cancel the link and remove any associated access.')) return

    try {
      await revokeInvitation(invitationId)
    } catch (error) {
      console.error('Failed to revoke invitation:', error)
      alert('Failed to revoke invitation. Please try again.')
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('Permanently delete this invitation? This action cannot be undone.')) return

    try {
      await deleteInvitation(invitationId)
    } catch (error) {
      console.error('Failed to delete invitation:', error)
      alert('Failed to delete invitation. Please try again.')
    }
  }

  if (!mapId || !map) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70"
      onClick={onClose}
    >
      <div 
        className="bg-card text-card-foreground rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-card-foreground">Share "{map.name}"</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors text-card-foreground"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
          {/* Share with User Section */}
          {canManageShares && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Share with User
              </label>
              <form onSubmit={handleShare}>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 relative">
                    {emailInput.trim() && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                        <ShareAvatar email={emailInput.trim()} size={20} />
                      </div>
                    )}
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value)
                        // Clear error when user starts typing
                        if (emailError) setEmailError(null)
                      }}
                      placeholder="user@example.com"
                      className={`w-full py-2 border rounded-md text-sm bg-background text-foreground ${
                        emailInput.trim() ? 'pl-10' : 'pl-3'
                      } pr-3 ${
                        emailError
                          ? 'border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500'
                          : 'border-input'
                      }`}
                      required
                    />
                    {emailError && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>
                    )}
                  </div>
                  <div className="flex gap-2 items-start">
                    <select
                      value={permissionInput}
                      onChange={(e) => setPermissionInput(e.target.value as 'view' | 'edit' | 'manage')}
                      className="px-3 py-2 border border-input bg-background text-foreground rounded-md text-sm"
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                      <option value="manage">Manage</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isSharing || !!emailError}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Share
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Invitation List */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Invitations ({visibleInvitations.length})
            </label>
            {visibleInvitations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {visibleInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-3 bg-muted rounded-md border flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">{invitation.invitedEmail}</div>
                        <div className="text-xs text-muted-foreground">
                          Permission: {invitation.permission} ? Status: {invitation.status}
                        </div>
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          Invited {format(invitation.createdAt, 'MMM d, yyyy h:mm a')}
                          {invitation.respondedAt && (
                            <> ? {invitation.status === 'accepted' ? 'Accepted' : invitation.status === 'declined' ? 'Rejected' : 'Responded'} {format(invitation.respondedAt, 'MMM d, yyyy h:mm a')}</>
                          )}
                          {invitation.revokedAt && (
                            <> ? Revoked {format(invitation.revokedAt, 'MMM d, yyyy h:mm a')}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(invitation.id, invitation.token)}
                          className="px-2 py-1 text-xs border border-input bg-background text-foreground rounded-md flex items-center gap-1 hover:bg-accent"
                          disabled={invitation.status === 'revoked'}
                        >
                          <Copy className="h-3 w-3" />
                          {copiedInvitationId === invitation.id ? 'Copied' : 'Copy Link'}
                        </button>
                        {canManageShares && invitation.status !== 'revoked' && (
                          <button
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="px-2 py-1 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            Revoke
                          </button>
                        )}
                        {canManageShares && invitation.status === 'revoked' && (
                          <button
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            className="px-2 py-1 text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1"
                            title="Permanently delete this invitation"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared Users List */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Shared With ({shares.length})
            </label>
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users shared yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-md border"
                  >
                    <div className="flex-1 flex items-center gap-3">
                      <ShareAvatar 
                        email={share.userEmail} 
                        imageURL={share.userImageURL}
                        size={32}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-foreground">{share.userEmail || share.userId}</div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              share.status === 'active'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : share.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            }`}
                          >
                            {share.status === 'active' ? 'Active' : share.status === 'pending' ? 'Pending' : 'Revoked'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Shared {format(share.createdAt, 'MMM d, yyyy')}
                          {share.acceptedAt && share.status !== 'revoked' && (
                            <> ? Accepted {format(share.acceptedAt, 'MMM d, yyyy')}</>
                          )}
                          {share.revokedAt && (
                            <> ? Revoked {format(share.revokedAt, 'MMM d, yyyy')}</>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManageShares && (
                      <div className="flex items-center gap-2">
                        <select
                          value={share.permission}
                          onChange={(e) =>
                            handleUpdatePermission(
                              share.id,
                              e.target.value as 'view' | 'edit' | 'manage'
                            )
                          }
                          className="px-2 py-1 text-xs border border-input bg-background text-foreground rounded-md"
                          disabled={share.status !== 'active'}
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                          <option value="manage">Manage</option>
                        </select>
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                          aria-label="Revoke share"
                          disabled={share.status === 'revoked'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {!canManageShares && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {share.permission}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


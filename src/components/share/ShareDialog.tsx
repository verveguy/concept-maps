/**
 * Dialog component for managing map sharing and permissions.
 * Provides UI for sharing maps with other users and managing access.
 */

import { useState } from 'react'
import { X, Copy, Mail, Trash2 } from 'lucide-react'
import { useSharing, generateShareLink } from '@/hooks/useSharing'
import { useMap } from '@/hooks/useMap'
import { format } from 'date-fns'

/**
 * Props for ShareDialog component.
 */
interface ShareDialogProps {
  /** Map ID to share, or null */
  mapId: string | null
  /** Callback when dialog should close */
  onClose: () => void
}

/**
 * Dialog component for managing map sharing and permissions.
 * 
 * @param mapId - Map ID to share, or null
 * @param onClose - Callback when dialog should close
 * @returns The share dialog JSX
 */
export function ShareDialog({ mapId, onClose }: ShareDialogProps) {
  const {
    currentUser,
    shares,
    invitations,
    createInvitation,
    updateSharePermission,
    revokeShare,
    revokeInvitation,
  } = useSharing(mapId)
  const map = useMap()
  
  const [emailInput, setEmailInput] = useState('')
  const [permissionInput, setPermissionInput] = useState<'view' | 'edit'>('edit')
  const [isSharing, setIsSharing] = useState(false)
  const [lastShareLink, setLastShareLink] = useState<string | null>(null)
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null)

  // Check if current user is the map owner
  const isOwner = map?.creator?.id === currentUser?.id

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mapId || !emailInput.trim()) return

    setIsSharing(true)
    try {
      // For now, we'll use email as userId (in a real app, you'd look up userId by email)
      // This is a simplified implementation - in production, you'd need user lookup
      const inviteEmail = emailInput.trim().toLowerCase()

      const token = await createInvitation(inviteEmail, permissionInput)
      setLastShareLink(generateShareLink(mapId, token))
      setEmailInput('')
      setPermissionInput('edit')
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

  const handleUpdatePermission = async (shareId: string, permission: 'view' | 'edit') => {
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

  if (!mapId || !map) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Share "{map.name}"</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Last Generated Invitation Link */}
          {lastShareLink && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Most Recent Invitation Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lastShareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(lastShareLink)
                    } catch (error) {
                      console.error('Failed to copy link:', error)
                      alert('Failed to copy link. Please try again.')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Share this link with the invitee. Links are tied to individual invitations and become invalid if revoked.
              </p>
            </div>
          )}

          {/* Share with User Section */}
          {isOwner && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share with User
              </label>
              <form onSubmit={handleShare} className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="user@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
                <select
                  value={permissionInput}
                  onChange={(e) => setPermissionInput(e.target.value as 'view' | 'edit')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
                <button
                  type="submit"
                  disabled={isSharing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Share
                </button>
              </form>
            </div>
          )}

          {/* Invitation List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invitations ({invitations.length})
            </label>
            {invitations.length === 0 ? (
              <p className="text-sm text-gray-500">No invitations created yet.</p>
            ) : (
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-3 bg-gray-50 rounded-md border border-gray-100 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{invitation.invitedEmail}</div>
                        <div className="text-xs text-gray-500">
                          Permission: {invitation.permission} ? Status: {invitation.status}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Created {format(invitation.createdAt, 'MMM d, yyyy h:mm a')}
                          {invitation.respondedAt && (
                            <> ? Responded {format(invitation.respondedAt, 'MMM d, yyyy h:mm a')}</>
                          )}
                          {invitation.revokedAt && (
                            <> ? Revoked {format(invitation.revokedAt, 'MMM d, yyyy h:mm a')}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(invitation.id, invitation.token)}
                          className="px-2 py-1 text-xs border rounded-md flex items-center gap-1 hover:bg-gray-100"
                          disabled={invitation.status === 'revoked'}
                        >
                          <Copy className="h-3 w-3" />
                          {copiedInvitationId === invitation.id ? 'Copied' : 'Copy Link'}
                        </button>
                        {isOwner && invitation.status !== 'revoked' && (
                          <button
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                          >
                            Revoke
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shared With ({shares.length})
            </label>
            {shares.length === 0 ? (
              <p className="text-sm text-gray-500">No users shared yet</p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{share.userEmail || share.userId}</div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            share.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : share.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {share.status === 'active' ? 'Active' : share.status === 'pending' ? 'Pending' : 'Revoked'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Shared {format(share.createdAt, 'MMM d, yyyy')}
                        {share.acceptedAt && share.status !== 'revoked' && (
                          <> ? Accepted {format(share.acceptedAt, 'MMM d, yyyy')}</>
                        )}
                        {share.revokedAt && (
                          <> ? Revoked {format(share.revokedAt, 'MMM d, yyyy')}</>
                        )}
                      </div>
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-2">
                        <select
                          value={share.permission}
                          onChange={(e) =>
                            handleUpdatePermission(
                              share.id,
                              e.target.value as 'view' | 'edit'
                            )
                          }
                          className="px-2 py-1 text-xs border border-gray-300 rounded-md"
                          disabled={share.status !== 'active'}
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                        </select>
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          aria-label="Revoke share"
                          disabled={share.status === 'revoked'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {!isOwner && (
                      <span className="text-xs text-gray-500 capitalize">
                        {share.permission}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


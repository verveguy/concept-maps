/**
 * Dialog component for managing map sharing and permissions.
 * Provides UI for sharing maps with other users and managing access.
 */

import { useState, useEffect } from 'react'
import { X, Copy, Mail, Trash2 } from 'lucide-react'
import { useSharing, generateShareLink } from '@/hooks/useSharing'
import { useMap } from '@/hooks/useMap'
import { db } from '@/lib/instant'
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
  const { shares, shareMap, updateSharePermission, removeShare } = useSharing(mapId)
  const map = useMap()
  const currentUser = db.auth?.user
  
  const [emailInput, setEmailInput] = useState('')
  const [permissionInput, setPermissionInput] = useState<'view' | 'edit'>('edit')
  const [isSharing, setIsSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)

  // Check if current user is the map owner
  const isOwner = map?.createdBy === currentUser?.id

  // Get or create a link-based share token
  const getOrCreateShareToken = async () => {
    if (!mapId) return null

    // Check if there's already a share with a token for this map
    const existingShare = shares.find((s) => s.token && !s.userId)
    if (existingShare?.token) {
      return existingShare.token
    }

    // Create a new link-based share (no userId)
    try {
      const result = await shareMap(null, permissionInput, true)
      return result.token || null
    } catch (error) {
      console.error('Failed to create share token:', error)
      return null
    }
  }

  // Load or create share token on mount
  useEffect(() => {
    if (mapId && isOwner) {
      getOrCreateShareToken().then((token) => {
        if (token) setShareToken(token)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, isOwner, shares.length])

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mapId || !emailInput.trim()) return

    setIsSharing(true)
    try {
      // For now, we'll use email as userId (in a real app, you'd look up userId by email)
      // This is a simplified implementation - in production, you'd need user lookup
      const userId = emailInput.trim().toLowerCase()
      
      await shareMap(userId, permissionInput, false) // Don't generate token for user-based shares
      setEmailInput('')
      setPermissionInput('edit')
    } catch (error) {
      console.error('Failed to share map:', error)
      alert('Failed to share map. Please try again.')
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopyLink = async () => {
    if (!mapId) return
    
    // Get or create share token if we don't have one
    let token = shareToken
    if (!token && isOwner) {
      token = await getOrCreateShareToken()
      if (token) setShareToken(token)
    }
    
    const link = generateShareLink(mapId, token || undefined)
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Are you sure you want to remove this share?')) return

    try {
      await removeShare(shareId)
    } catch (error) {
      console.error('Failed to remove share:', error)
      alert('Failed to remove share. Please try again.')
    }
  }

  if (!mapId || !map) return null

  const shareLink = generateShareLink(mapId, shareToken || undefined)

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
          {/* Share Link Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Anyone with this link can access the map
            </p>
          </div>

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
                        <div className="text-sm font-medium">{share.userId}</div>
                        {share.acceptedAt ? (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                            Accepted
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Shared {format(share.createdAt, 'MMM d, yyyy')}
                        {share.acceptedAt && (
                          <> ? Accepted {format(share.acceptedAt, 'MMM d, yyyy')}</>
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
                        >
                          <option value="view">View</option>
                          <option value="edit">Edit</option>
                        </select>
                        <button
                          onClick={() => handleRemoveShare(share.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          aria-label="Remove share"
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


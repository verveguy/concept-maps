/**
 * Hook for setting current user's cursor position only.
 * Does NOT subscribe to peer cursor positions, so it won't cause re-renders when cursors move.
 * 
 * Use this hook in components that need to update the current user's cursor position
 * but don't need to render peer cursors.
 * 
 * @returns Setter function for current user's cursor position
 */

import { useCallback } from 'react'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { getAvatarUrl } from '@/lib/avatar'
import { generateAnonymousUserId, generateNameForUser, generateColorForUser } from '@/lib/presence'

/**
 * Hook to set ONLY the current user's cursor position.
 * Subscribes to InstantDB presence room but only uses publishPresence (doesn't read peers).
 * This hook will NOT trigger re-renders when peer cursors move.
 * 
 * @returns Setter function for current user's cursor position
 */
export function usePresenceCursorSetter() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  
  // Get current user info
  const auth = db.useAuth()
  const currentUser = auth.user || null
  const currentUserId = currentUser?.id
  
  // Query current user's data to get email and imageURL
  const { data: currentUserData } = db.useQuery(
    currentUserId
      ? {
          $users: {
            $: { where: { id: currentUserId } },
          },
        }
      : null
  )
  
  const currentUserEntity = currentUserData?.$users?.[0]
  const currentUserEmail = currentUserEntity?.email || (currentUser && typeof (currentUser as any).email === 'string' ? ((currentUser as any).email as string) : undefined)
  const currentUserImageURL = currentUserEntity?.imageURL || undefined
  
  // Generate avatar URL for current user
  const currentUserAvatarUrl = getAvatarUrl(currentUserEmail, currentUserImageURL, 80)
  
  // Create a room for this map
  const room = currentMapId ? db.room('map', currentMapId) : null
  
  // Generate a user ID if we don't have one (for anonymous users)
  const userId = currentUser?.id || generateAnonymousUserId()
  
  // Subscribe to presence updates
  // Use write-only mode: peers: [] and user: false means we won't re-render on presence changes
  // We only need publishPresence to update cursor position
  const { publishPresence } = db.rooms.usePresence(
    room || db.room('map', 'default'),
    {
      initialPresence: {
        userId,
        userName: (currentUser && typeof (currentUser as any).name === 'string' ? ((currentUser as any).name as string) : undefined) || currentUserEmail || generateNameForUser(userId),
        cursor: null,
        editingNodeId: undefined,
        editingEdgeId: undefined,
        color: generateColorForUser(userId),
        avatarUrl: currentUserAvatarUrl || undefined,
      },
      // Write-only hook: won't trigger re-renders on presence changes
      peers: [],
      user: false,
    }
  )
  
  // Setter for current user's cursor position
  const setCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!publishPresence) return
      // publishPresence merges, so we only need to update cursor
      publishPresence({ cursor: cursor ?? null })
    },
    [publishPresence]
  )
  
  return {
    setCursor,
  }
}


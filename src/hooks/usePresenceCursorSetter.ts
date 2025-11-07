/**
 * Hook for setting current user's cursor position only.
 * 
 * Write-only hook that provides a setter for updating the current user's cursor position.
 * Does NOT subscribe to peer cursor positions, preventing re-renders when cursors move.
 * Uses write-only mode for optimal performance.
 * 
 * **Use Cases:**
 * - Components that need to update cursor position (e.g., ConceptMapCanvas on mouse move)
 * - Components that don't need to render peer cursors
 * - Performance-critical components that should avoid peer subscriptions
 * 
 * **Performance:**
 * Uses write-only mode (`peers: []`, `user: false`) to prevent re-renders when
 * presence changes. Only provides a setter, not readers.
 * 
 * **Alternative Hooks:**
 * - `usePresenceCursors()`: Cursor positions for all users (read + write)
 * - `usePresence()`: Current user + other users' presence (without cursors, with editing state)
 * - `useCurrentUserPresence()`: Only current user presence (no peer subscriptions)
 * - `usePresenceEditing()`: Editing state setters only (write-only)
 * 
 * @returns Object containing:
 * - `setCursor`: Function to update current user's cursor position (or null to clear)
 * 
 * @example
 * ```tsx
 * import { usePresenceCursorSetter } from '@/hooks/usePresenceCursorSetter'
 * 
 * function ConceptMapCanvas() {
 *   const { setCursor } = usePresenceCursorSetter()
 *   
 *   const onMouseMove = (event) => {
 *     const position = { x: event.clientX, y: event.clientY }
 *     setCursor(position)
 *   }
 *   
 *   const onMouseLeave = () => {
 *     setCursor(null)
 *   }
 *   
 *   return <ReactFlow onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />
 * }
 * ```
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


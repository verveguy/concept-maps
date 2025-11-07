/**
 * Hook for tracking editing state (which node/edge is being edited) in real-time collaboration.
 * 
 * Write-only hook that provides setters for updating the current user's editing state.
 * Does NOT subscribe to peer editing state, preventing re-renders when other users
 * start/stop editing. Uses write-only mode for optimal performance.
 * 
 * **Use Cases:**
 * - Components that need to update editing state (e.g., ConceptNode, RelationshipEdge)
 * - Components that don't need to read peer editing state
 * - Performance-critical components that should avoid peer subscriptions
 * 
 * **Performance:**
 * Uses write-only mode (`peers: []`, `user: false`) to prevent re-renders when
 * presence changes. Only provides setters, not readers.
 * 
 * **Alternative Hooks:**
 * - `usePresence()`: Current user + other users' presence (with editing state, without cursors)
 * - `useCurrentUserPresence()`: Only current user presence (no peer subscriptions)
 * - `usePresenceCursors()`: Cursor positions for all users
 * - `usePresenceCursorSetter()`: Cursor position setter only (write-only)
 * 
 * @returns Object containing:
 * - `setEditingNode`: Function to set which node the current user is editing (or null)
 * - `setEditingEdge`: Function to set which edge the current user is editing (or null)
 * 
 * @example
 * ```tsx
 * import { usePresenceEditing } from '@/hooks/usePresenceEditing'
 * 
 * function ConceptNode({ concept }) {
 *   const { setEditingNode } = usePresenceEditing()
 *   
 *   const onFocus = () => {
 *     setEditingNode(concept.id)
 *   }
 *   
 *   const onBlur = () => {
 *     setEditingNode(null)
 *   }
 *   
 *   return <input onFocus={onFocus} onBlur={onBlur} />
 * }
 * ```
 */

import { useCallback } from 'react'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { getAvatarUrl } from '@/lib/avatar'
import { generateAnonymousUserId, generateNameForUser, generateColorForUser } from '@/lib/presence'

/**
 * Hook to track ONLY editing state (which node/edge is being edited) for real-time collaboration.
 * Subscribes to InstantDB presence room but extracts only editing state data.
 * This hook will NOT trigger re-renders when cursor positions change.
 * 
 * @returns Setters for current user's editing node and edge state
 */
export function usePresenceEditing() {
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
  // We only need publishPresence to update editing state
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
  
  // Setter for current user's editing node
  const setEditingNode = useCallback(
    (nodeId: string | null) => {
      if (!publishPresence) return
      // publishPresence merges, so we only need to update editingNodeId
      publishPresence({ editingNodeId: nodeId ?? undefined })
    },
    [publishPresence]
  )
  
  // Setter for current user's editing edge
  const setEditingEdge = useCallback(
    (edgeId: string | null) => {
      if (!publishPresence) return
      // publishPresence merges, so we only need to update editingEdgeId
      publishPresence({ editingEdgeId: edgeId ?? undefined })
    },
    [publishPresence]
  )
  
  return {
    setEditingNode,
    setEditingEdge,
  }
}


/**
 * Hook for tracking cursor positions in real-time collaboration.
 * 
 * Subscribes to InstantDB presence room and extracts only cursor-related data.
 * This hook will trigger re-renders when cursors move, but NOT when editing state
 * changes, optimizing performance for cursor rendering components.
 * 
 * **Use Cases:**
 * - Components that need to render remote cursors (e.g., ConceptMapCanvas)
 * - Components that track mouse positions for collaboration
 * - Components that don't need editing state (which node/edge is being edited)
 * 
 * **Performance:**
 * By excluding editing state, this hook prevents re-renders when editing state
 * changes, improving performance for cursor rendering components.
 * 
 * **Alternative Hooks:**
 * - `usePresence()`: Current user + other users' presence (without cursors, with editing state)
 * - `useCurrentUserPresence()`: Only current user presence (no peer subscriptions)
 * - `usePresenceEditing()`: Editing state setters only (write-only)
 * - `usePresenceCursorSetter()`: Cursor position setter only (write-only)
 * 
 * @returns Object containing:
 * - `otherUsersPresence`: Array of other users' presence with cursor positions
 * - `setCursor`: Function to update current user's cursor position
 * 
 * @example
 * ```tsx
 * import { usePresenceCursors } from '@/hooks/usePresenceCursors'
 * import { PresenceCursor } from '@/components/presence/PresenceCursor'
 * 
 * function ConceptMapCanvas() {
 *   const { otherUsersPresence, setCursor } = usePresenceCursors()
 *   
 *   const onMouseMove = (event) => {
 *     setCursor({ x: event.clientX, y: event.clientY })
 *   }
 *   
 *   return (
 *     <>
 *       <ReactFlow onMouseMove={onMouseMove} />
 *       {otherUsersPresence.map(presence => (
 *         <PresenceCursor key={presence.userId} presence={presence} />
 *       ))}
 *     </>
 *   )
 * }
 * ```
 */

import { useMemo, useCallback } from 'react'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { getAvatarUrl } from '@/lib/avatar'
import { generateAnonymousUserId, generateNameForUser, generateColorForUser } from '@/lib/presence'
import type { PresenceData } from '@/lib/presence'

/**
 * Transform peers into presence data array, including ONLY cursor positions.
 * Excludes editing state to prevent unnecessary re-renders.
 * 
 * @param peers - Raw peers object from InstantDB presence
 * @param peerUsersMap - Map of userId -> user entity for avatar/email lookup
 * @returns Array of PresenceData objects with cursor positions
 */
function transformPeersToCursorPresence(
  peers: Record<string, any> | null | undefined,
  peerUsersMap: Map<string, { email?: string | null; imageURL?: string | null }>
): PresenceData[] {
  if (!peers) return []
  
  return Object.entries(peers)
    .map(([peerKey, peer]: [string, any]) => {
      // Use peer key as fallback ID if userId is missing
      const peerUserId = peer.userId || peerKey || `peer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const peerUserName = peer.userName || generateNameForUser(peerUserId)
      const peerColor = peer.color || generateColorForUser(peerUserId)
      
      // Get avatar URL and email
      let peerAvatarUrl = peer.avatarUrl || null
      const peerUserData = peerUsersMap.get(peerUserId)
      let peerEmail = peerUserData?.email || null
      
      if (!peerAvatarUrl && peerUserData) {
        peerAvatarUrl = getAvatarUrl(peerUserData.email, peerUserData.imageURL, 80)
      }
      
      return {
        userId: peerUserId,
        userName: peerUserName,
        email: peerEmail,
        cursor: peer.cursor || null, // Include cursor position
        editingNodeId: null, // Always null - we don't track editing state here
        editingEdgeId: null, // Always null - we don't track editing state here
        color: peerColor,
        avatarUrl: peerAvatarUrl,
      }
    })
    .filter((presence) => presence.userId && presence.userId.trim())
    .filter((presence, index, self) => 
      index === self.findIndex((p) => p.userId === presence.userId)
    )
}

/**
 * Hook to track ONLY cursor positions for real-time collaboration.
 * Subscribes to InstantDB presence room but extracts only cursor data.
 * This hook will NOT trigger re-renders when editing state changes.
 * 
 * @returns Object containing other users' cursor positions and setter for current user's cursor
 */
export function usePresenceCursors() {
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
  const currentUserAvatarUrl = useMemo(() => {
    return getAvatarUrl(currentUserEmail, currentUserImageURL, 80)
  }, [currentUserEmail, currentUserImageURL])
  
  // Create a room for this map
  const room = currentMapId ? db.room('map', currentMapId) : null
  
  // Generate a user ID if we don't have one (for anonymous users)
  const userId = currentUser?.id || generateAnonymousUserId()
  
  // Subscribe to presence updates
  // Use keys selection to ONLY subscribe to cursor-related fields
  // This ensures we only re-render when cursor positions change, not when editing state changes
  const { peers, publishPresence } = db.rooms.usePresence(
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
      // Only subscribe to cursor and user identity fields
      // This prevents re-renders when editingNodeId or editingEdgeId change
      keys: ['cursor', 'userId', 'userName', 'color', 'avatarUrl'],
    }
  )
  
  // Query user data for all peer user IDs to get their email/imageURL for avatar generation
  const peerUserIds = useMemo(() => {
    if (!peers) return []
    return Array.from(new Set(
      Object.values(peers)
        .map((peer: any) => peer.userId)
        .filter((id: string | undefined): id is string => Boolean(id))
    ))
  }, [peers])
  
  const { data: peerUsersData } = db.useQuery(
    peerUserIds.length > 0
      ? {
          $users: {
            $: { where: { id: { $in: peerUserIds } } },
          },
        }
      : null
  )
  
  // Create a map of userId -> user entity for quick lookup
  const peerUsersDataKey = useMemo(() => {
    if (!peerUsersData?.$users) return ''
    return peerUsersData.$users
      .map((user: any) => `${user.id}:${user.email || ''}:${user.imageURL || ''}`)
      .sort()
      .join('|')
  }, [peerUsersData])
  
  const peerUsersMap = useMemo(() => {
    const map = new Map<string, { email?: string | null; imageURL?: string | null }>()
    if (peerUsersData?.$users) {
      for (const user of peerUsersData.$users) {
        map.set(user.id, { email: user.email, imageURL: user.imageURL })
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerUsersDataKey])
  
  // Create a stable key from peers that ONLY includes cursor positions
  // Since we're using keys selection, InstantDB will only send updates when cursor changes
  // This key is still useful for memoization to avoid unnecessary transformations
  const peersCursorKey = useMemo(() => {
    if (!peers) return ''
    return Object.entries(peers)
      .map(([key, peer]: [string, any]) => {
        // Only include cursor position in the key (InstantDB already filters other fields)
        const cursor = peer.cursor
        const cursorStr = cursor ? `${cursor.x},${cursor.y}` : 'null'
        return `${key}:${peer.userId ?? ''}:${cursorStr}`
      })
      .sort()
      .join('|')
  }, [peers])
  
  // Transform peers to array format WITH cursor positions only
  // Memoize based on cursor positions only, ignoring editing state
  const otherUsersPresence = useMemo(() => {
    return transformPeersToCursorPresence(peers, peerUsersMap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peersCursorKey, peerUsersMap])
  
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
    otherUsersPresence,
    setCursor,
  }
}


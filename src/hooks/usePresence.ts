/**
 * Hook for tracking presence for the current map (without cursor positions).
 * 
 * Uses InstantDB presence API to track editing state and user information for
 * real-time collaboration. This hook does NOT include cursor positions in
 * `otherUsersPresence` to avoid unnecessary re-renders when cursors move.
 * 
 * **Use Cases:**
 * - Components that need BOTH current user presence AND other users' presence
 * - Components that need editing state (which node/edge is being edited)
 * - Components that don't need cursor positions (e.g., ConceptNode, PresenceHeader)
 * 
 * **Performance:**
 * By excluding cursor positions, this hook prevents re-renders when cursors move,
 * improving performance for components that don't need cursor data.
 * 
 * **Alternative Hooks:**
 * - `useCurrentUserPresence()`: Only current user presence (no peer subscriptions)
 * - `usePresenceCursors()`: Cursor positions only (no editing state)
 * - `usePresenceEditing()`: Editing state setters only (write-only)
 * - `usePresenceCursorSetter()`: Cursor position setter only (write-only)
 * 
 * @returns Object containing:
 * - `currentUser`: Current authenticated user object
 * - `currentUserPresence`: Current user's presence data
 * - `otherUsersPresence`: Array of other users' presence (without cursors)
 * - `publishPresence`: Function to update current user's presence
 * 
 * @example
 * ```tsx
 * import { usePresence } from '@/hooks/usePresence'
 * 
 * function ConceptNode({ concept }) {
 *   const { otherUsersPresence } = usePresence()
 *   const editingUsers = otherUsersPresence.filter(
 *     p => p.editingNodeId === concept.id
 *   )
 *   
 *   return (
 *     <div>
 *       {editingUsers.map(user => (
 *         <Avatar key={user.userId} user={user} />
 *       ))}
 *       <ConceptContent concept={concept} />
 *     </div>
 *   )
 * }
 * ```
 */

import { useCallback, useMemo, useEffect } from 'react'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { getAvatarUrl } from '@/lib/avatar'
import { generateAnonymousUserId, generateNameForUser, generateColorForUser, type PresenceData } from '@/lib/presence'

/**
 * Helper function to transform peers into presence data array.
 * Used by usePresence() to transform peer data (without cursors).
 * 
 * @param peers - Raw peers object from InstantDB presence
 * @param peerUsersMap - Map of userId -> user entity for avatar/email lookup
 * @param includeCursors - Whether to include cursor positions in the result (always false for usePresence)
 * @returns Array of PresenceData objects
 */
function transformPeersToPresence(
  peers: Record<string, any> | null | undefined,
  peerUsersMap: Map<string, { email?: string | null; imageURL?: string | null }>,
  includeCursors: boolean
): PresenceData[] {
  if (!peers) return []
  
  return Object.entries(peers)
    .map(([peerKey, peer]: [string, any]) => {
      // Use peer key as fallback ID if userId is missing
      // This ensures we always have a unique identifier for each peer
      const peerUserId = peer.userId || peerKey || `peer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      // Generate a name if missing
      const peerUserName = peer.userName || generateNameForUser(peerUserId)
      // Generate a color if missing
      const peerColor = peer.color || generateColorForUser(peerUserId)
      
      // Get avatar URL and email - prefer from presence, otherwise generate from user data
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
        cursor: includeCursors ? (peer.cursor || null) : null,
        editingNodeId: peer.editingNodeId || null,
        editingEdgeId: peer.editingEdgeId || null,
        color: peerColor,
        avatarUrl: peerAvatarUrl,
      }
    })
    .filter((presence) => presence.userId && presence.userId.trim()) // Filter out empty/whitespace userIds
    .filter((presence, index, self) => 
      // Ensure unique userIds
      index === self.findIndex((p) => p.userId === presence.userId)
    )
}

/**
 * Shared helper function to get base presence data.
 * Contains common logic for usePresence hook.
 * 
 * @returns Object containing base presence data (currentUser, peers, publishPresence, etc.)
 */
function usePresenceBase() {
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
  const currentUserName = currentUser && typeof (currentUser as any).name === 'string' ? ((currentUser as any).name as string) : undefined
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
  // Use keys selection to exclude cursor field - we don't need cursor positions
  // This ensures we only re-render when non-cursor presence data changes
  const { user: myPresence, peers, publishPresence } = db.rooms.usePresence(
    room || db.room('map', 'default'),
    {
      initialPresence: {
        userId,
        userName: currentUserName || currentUserEmail || generateNameForUser(userId),
        cursor: null,
        editingNodeId: undefined,
        editingEdgeId: undefined,
        color: generateColorForUser(userId),
        avatarUrl: currentUserAvatarUrl || undefined,
      },
      // Exclude cursor from selection - we don't need cursor positions
      // This prevents re-renders when cursors move
      keys: ['userId', 'userName', 'editingNodeId', 'editingEdgeId', 'color', 'avatarUrl'],
    }
  )
  
  // Ensure initial presence is set when user becomes available
  useEffect(() => {
    if (publishPresence) {
      // Always ensure user info is present in presence
      const finalUserId = currentUser?.id || generateAnonymousUserId()
      const userName = currentUserName || currentUserEmail || generateNameForUser(finalUserId)
      const color = generateColorForUser(finalUserId)
      
      // If we don't have presence yet, or if user info changed, update it
      if (!myPresence || myPresence.userId !== finalUserId || myPresence.userName !== userName || myPresence.avatarUrl !== currentUserAvatarUrl) {
        publishPresence({
          userId: finalUserId,
          userName,
          color,
          avatarUrl: currentUserAvatarUrl || undefined,
          // Preserve existing editing state (cursor is not included since we don't track it)
          editingNodeId: myPresence?.editingNodeId ?? undefined,
          editingEdgeId: myPresence?.editingEdgeId ?? undefined,
        })
      }
    }
  }, [currentUser, publishPresence, myPresence, currentUserAvatarUrl, currentUserName, currentUserEmail])
  
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
  // Memoize based on actual data values, not the object reference, for stability
  // Create a stable key from the user data to detect actual changes
  const peerUsersDataKey = useMemo(() => {
    if (!peerUsersData?.$users) return ''
    return peerUsersData.$users
      .map((user: any) => `${user.id}:${user.email || ''}:${user.imageURL || ''}`)
      .sort()
      .join('|')
  }, [peerUsersData])
  
  const peerUsersMap = useMemo(() => {
    // Read from peerUsersData at computation time (key ensures we recompute when data changes)
    // Note: peerUsersData is intentionally not in deps - we use peerUsersDataKey to detect changes
    // and React's closure ensures we read the latest peerUsersData when key changes
    const map = new Map<string, { email?: string | null; imageURL?: string | null }>()
    if (peerUsersData?.$users) {
      for (const user of peerUsersData.$users) {
        map.set(user.id, { email: user.email, imageURL: user.imageURL })
      }
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerUsersDataKey])
  
  return {
    currentUser,
    currentUserName,
    currentUserEmail,
    currentUserAvatarUrl,
    myPresence,
    peers,
    publishPresence,
    peerUsersMap,
  }
}

export function usePresence() {
  const {
    currentUser,
    currentUserName,
    currentUserEmail,
    currentUserAvatarUrl,
    myPresence,
    peers,
    publishPresence,
    peerUsersMap,
  } = usePresenceBase()
  
  // Extract primitive values from myPresence for stable memoization
  // InstantDB returns new objects on each render, so we need to extract primitives
  // NOTE: For usePresence(), we exclude cursor from dependencies since components using
  // this hook don't need cursor tracking and shouldn't re-render when cursor moves
  const myPresenceEditingNodeId = myPresence?.editingNodeId ?? null
  const myPresenceEditingEdgeId = myPresence?.editingEdgeId ?? null
  const myPresenceColor = myPresence?.color ?? null
  const currentUserId = currentUser?.id ?? null
  
  // Transform peers to array format, but memoize to ignore cursor changes
  // Create a stable key that excludes cursor positions
  // This ensures we only re-render when non-cursor presence data changes
  // Extract primitive values from peers object to create stable key
  // This avoids recomputation when peers object reference changes but values are the same
  // IMPORTANT: Even with keys selection, InstantDB may still update peers object reference
  // when cursor changes, so we need to manually filter cursor from the dependency
  const peersKeyWithoutCursors = useMemo(() => {
    if (!peers) return ''
    // Serialize only non-cursor fields to create stable key
    // This ensures we only recompute when non-cursor fields actually change
    return JSON.stringify(
      Object.entries(peers).map(([key, peer]: [string, any]) => [
        key,
        peer.userId,
        peer.userName,
        peer.editingNodeId,
        peer.editingEdgeId,
        peer.color,
        peer.avatarUrl
        // Explicitly exclude peer.cursor from serialization
      ]).sort()
    )
  }, [
    // Create a stable key from peer data by serializing ONLY non-cursor fields
    // This prevents re-renders when only cursor changes
    peers ? JSON.stringify(
      Object.entries(peers).map(([key, peer]: [string, any]) => [
        key,
        peer.userId,
        peer.userName,
        peer.editingNodeId,
        peer.editingEdgeId,
        peer.color,
        peer.avatarUrl
        // Explicitly exclude peer.cursor
      ]).sort()
    ) : ''
  ])
  
  // Create a stable key from peerUsersMap contents to avoid recomputation when Map reference changes
  const peerUsersMapKey = useMemo(() => {
    if (peerUsersMap.size === 0) return ''
    return Array.from(peerUsersMap.entries())
      .map(([userId, data]) => `${userId}:${data.email || ''}:${data.imageURL || ''}`)
      .sort()
      .join('|')
  }, [peerUsersMap])
  
  const otherUsersPresence = useMemo(() => {
    // Transform peers, but exclude cursor positions
    // Read from peerUsersMap at computation time (key ensures we recompute when data changes)
    return transformPeersToPresence(peers, peerUsersMap, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peersKeyWithoutCursors, peerUsersMapKey])
  
  // Get current user's presence data (from myPresence)
  // Use primitive dependencies to ensure stable memoization
  // NOTE: Cursor is intentionally excluded from dependencies - components using usePresence()
  // don't need cursor tracking and shouldn't re-render when cursor moves
  // We always set cursor to null since it's not needed by components using this hook
  const currentUserPresence: PresenceData | null = useMemo(() => {
    if (!currentUserId) return null
    
    // Use myPresence if available, otherwise construct from current user data
    // Always set cursor to null since components using usePresence() don't need it
    if (myPresence) {
      return {
        userId: currentUserId,
        userName: currentUserName || currentUserEmail || generateNameForUser(currentUserId),
        email: currentUserEmail || null,
        cursor: null, // Always null for usePresence() - components don't need cursor tracking
        editingNodeId: myPresenceEditingNodeId,
        editingEdgeId: myPresenceEditingEdgeId,
        color: myPresenceColor || generateColorForUser(currentUserId),
        avatarUrl: currentUserAvatarUrl,
      }
    }
    
    // If myPresence not ready yet, still return presence data for display
    return {
      userId: currentUserId,
      userName: currentUserName || currentUserEmail || generateNameForUser(currentUserId),
      email: currentUserEmail || null,
      cursor: null,
      editingNodeId: null,
      editingEdgeId: null,
      color: generateColorForUser(currentUserId),
      avatarUrl: currentUserAvatarUrl,
    }
  }, [
    currentUserId,
    // NOTE: Cursor is intentionally NOT in dependencies - cursor changes
    // should not trigger re-renders for components using usePresence()
    myPresenceEditingNodeId,
    myPresenceEditingEdgeId,
    myPresenceColor,
    currentUserName,
    currentUserEmail,
    currentUserAvatarUrl,
    // Include myPresence existence check as a boolean to detect when it becomes available
    !!myPresence,
  ])
  
  return {
    currentUser,
    currentUserPresence,
    otherUsersPresence,
    setCursor: useCallback(
      (cursor: { x: number; y: number } | null) => {
        if (!publishPresence) return
        // publishPresence merges, so we only need to update cursor
        publishPresence({ cursor: cursor ?? null })
      },
      [publishPresence]
    ),
    setEditingNode: useCallback(
      (nodeId: string | null) => {
        if (!publishPresence) return
        // publishPresence merges, so we only need to update editingNodeId
        publishPresence({ editingNodeId: nodeId ?? undefined })
      },
      [publishPresence]
    ),
    setEditingEdge: useCallback(
      (edgeId: string | null) => {
        if (!publishPresence) return
        // publishPresence merges, so we only need to update editingEdgeId
        publishPresence({ editingEdgeId: edgeId ?? undefined })
      },
      [publishPresence]
    ),
  }
}


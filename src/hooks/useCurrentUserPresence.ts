/**
 * Hook for tracking current user's presence only.
 * Lightweight hook that ONLY tracks current user's presence.
 * Does NOT subscribe to peer presence data, making it ideal for components
 * that only need current user info (e.g., Sidebar).
 * 
 * This hook will NOT trigger re-renders when remote users join/leave or move cursors.
 * 
 * For components that need other users' presence, use usePresence() instead.
 * 
 * @returns Object containing current user presence and setters
 */

import { useEffect, useCallback, useMemo } from 'react'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { getAvatarUrl } from '@/lib/avatar'
import { generateAnonymousUserId, generateNameForUser, generateColorForUser, type PresenceData } from '@/lib/presence'

export function useCurrentUserPresence() {
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
  
  // Subscribe to presence updates (but we ignore peers - not subscribed to peer updates)
  // Use keys selection to exclude cursor field - Sidebar doesn't need cursor positions
  // This prevents re-renders when cursor moves
  const { user: myPresence, publishPresence } = db.rooms.usePresence(
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
      // Exclude cursor from selection - Sidebar doesn't need cursor tracking
      // This prevents re-renders when cursors move
      keys: ['userId', 'userName', 'editingNodeId', 'editingEdgeId', 'color', 'avatarUrl'],
    }
  )
  
  // Extract primitive values from myPresence and currentUser BEFORE the useEffect to ensure stable dependencies
  // This prevents the effect from running when object references change but values are the same
  // Note: cursor is not extracted since we exclude it from keys selection
  const currentUserIdForEffect = currentUser?.id ?? null
  const myPresenceUserId = myPresence?.userId ?? null
  const myPresenceUserName = myPresence?.userName ?? null
  const myPresenceAvatarUrl = myPresence?.avatarUrl ?? null
  const myPresenceEditingNodeId = myPresence?.editingNodeId ?? null
  const myPresenceEditingEdgeId = myPresence?.editingEdgeId ?? null
  const myPresenceExists = myPresence ? true : false
  
  // Ensure initial presence is set when user becomes available
  useEffect(() => {
    if (publishPresence) {
      // Always ensure user info is present in presence
      const finalUserId = currentUserIdForEffect || generateAnonymousUserId()
      const userName = currentUserName || currentUserEmail || generateNameForUser(finalUserId)
      const color = generateColorForUser(finalUserId)
      
      // Use extracted primitives for comparison to avoid dependency on object reference
      // Only update if presence doesn't exist or if user info actually changed
      if (!myPresenceExists || myPresenceUserId !== finalUserId || myPresenceUserName !== userName || myPresenceAvatarUrl !== currentUserAvatarUrl) {
        publishPresence({
          userId: finalUserId,
          userName,
          color,
          avatarUrl: currentUserAvatarUrl || undefined,
          // Preserve existing editing state (cursor is not included since we don't track it)
          editingNodeId: myPresenceEditingNodeId ?? undefined,
          editingEdgeId: myPresenceEditingEdgeId ?? undefined,
        })
      }
    }
  }, [publishPresence, currentUserIdForEffect, myPresenceUserId, myPresenceUserName, myPresenceAvatarUrl, currentUserAvatarUrl, currentUserName, currentUserEmail, myPresenceExists, myPresenceEditingNodeId, myPresenceEditingEdgeId])
  
  // Extract primitive values from myPresence for stable memoization (reuse from above)
  const myPresenceColor = myPresence?.color ?? null
  const currentUserIdStable = currentUser?.id ?? null
  
  // Get current user's presence data (from myPresence)
  // Use primitive dependencies to ensure stable memoization
  // NOTE: Cursor is intentionally excluded from dependencies - components using this hook
  // don't need cursor tracking and shouldn't re-render when cursor moves
  const currentUserPresence: PresenceData | null = useMemo(() => {
    if (!currentUserIdStable) return null
    
    // Use myPresence if available, otherwise construct from current user data
    // Always set cursor to null since components using this hook don't need it
    if (myPresence) {
      return {
        userId: currentUserIdStable,
        userName: currentUserName || currentUserEmail || generateNameForUser(currentUserIdStable),
        email: currentUserEmail || null,
        cursor: null, // Always null - components don't need cursor tracking
        editingNodeId: myPresenceEditingNodeId,
        editingEdgeId: myPresenceEditingEdgeId,
        color: myPresenceColor || generateColorForUser(currentUserIdStable),
        avatarUrl: currentUserAvatarUrl,
      }
    }
    
    // If myPresence not ready yet, still return presence data for display
    return {
      userId: currentUserIdStable,
      userName: currentUserName || currentUserEmail || generateNameForUser(currentUserIdStable),
      email: currentUserEmail || null,
      cursor: null,
      editingNodeId: null,
      editingEdgeId: null,
      color: generateColorForUser(currentUserIdStable),
      avatarUrl: currentUserAvatarUrl,
    }
  }, [
    currentUserIdStable,
    myPresenceEditingNodeId,
    myPresenceEditingEdgeId,
    myPresenceColor,
    currentUserName,
    currentUserEmail,
    currentUserAvatarUrl,
    // Use pre-extracted boolean to avoid dependency on myPresence object reference
    myPresenceExists,
  ])
  

  const setEditingEdge = useCallback(
    (edgeId: string | null) => {
      if (!publishPresence) return
      publishPresence({ editingEdgeId: edgeId ?? undefined })
    },
    [publishPresence]
  )

  const setEditingNode = useCallback(
    (nodeId: string | null) => {
      if (!publishPresence) return
      publishPresence({ editingNodeId: nodeId ?? undefined })
    },
    [publishPresence]
  )
  

  const setCursor = useCallback(
    (cursor: { x: number; y: number } | null) => {
      if (!publishPresence) return
      publishPresence({ cursor: cursor ?? null })
    },
    [publishPresence]
  )
  
  const setPresence = useCallback(
    (presence: PresenceData) => {
      if (!publishPresence) return
      publishPresence({
        userId: presence.userId,
        userName: presence.userName,
        color: presence.color,
        cursor: presence.cursor ?? undefined,
        editingNodeId: presence.editingNodeId ?? undefined,
        editingEdgeId: presence.editingEdgeId ?? undefined,
        avatarUrl: presence.avatarUrl ?? undefined,
      })
    },
    [publishPresence]
  )

  return useMemo(() => (  {
    currentUser,
    currentUserPresence,
    setCursor,
    setEditingNode,
    setEditingEdge,
    setPresence,
  }), [currentUser, currentUserPresence, setCursor, setEditingNode, setEditingEdge, setPresence])
}


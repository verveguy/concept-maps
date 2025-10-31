import { useEffect, useCallback } from 'react'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'

/**
 * Presence data structure for a user
 */
export interface PresenceData {
  userId: string
  userName: string
  cursor: { x: number; y: number } | null
  editingNodeId: string | null
  editingEdgeId: string | null
  color: string
}

/**
 * Hook to track presence for the current map
 * Uses InstantDB presence API to track cursor positions and editing state
 * Based on https://www.instantdb.com/docs/presence-and-topics
 */
export function usePresence() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  
  // Get current user info
  const currentUser = db.auth?.user
  
  // Create a room for this map
  const room = currentMapId ? db.room('map', currentMapId) : null
  
  // Subscribe to presence updates
  const { user: myPresence, peers, publishPresence } = db.rooms.usePresence(
    room || db.room('map', 'default'),
    {
      initialPresence: currentUser
        ? {
            userId: currentUser.id,
            userName: currentUser.name || currentUser.email || 'Anonymous',
            cursor: null,
            editingNodeId: null,
            editingEdgeId: null,
            color: generateColorForUser(currentUser.id),
          }
        : undefined,
    }
  )
  
  // Ensure initial presence is set when user becomes available
  useEffect(() => {
    if (currentUser && publishPresence) {
      // Always ensure user info is present in presence
      const userName = currentUser.name || currentUser.email || 'Anonymous'
      const userId = currentUser.id
      const color = generateColorForUser(userId)
      
      // If we don't have presence yet, or if user info changed, update it
      if (!myPresence || myPresence.userId !== userId || myPresence.userName !== userName) {
        publishPresence({
          userId,
          userName,
          color,
          // Preserve existing cursor/editing state
          cursor: myPresence?.cursor || null,
          editingNodeId: myPresence?.editingNodeId || null,
          editingEdgeId: myPresence?.editingEdgeId || null,
        })
      }
    }
  }, [currentUser, publishPresence, myPresence])
  
  // Transform peers to array format
  const otherUsersPresence = peers
    ? Object.values(peers).map((peer: any) => ({
        userId: peer.userId || '',
        userName: peer.userName || 'Anonymous',
        cursor: peer.cursor || null,
        editingNodeId: peer.editingNodeId || null,
        editingEdgeId: peer.editingEdgeId || null,
        color: peer.color || '#6366f1',
      }))
    : []
  
  return {
    currentUser,
    otherUsersPresence,
    setCursor: useCallback(
      (cursor: { x: number; y: number } | null) => {
        if (!publishPresence) return
        // publishPresence merges, so we only need to update cursor
        publishPresence({ cursor })
      },
      [publishPresence]
    ),
    setEditingNode: useCallback(
      (nodeId: string | null) => {
        if (!publishPresence) return
        // publishPresence merges, so we only need to update editingNodeId
        publishPresence({ editingNodeId: nodeId })
      },
      [publishPresence]
    ),
    setEditingEdge: useCallback(
      (edgeId: string | null) => {
        if (!publishPresence) return
        // publishPresence merges, so we only need to update editingEdgeId
        publishPresence({ editingEdgeId: edgeId })
      },
      [publishPresence]
    ),
  }
}

/**
 * Generate a consistent color for a user based on their ID
 */
function generateColorForUser(userId: string): string {
  // Hash the user ID to get a consistent color
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Generate a color from the hash
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}

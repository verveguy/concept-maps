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
 * List of adjectives for generating user names
 */
const ADJECTIVES = [
  'Stately', 'Gibbous', 'Curious', 'Brilliant', 'Swift', 'Majestic', 'Serene', 'Vibrant',
  'Elegant', 'Mysterious', 'Radiant', 'Graceful', 'Bold', 'Gentle', 'Dynamic', 'Calm',
  'Fierce', 'Luminous', 'Resilient', 'Noble', 'Playful', 'Sage', 'Valiant', 'Whimsical',
  'Prismatic', 'Harmonious', 'Celestial', 'Intrepid', 'Sophisticated', 'Ethereal'
]

/**
 * List of animals for generating user names
 */
const ANIMALS = [
  'Lama', 'Aardvark', 'Koala', 'Panther', 'Falcon', 'Dolphin', 'Tiger', 'Eagle',
  'Jaguar', 'Owl', 'Leopard', 'Shark', 'Wolf', 'Lion', 'Hawk', 'Bear',
  'Fox', 'Raven', 'Stag', 'Stallion', 'Puma', 'Hawk', 'Jaguar', 'Serpent',
  'Phoenix', 'Unicorn', 'Griffin', 'Dragon', 'Pegasus', 'Kraken'
]

/**
 * Generate a consistent anonymous user ID based on session/localStorage
 * This ensures the same browser session gets the same anonymous ID
 */
function generateAnonymousUserId(): string {
  // Try to get existing anonymous ID from localStorage
  const storageKey = 'anonymous_user_id'
  let anonymousId = localStorage.getItem(storageKey)
  
  if (!anonymousId) {
    // Generate a new anonymous ID
    anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem(storageKey, anonymousId)
  }
  
  return anonymousId
}

/**
 * Generate a consistent random name (Adjective + Animal) for a user based on their ID
 * Uses the same hash-based approach as color generation for consistency
 */
function generateNameForUser(userId: string): string {
  // Hash the user ID to get consistent indices
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Use hash to select adjective and animal
  const adjectiveIndex = Math.abs(hash) % ADJECTIVES.length
  const animalIndex = Math.abs(hash >> 8) % ANIMALS.length
  
  return `${ADJECTIVES[adjectiveIndex]} ${ANIMALS[animalIndex]}`
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
  
  // Generate a user ID if we don't have one (for anonymous users)
  const userId = currentUser?.id || generateAnonymousUserId()
  
  // Subscribe to presence updates
  const { user: myPresence, peers, publishPresence } = db.rooms.usePresence(
    room || db.room('map', 'default'),
    {
      initialPresence: {
        userId,
        userName: currentUser?.name || currentUser?.email || generateNameForUser(userId),
        cursor: null,
        editingNodeId: null,
        editingEdgeId: null,
        color: generateColorForUser(userId),
      },
    }
  )
  
  // Ensure initial presence is set when user becomes available
  useEffect(() => {
    if (publishPresence) {
      // Always ensure user info is present in presence
      const finalUserId = currentUser?.id || generateAnonymousUserId()
      const userName = currentUser?.name || currentUser?.email || generateNameForUser(finalUserId)
      const color = generateColorForUser(finalUserId)
      
      // If we don't have presence yet, or if user info changed, update it
      if (!myPresence || myPresence.userId !== finalUserId || myPresence.userName !== userName) {
        publishPresence({
          userId: finalUserId,
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
    ? Object.entries(peers)
        .map(([peerKey, peer]: [string, any]) => {
          // Use peer key as fallback ID if userId is missing
          // This ensures we always have a unique identifier for each peer
          const peerUserId = peer.userId || peerKey || `peer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          // Generate a name if missing
          const peerUserName = peer.userName || generateNameForUser(peerUserId)
          // Generate a color if missing
          const peerColor = peer.color || generateColorForUser(peerUserId)
          
          return {
            userId: peerUserId,
            userName: peerUserName,
            cursor: peer.cursor || null,
            editingNodeId: peer.editingNodeId || null,
            editingEdgeId: peer.editingEdgeId || null,
            color: peerColor,
          }
        })
        .filter((presence) => presence.userId && presence.userId.trim()) // Filter out empty/whitespace userIds
        .filter((presence, index, self) => 
          // Ensure unique userIds
          index === self.findIndex((p) => p.userId === presence.userId)
        )
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

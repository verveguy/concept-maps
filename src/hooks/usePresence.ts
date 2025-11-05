/**
 * Hook for managing real-time presence and collaboration.
 * Tracks cursor positions, editing state, and user information for collaborative editing.
 * Based on InstantDB presence API.
 * 
 * @see https://www.instantdb.com/docs/presence-and-topics
 */

import { useEffect, useCallback, useMemo } from 'react'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { getAvatarUrl } from '@/lib/avatar'

/**
 * Presence data structure for a user.
 * Tracks their cursor position and what they're currently editing.
 */
export interface PresenceData {
  /** Unique user identifier */
  userId: string
  /** Display name for the user */
  userName: string
  /** User's email address, or null if not available */
  email: string | null
  /** Current cursor position on the canvas, or null if not hovering */
  cursor: { x: number; y: number } | null
  /** ID of the node currently being edited, or null */
  editingNodeId: string | null
  /** ID of the edge currently being edited, or null */
  editingEdgeId: string | null
  /** Color assigned to this user for visual distinction */
  color: string
  /** Avatar URL (from Gravatar or custom imageURL), or null if not available */
  avatarUrl: string | null
}

/**
 * List of adjectives for generating user names.
 */
const ADJECTIVES = [
  'Stately', 'Gibbous', 'Curious', 'Brilliant', 'Swift', 'Majestic', 'Serene', 'Vibrant',
  'Elegant', 'Mysterious', 'Radiant', 'Graceful', 'Bold', 'Gentle', 'Dynamic', 'Calm',
  'Fierce', 'Luminous', 'Resilient', 'Noble', 'Playful', 'Sage', 'Valiant', 'Whimsical',
  'Prismatic', 'Harmonious', 'Celestial', 'Intrepid', 'Sophisticated', 'Ethereal'
]

/**
 * List of animals for generating user names.
 */
const ANIMALS = [
  'Lama', 'Aardvark', 'Koala', 'Panther', 'Falcon', 'Dolphin', 'Tiger', 'Eagle',
  'Jaguar', 'Owl', 'Leopard', 'Shark', 'Wolf', 'Lion', 'Hawk', 'Bear',
  'Fox', 'Raven', 'Stag', 'Stallion', 'Puma', 'Hawk', 'Jaguar', 'Serpent',
  'Phoenix', 'Unicorn', 'Griffin', 'Dragon', 'Pegasus', 'Kraken'
]

/**
 * Generate a consistent anonymous user ID based on session/localStorage.
 * This ensures the same browser session gets the same anonymous ID.
 * 
 * @returns A consistent anonymous user ID string
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
 * Generate a consistent random name (Adjective + Animal) for a user based on their ID.
 * Uses the same hash-based approach as color generation for consistency.
 * 
 * @param userId - User ID to generate name for
 * @returns A consistent name string
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
 * Generate a consistent color for a user based on their ID.
 * Uses HSL color space for better color distribution.
 * 
 * @param userId - User ID to generate color for
 * @returns HSL color string
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
 * Hook to track presence for the current map.
 * Uses InstantDB presence API to track cursor positions and editing state.
 * 
 * @returns Object containing current user info, other users' presence, and setters for cursor/editing state
 */
export function usePresence() {
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
        avatarUrl: currentUserAvatarUrl,
      },
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
          avatarUrl: currentUserAvatarUrl,
          // Preserve existing cursor/editing state
          cursor: myPresence?.cursor ?? null,
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
  const peerUsersMap = useMemo(() => {
    const map = new Map<string, { email?: string | null; imageURL?: string | null }>()
    if (peerUsersData?.$users) {
      for (const user of peerUsersData.$users) {
        map.set(user.id, { email: user.email, imageURL: user.imageURL })
      }
    }
    return map
  }, [peerUsersData])
  
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
            cursor: peer.cursor || null,
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
    : []
  
  // Get current user's presence data (from myPresence)
  const currentUserPresence: PresenceData | null = useMemo(() => {
    if (!currentUser) return null
    
    // Use myPresence if available, otherwise construct from current user data
    if (myPresence) {
      return {
        userId: currentUser.id,
        userName: currentUserName || currentUserEmail || generateNameForUser(currentUser.id),
        email: currentUserEmail || null,
        cursor: myPresence.cursor || null,
        editingNodeId: myPresence.editingNodeId || null,
        editingEdgeId: myPresence.editingEdgeId || null,
        color: myPresence.color || generateColorForUser(currentUser.id),
        avatarUrl: currentUserAvatarUrl,
      }
    }
    
    // If myPresence not ready yet, still return presence data for display
    return {
      userId: currentUser.id,
      userName: currentUserName || currentUserEmail || generateNameForUser(currentUser.id),
      email: currentUserEmail || null,
      cursor: null,
      editingNodeId: null,
      editingEdgeId: null,
      color: generateColorForUser(currentUser.id),
      avatarUrl: currentUserAvatarUrl,
    }
  }, [myPresence, currentUser, currentUserName, currentUserEmail, currentUserAvatarUrl])
  
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

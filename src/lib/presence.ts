/**
 * Utility functions for presence and collaboration features.
 * Shared utilities used across presence hooks.
 */

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
export function generateAnonymousUserId(): string {
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
export function generateNameForUser(userId: string): string {
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
export function generateColorForUser(userId: string): string {
  // Hash the user ID to get a consistent color
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Generate a color from the hash
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}


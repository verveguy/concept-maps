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
 * 
 * Creates or retrieves a persistent anonymous user ID that remains consistent
 * across page reloads within the same browser session. This ensures anonymous
 * users have a stable identity for presence tracking and collaboration features.
 * 
 * **Storage:**
 * The ID is stored in `localStorage` under the key `'anonymous_user_id'`.
 * If no ID exists, a new one is generated using a timestamp and random string.
 * 
 * **Use Case:**
 * Used for anonymous users who haven't signed in. Provides a consistent
 * identifier for presence tracking, cursor positions, and collaboration features.
 * 
 * @returns A consistent anonymous user ID string
 * 
 * @example
 * ```tsx
 * import { generateAnonymousUserId } from '@/lib/presence'
 * 
 * const userId = currentUser?.id || generateAnonymousUserId()
 * // Use userId for presence tracking
 * ```
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
 * 
 * Uses a hash-based approach to generate a deterministic name from a user ID.
 * The same user ID will always produce the same name, ensuring consistency
 * across sessions and devices.
 * 
 * **Name Format:**
 * Names follow the pattern: `"[Adjective] [Animal]"` (e.g., "Stately Lama",
 * "Curious Koala", "Brilliant Panther").
 * 
 * **Consistency:**
 * The hash function ensures that:
 * - The same user ID always produces the same name
 * - Different user IDs produce different names (with high probability)
 * - Names are distributed evenly across the available adjective/animal combinations
 * 
 * @param userId - User ID to generate name for
 * @returns A consistent name string in the format "Adjective Animal"
 * 
 * @example
 * ```tsx
 * import { generateNameForUser } from '@/lib/presence'
 * 
 * const userName = generateNameForUser(userId)
 * // Returns: "Stately Lama" (consistent for the same userId)
 * ```
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
 * 
 * Uses HSL color space for better color distribution and visual distinction
 * between users. The same user ID will always produce the same color, ensuring
 * consistency across sessions.
 * 
 * **Color Format:**
 * Returns an HSL color string in the format `"hsl(hue, 70%, 50%)"` where:
 * - `hue`: Determined by hashing the user ID (0-360 degrees)
 * - `saturation`: Fixed at 70% for vibrant colors
 * - `lightness`: Fixed at 50% for good contrast
 * 
 * **Consistency:**
 * The hash function ensures that:
 * - The same user ID always produces the same color
 * - Different user IDs produce different colors (with high probability)
 * - Colors are distributed evenly across the hue spectrum
 * 
 * @param userId - User ID to generate color for
 * @returns HSL color string (e.g., "hsl(120, 70%, 50%)")
 * 
 * @example
 * ```tsx
 * import { generateColorForUser } from '@/lib/presence'
 * 
 * const userColor = generateColorForUser(userId)
 * // Returns: "hsl(240, 70%, 50%)" (consistent for the same userId)
 * 
 * // Use in styling
 * <div style={{ borderColor: userColor }}>User Avatar</div>
 * ```
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


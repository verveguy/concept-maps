/**
 * Utility functions for generating user avatar URLs.
 * Supports Gravatar (email-based) and custom image URLs.
 */

import gravatarUrl from 'gravatar-url'

/**
 * Generate a Gravatar URL from an email address.
 * 
 * Uses the `gravatar-url` package which handles MD5 hashing internally.
 * Gravatar provides avatar images based on email addresses. If no Gravatar
 * exists for the email, a default image is returned.
 * 
 * **Default Images:**
 * Common default image types include:
 * - `'identicon'`: Geometric pattern based on email hash
 * - `'monsterid'`: Generated monster avatar
 * - `'wavatar'`: Generated face avatar
 * - `'retro'`: 8-bit arcade-style avatar
 * - `'robohash'`: Robot avatar
 * - `'blank'`: Transparent pixel
 * - Or a custom URL to your own default image
 * 
 * @param email - User's email address
 * @param size - Size of the avatar image in pixels (default: 80)
 * @param defaultImage - Default image type if no Gravatar exists (default: 'identicon')
 * @returns Gravatar URL string
 * 
 * @example
 * ```tsx
 * import { getGravatarUrl } from '@/lib/avatar'
 * 
 * const avatarUrl = getGravatarUrl('user@example.com', 100, 'identicon')
 * // Returns: 'https://www.gravatar.com/avatar/...?s=100&d=identicon'
 * ```
 */
export function getGravatarUrl(
  email: string,
  size: number = 80,
  defaultImage: string = 'identicon'
): string {
  return gravatarUrl(email, {
    size,
    default: defaultImage,
  })
}

/**
 * Generate an avatar URL for a user.
 * 
 * Returns the best available avatar URL based on priority:
 * 1. Custom `imageURL` if provided (from user profile)
 * 2. Gravatar URL if email is provided
 * 3. `null` if neither is available (UI should fallback to initials)
 * 
 * **Use Case:**
 * This function is used throughout the application to get user avatars
 * for display in presence indicators, user lists, and profile sections.
 * 
 * @param email - User's email address (optional, used for Gravatar fallback)
 * @param imageURL - Custom image URL from user profile (optional, takes priority)
 * @param size - Size of the avatar image in pixels (default: 80, only used for Gravatar)
 * @returns Avatar URL string if available, or `null` if no avatar can be generated
 * 
 * @example
 * ```tsx
 * import { getAvatarUrl } from '@/lib/avatar'
 * 
 * // Prefer custom image, fallback to Gravatar
 * const avatarUrl = getAvatarUrl(user.email, user.imageURL, 80)
 * 
 * // Display avatar or fallback to initials
 * {avatarUrl ? (
 *   <img src={avatarUrl} alt={user.name} />
 * ) : (
 *   <div>{getInitials(user.name)}</div>
 * )}
 * ```
 */
export function getAvatarUrl(
  email?: string | null,
  imageURL?: string | null,
  size: number = 80
): string | null {
  // Prefer custom image URL if available
  if (imageURL && imageURL.trim()) {
    return imageURL.trim()
  }
  
  // Fall back to Gravatar if email is available
  if (email && email.trim()) {
    return getGravatarUrl(email, size)
  }
  
  // No avatar available
  return null
}


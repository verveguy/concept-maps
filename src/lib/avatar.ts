/**
 * Utility functions for generating user avatar URLs.
 * Supports Gravatar (email-based) and custom image URLs.
 */

import gravatarUrl from 'gravatar-url'

/**
 * Generate a Gravatar URL from an email address.
 * Uses the gravatar-url package which handles MD5 hashing internally.
 * 
 * @param email - User's email address
 * @param size - Size of the avatar image in pixels (default: 80)
 * @param defaultImage - Default image type if no Gravatar exists ('identicon', 'monsterid', 'wavatar', 'retro', 'robohash', 'blank', or a URL)
 * @returns Gravatar URL string
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
 * Priority order:
 * 1. Custom imageURL if provided
 * 2. Gravatar URL if email is provided
 * 3. null (will fallback to initials in UI)
 * 
 * @param email - User's email address (optional)
 * @param imageURL - Custom image URL from user profile (optional)
 * @param size - Size of the avatar image in pixels (default: 80)
 * @returns Avatar URL string or null
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


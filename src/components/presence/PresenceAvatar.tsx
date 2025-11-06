/**
 * Component to display a user's avatar.
 * Typically shown near nodes being edited to indicate who is editing.
 */

import type { PresenceData } from '@/lib/presence'
import { useState } from 'react'

/**
 * Component to display a user's avatar (typically shown near nodes being edited).
 * 
 * @param presence - Presence data containing user information
 * @returns The avatar component JSX
 */
export function PresenceAvatar({ presence }: { presence: PresenceData }) {
  // Get initials from user name
  const initials = presence.userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  // Track if image failed to load
  const [imageError, setImageError] = useState(false)
  
  // Show avatar image if available and not errored
  if (presence.avatarUrl && !imageError) {
    return (
      <img
        src={presence.avatarUrl}
        alt={presence.userName}
        className="h-8 w-8 rounded-full border-2 shadow-md cursor-pointer"
        style={{ borderColor: presence.color }}
        onError={() => setImageError(true)}
      />
    )
  }
  
  // Fallback to initials
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shadow-md border-2 cursor-pointer"
      style={{ backgroundColor: presence.color, borderColor: presence.color }}
    >
      {initials}
    </div>
  )
}


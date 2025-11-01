/**
 * Component to display a user's avatar.
 * Typically shown near nodes being edited to indicate who is editing.
 */

import type { PresenceData } from '@/hooks/usePresence'

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
  
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shadow-md"
      style={{ backgroundColor: presence.color }}
      title={presence.userName}
    >
      {initials}
    </div>
  )
}


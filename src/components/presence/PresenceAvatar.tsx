/**
 * Component to display a user's avatar.
 * Typically shown near nodes being edited to indicate who is editing.
 */

import type { PresenceData } from '@/lib/presence'
import { useState } from 'react'

/**
 * Component to display a user's avatar.
 * 
 * Renders a user avatar with fallback to initials. Typically shown near nodes
 * being edited to indicate who is editing, or in presence indicators.
 * 
 * **Avatar Priority:**
 * 1. Custom image URL from presence data (if available and loads successfully)
 * 2. Initials generated from user name (fallback)
 * 
 * **Styling:**
 * - Avatar image: 32x32px (h-8 w-8) rounded circle with border
 * - Border color matches user's presence color for visual distinction
 * - Shadow for depth
 * - Cursor pointer for interactivity
 * 
 * **Error Handling:**
 * If the image fails to load, automatically falls back to initials display.
 * 
 * @param props - Component props
 * @param props.presence - Presence data containing user information (userId, userName, avatarUrl, color)
 * @returns The avatar component JSX (image or initials div)
 * 
 * @example
 * ```tsx
 * import { PresenceAvatar } from '@/components/presence/PresenceAvatar'
 * import { usePresence } from '@/hooks/usePresence'
 * 
 * function UserList() {
 *   const { otherUsersPresence } = usePresence()
 *   
 *   return (
 *     <div>
 *       {otherUsersPresence.map(presence => (
 *         <PresenceAvatar key={presence.userId} presence={presence} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
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


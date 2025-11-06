/**
 * Component to display a user's cursor on the canvas.
 * Converts flow coordinates to screen coordinates for display.
 */

import { useState, useEffect } from 'react'
import type { PresenceData } from '@/lib/presence'

/**
 * Component to display a user's cursor on the canvas.
 * Converts flow coordinates to screen coordinates for display.
 * 
 * @param presence - Presence data containing cursor position
 * @param flowToScreenPosition - Function to convert flow coordinates to screen coordinates
 * @returns The cursor component JSX, or null if no cursor position
 */
export function PresenceCursor({
  presence,
  flowToScreenPosition,
}: {
  presence: PresenceData
  flowToScreenPosition: (position: { x: number; y: number }) => { x: number; y: number }
}) {
  const [imageError, setImageError] = useState(false)
  
  // Reset error state when avatarUrl changes
  useEffect(() => {
    if (presence.avatarUrl) {
      setImageError(false)
    }
  }, [presence.avatarUrl])
  
  if (!presence.cursor) return null
  
  // Convert flow coordinates to screen coordinates
  const screenPosition = flowToScreenPosition({
    x: presence.cursor.x,
    y: presence.cursor.y,
  })
  
  // Get initials from user name
  const initials = (() => {
    if (!presence.userName) return 'U'
    const parts = presence.userName.split(' ').filter(Boolean)
    if (parts.length === 0) return 'U'
    if (parts.length === 1 && parts[0].includes('@')) {
      // If it's an email, use first letter before @
      return parts[0][0].toUpperCase()
    }
    return parts
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  })()
  
  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
      }}
    >
      {/* Avatar positioned above the cursor */}
      <div className="absolute bottom-2 left-2 h-8 w-8">
        {/* Show avatar image if available and not errored */}
        {presence.avatarUrl && !imageError ? (
          <img
            src={presence.avatarUrl}
            alt={presence.userName}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border-2 shadow-md object-cover"
            style={{ 
              borderColor: presence.color,
              display: 'block',
            }}
            onError={() => {
              setImageError(true)
            }}
          />
        ) : (
          /* Fallback to initials */
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shadow-md border-2"
            style={{ backgroundColor: presence.color, borderColor: presence.color }}
          >
            {initials}
          </div>
        )}
      </div>
      
      {/* Cursor arrow pointing to the exact screen coordinate */}
      {/* The tip of the cursor (at 3,3 in viewBox) should point to the coordinate */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute"
        style={{
          color: presence.color,
          // Position so the tip (3,3) is at the screen coordinate
          // Converting viewBox coords: tip is at (3/24 * 20, 3/24 * 20) = (2.5, 2.5) from top-left
          transform: 'translate(-2.5px, -2.5px)',
          top: 0,
          left: 0,
        }}
      >
        <path
          d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
          fill="currentColor"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}


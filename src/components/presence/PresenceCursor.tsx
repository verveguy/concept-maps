import type { PresenceData } from '@/hooks/usePresence'

/**
 * Component to display a user's cursor on the canvas
 * Converts flow coordinates to screen coordinates for display
 */
export function PresenceCursor({
  presence,
  flowToScreenPosition,
}: {
  presence: PresenceData
  flowToScreenPosition: (position: { x: number; y: number }) => { x: number; y: number }
}) {
  if (!presence.cursor) return null
  
  // Convert flow coordinates to screen coordinates
  const screenPosition = flowToScreenPosition({
    x: presence.cursor.x,
    y: presence.cursor.y,
  })
  
  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Cursor pointer */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: presence.color }}
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
      
      {/* User name label */}
      <div
        className="absolute left-6 top-0 whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-white shadow-md"
        style={{ backgroundColor: presence.color }}
      >
        {presence.userName}
      </div>
    </div>
  )
}


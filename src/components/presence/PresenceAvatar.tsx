import type { PresenceData } from '@/hooks/usePresence'

/**
 * Component to display a user's avatar (typically shown near nodes being edited)
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


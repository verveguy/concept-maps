/**
 * User avatar section component for the Sidebar.
 * Displays the current user's avatar with a tooltip showing their name and email.
 * 
 * This component uses useCurrentUserPresence() internally, so it will re-render
 * when presence updates, but the Sidebar component will not.
 */

import { memo } from 'react'
import { useCurrentUserPresence } from '@/hooks/useCurrentUserPresence'
import { PresenceAvatar } from '@/components/presence/PresenceAvatar'

/**
 * User avatar section component.
 * This component will re-render when presence updates, which is expected behavior.
 */
export const UserAvatarSection = memo(() => {
  const { currentUserPresence } = useCurrentUserPresence()
  
  if (!currentUserPresence) return null
  
  return (
    <div className="p-4 border-t">
      <div className="relative group cursor-pointer inline-block">
        <PresenceAvatar presence={currentUserPresence} />
        {/* Custom tooltip - positioned above and to the right */}
        <div className="absolute bottom-full left-full mb-2 ml-2 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {currentUserPresence.email && currentUserPresence.email.trim() !== currentUserPresence.userName.trim()
            ? `${currentUserPresence.userName} (${currentUserPresence.email})`
            : currentUserPresence.userName}
          {/* Tooltip arrow pointing down-left to avatar */}
          <div className="absolute top-full left-0 mt-0 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  )
})
UserAvatarSection.displayName = 'UserAvatarSection'


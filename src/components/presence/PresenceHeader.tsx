/**
 * Component to display all currently present users as a collection of avatars.
 * Shows user avatars (from Gravatar or initials) in a horizontal row.
 * Similar to Google Docs' presence indicator.
 */

import { useState, useEffect, useRef } from 'react'
import { usePresence } from '@/hooks/usePresence'
import { PresenceAvatar } from './PresenceAvatar'

/**
 * Component to display all currently present users as a collection of avatars.
 * 
 * Shows user avatars (from Gravatar or initials) in a horizontal row, similar to
 * Google Docs' presence indicator. Displays the current user first, followed by
 * other users. Supports expanding to show all users when there are many.
 * 
 * **Features:**
 * - Shows up to 5 visible avatars, then "+N more" indicator
 * - Click "+N more" to expand and see all users
 * - Tooltips show user name and email on hover
 * - Current user has a small indicator dot
 * - Click outside to close expanded view
 * 
 * **User Display:**
 * - Current user is always shown first
 * - Other users follow in order
 * - Duplicate users are filtered out (by userId)
 * 
 * **Expanded View:**
 * When there are more than 5 users, clicking the "+N more" button shows a dropdown
 * with all users, their names, and email addresses.
 * 
 * @returns The presence header component JSX, or null if no users are present
 * 
 * @example
 * ```tsx
 * import { PresenceHeader } from '@/components/presence/PresenceHeader'
 * 
 * function Header() {
 *   return (
 *     <div className="flex items-center gap-4">
 *       <PresenceHeader />
 *       <OtherControls />
 *     </div>
 *   )
 * }
 * ```
 */
export function PresenceHeader() {
  const { currentUser, currentUserPresence, otherUsersPresence } = usePresence()
  const [showAll, setShowAll] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAll(false)
      }
    }
    
    if (showAll) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showAll])
  
  // Combine current user with other users
  // Ensure current user is first, then others
  const allUsers = [
    ...(currentUserPresence ? [currentUserPresence] : []),
    ...otherUsersPresence.filter(p => p.userId !== currentUser?.id), // Filter out current user if already added
  ]
  
  // Limit visible avatars (show max 5, then "+N" indicator)
  const MAX_VISIBLE = 5
  const visibleUsers = allUsers.slice(0, MAX_VISIBLE)
  const hiddenCount = Math.max(0, allUsers.length - MAX_VISIBLE)
  
  // Show header if there's at least one user (current user or others)
  if (allUsers.length === 0 && !currentUser) {
    return null
  }
  
  // Helper function to format tooltip text with name and email
  const getTooltipText = (presence: typeof allUsers[0]): string => {
    if (presence.email && presence.email.trim() !== presence.userName.trim()) {
      return `${presence.userName} (${presence.email})`
    }
    // If email and name are the same, or no email, just show the name
    return presence.userName
  }
  
  return (
    <div className="relative flex items-center gap-1" ref={dropdownRef}>
      {/* Visible user avatars */}
      {visibleUsers.map((presence) => {
        const tooltipText = getTooltipText(presence)
        return (
          <div
            key={presence.userId}
            className="relative group cursor-pointer"
          >
            <PresenceAvatar presence={presence} />
            {/* Custom tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {tooltipText}
              {/* Tooltip arrow */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-0 border-4 border-transparent border-b-gray-900"></div>
            </div>
            {/* Show indicator if current user */}
            {presence.userId === currentUser?.id && (
              <div
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white pointer-events-none"
                style={{ backgroundColor: presence.color }}
              />
            )}
          </div>
        )
      })}
      
      {/* Show "+N more" indicator if there are more users */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100 text-xs font-medium text-gray-600 hover:bg-gray-200"
          title={`${hiddenCount} more user${hiddenCount > 1 ? 's' : ''}`}
        >
          +{hiddenCount}
        </button>
      )}
      
      {/* Expanded view showing all users (if clicked) */}
      {showAll && hiddenCount > 0 && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-md border bg-white shadow-lg p-2 min-w-[200px]">
          <div className="text-xs font-semibold text-gray-600 mb-2 px-2">
            All users ({allUsers.length})
          </div>
          <div className="space-y-1">
            {allUsers.slice(MAX_VISIBLE).map((presence) => (
              <div
                key={presence.userId}
                className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded"
              >
                <PresenceAvatar presence={presence} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{presence.userName}</span>
                    {presence.email && (
                      <span className="text-xs text-gray-500">{presence.email}</span>
                    )}
                  </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


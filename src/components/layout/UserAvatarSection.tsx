/**
 * User avatar section component for the Sidebar.
 * Displays the current user's avatar with a tooltip showing their name and email.
 * Also includes an "Empty Trash" button to permanently delete soft-deleted entities.
 * 
 * This component uses useCurrentUserPresence() internally, so it will re-render
 * when presence updates, but the Sidebar component will not.
 */

import { memo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useCurrentUserPresence } from '@/hooks/useCurrentUserPresence'
import { useTrashActions } from '@/hooks/useTrashActions'
import { PresenceAvatar } from '@/components/presence/PresenceAvatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * User avatar section component for the Sidebar.
 * 
 * Displays the current user's avatar with a tooltip showing their name and email.
 * Also includes an "Empty Trash" button to permanently delete soft-deleted entities.
 * 
 * **Performance:**
 * This component uses `useCurrentUserPresence()` internally, so it will re-render
 * when presence updates, but the Sidebar component will not. This prevents unnecessary
 * re-renders of the entire sidebar when only user presence changes.
 * 
 * **Features:**
 * - Current user avatar (image or initials)
 * - Tooltip with user name and email
 * - Empty Trash button with confirmation dialog
 * - Trash management for permanently deleting soft-deleted items
 * 
 * **Empty Trash:**
 * Permanently deletes all soft-deleted entities (maps, concepts, relationships)
 * owned by the current user. This operation cannot be undone.
 * 
 * @returns The user avatar section JSX, or null if no user is present
 * 
 * @example
 * ```tsx
 * import { UserAvatarSection } from '@/components/layout/UserAvatarSection'
 * 
 * function Sidebar() {
 *   return (
 *     <div>
 *       <MapList />
 *       <UserAvatarSection />
 *     </div>
 *   )
 * }
 * ```
 */
export const UserAvatarSection = memo(() => {
  const { currentUserPresence } = useCurrentUserPresence()
  const { emptyTrash } = useTrashActions()
  const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false)
  const [isEmptying, setIsEmptying] = useState(false)

  if (!currentUserPresence) return null

  const handleEmptyTrash = async () => {
    setIsEmptying(true)
    try {
      await emptyTrash()
      setShowEmptyTrashDialog(false)
    } catch (error) {
      console.error('Failed to empty trash:', error)
      // TODO: Show error toast/notification
    } finally {
      setIsEmptying(false)
    }
  }

  return (
    <>
      <div className="p-4 border-t">
        <div className="flex items-center justify-between gap-2">
          {/* Avatar with tooltip */}
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

          {/* Empty Trash Button */}
          <button
            onClick={() => setShowEmptyTrashDialog(true)}
            className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Empty trash"
            aria-label="Empty trash"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={showEmptyTrashDialog} onOpenChange={setShowEmptyTrashDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty Trash</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete all soft-deleted entities (maps, concepts, and relationships) that you own? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEmptying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              disabled={isEmptying}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isEmptying ? 'Emptying...' : 'Empty Trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
UserAvatarSection.displayName = 'UserAvatarSection'


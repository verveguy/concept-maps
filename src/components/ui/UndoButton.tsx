/**
 * Undo button component for toolbar.
 * Displays an undo button when there are recent deletions to undo.
 * Also supports Cmd+Z / Ctrl+Z keyboard shortcut.
 */

import { useEffect } from 'react'
import { Undo2 } from 'lucide-react'
import { useUndo } from '@/hooks/useUndo'
import { useUndoStore } from '@/stores/undoStore'

/**
 * Undo button component for toolbar.
 * 
 * Displays an undo button when there are recent deletions to undo. Supports
 * both click interaction and keyboard shortcut (Cmd+Z / Ctrl+Z). The button
 * is disabled when there's nothing to undo.
 * 
 * **Undo Functionality:**
 * - Undoes the most recent deletion operation
 * - Restores all items deleted in that operation (concepts and relationships)
 * - Uses the undo store to track deletion history
 * 
 * **Keyboard Shortcut:**
 * - `Cmd+Z` (Mac) or `Ctrl+Z` (Windows/Linux) triggers undo
 * - Only works when not typing in an input/textarea field
 * - Prevents default browser undo behavior
 * 
 * **Button States:**
 * - Enabled: When there are deletions in history
 * - Disabled: When deletion history is empty
 * 
 * @returns The undo button JSX element
 * 
 * @example
 * ```tsx
 * import { UndoButton } from '@/components/ui/UndoButton'
 * 
 * function Toolbar() {
 *   return (
 *     <div className="flex gap-2">
 *       <UndoButton />
 *       <OtherToolbarButtons />
 *     </div>
 *   )
 * }
 * ```
 */
export function UndoButton() {
  const { undo, getHistory } = useUndo()
  // Subscribe to deletion history changes from the store
  const deletionHistory = useUndoStore((state) => state.deletionHistory)
  const hasHistory = deletionHistory.length > 0

  // Handle keyboard shortcut (Cmd+Z / Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      // Only handle if not typing in an input/textarea
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey && !isInput) {
        // Prevent default browser undo behavior
        event.preventDefault()
        
        // Check if there's something to undo
        const history = getHistory()
        if (history.length > 0) {
          void undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, getHistory])

  const handleUndo = async () => {
    await undo()
  }

  return (
    <button
      onClick={handleUndo}
      disabled={!hasHistory}
      className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
      title={hasHistory ? 'Undo last deletion (Cmd+Z / Ctrl+Z)' : 'No deletions to undo'}
      aria-label="Undo deletion"
    >
      <Undo2 className="h-4 w-4" />
      Undo
    </button>
  )
}

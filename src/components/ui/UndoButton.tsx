/**
 * Undo button component for toolbar.
 * Displays an icon-only undo button when there are recent operations to undo.
 * Also supports Cmd+Z / Ctrl+Z keyboard shortcut.
 */

import { useEffect } from 'react'
import { Undo2 } from 'lucide-react'
import { useUndo } from '@/hooks/useUndo'
import { useUndoStore } from '@/stores/undoStore'
import { IconButton } from './IconButton'

/**
 * Undo button component for toolbar.
 * 
 * Displays an icon-only undo button when there are recent operations to undo. Supports
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
  const { undo, canUndo } = useUndo()
  // Subscribe to mutation history changes from the store
  const mutationHistory = useUndoStore((state) => state.mutationHistory)
  const deletionHistory = useUndoStore((state) => state.deletionHistory)
  // Check if undo is available (either mutation history or deletion history)
  const hasHistory = mutationHistory.length > 0 || deletionHistory.length > 0

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
        if (canUndo() || deletionHistory.length > 0) {
          void undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, canUndo, deletionHistory.length])

  const handleUndo = async () => {
    await undo()
  }

  return (
    <IconButton
      onClick={handleUndo}
      disabled={!hasHistory}
      title={hasHistory ? 'Undo last operation (Cmd+Z / Ctrl+Z)' : 'No operations to undo'}
      aria-label="Undo operation"
    >
      <Undo2 className="h-4 w-4" />
    </IconButton>
  )
}

/**
 * Redo button component for toolbar.
 * Displays an icon-only redo button when there are undone operations to redo.
 * Also supports Cmd+Shift+Z / Ctrl+Shift+Z keyboard shortcut.
 */

import { useEffect } from 'react'
import { Redo2 } from 'lucide-react'
import { useRedo } from '@/hooks/useRedo'
import { useUndoStore } from '@/stores/undoStore'
import { IconButton } from './IconButton'

/**
 * Redo button component for toolbar.
 * 
 * Displays an icon-only redo button when there are undone operations to redo. Supports
 * both click interaction and keyboard shortcut (Cmd+Shift+Z / Ctrl+Shift+Z). The button
 * is disabled when there's nothing to redo.
 * 
 * **Redo Functionality:**
 * - Redoes the most recently undone operation
 * - Re-executes all mutations in that operation
 * - Uses the undo store to track redo stack
 * 
 * **Keyboard Shortcut:**
 * - `Cmd+Shift+Z` (Mac) or `Ctrl+Shift+Z` (Windows/Linux) triggers redo
 * - Only works when not typing in an input/textarea field
 * - Prevents default browser redo behavior
 * 
 * **Button States:**
 * - Enabled: When there are operations in redo stack
 * - Disabled: When redo stack is empty
 * 
 * @returns The redo button JSX element
 * 
 * @example
 * ```tsx
 * import { RedoButton } from '@/components/ui/RedoButton'
 * 
 * function Toolbar() {
 *   return (
 *     <div className="flex gap-2">
 *       <RedoButton />
 *       <OtherToolbarButtons />
 *     </div>
 *   )
 * }
 * ```
 */
export function RedoButton() {
  const { redo, canRedo } = useRedo()
  // Subscribe to redo stack changes from the store
  const redoStack = useUndoStore((state) => state.redoStack)
  const hasRedo = redoStack.length > 0

  // Handle keyboard shortcut (Cmd+Shift+Z / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux)
      // Only handle if not typing in an input/textarea
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && event.shiftKey && !isInput) {
        // Prevent default browser redo behavior
        event.preventDefault()
        
        // Check if there's something to redo
        if (canRedo()) {
          void redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [redo, canRedo])

  const handleRedo = async () => {
    await redo()
  }

  return (
    <IconButton
      onClick={handleRedo}
      disabled={!hasRedo}
      title={hasRedo ? 'Redo last undone operation (Cmd+Shift+Z / Ctrl+Shift+Z)' : 'No operations to redo'}
      aria-label="Redo operation"
    >
      <Redo2 className="h-4 w-4" />
    </IconButton>
  )
}


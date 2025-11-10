/**
 * Context menu component for canvas background.
 * Appears on right-click and allows creating new items (Concept, Comment, etc.).
 */

import { useEffect, useRef } from 'react'
import { MessageSquare, Plus } from 'lucide-react'

export interface CanvasContextMenuProps {
  /** Whether the menu is visible */
  visible: boolean
  /** Screen position where menu should appear */
  position: { x: number; y: number } | null
  /** Callback when menu should be closed */
  onClose: () => void
  /** Callback when "Add Concept" is clicked */
  onAddConcept: () => void
  /** Callback when "Add Comment" is clicked */
  onAddComment: () => void
  /** Whether user has write access (disables menu if false) */
  hasWriteAccess: boolean
}

/**
 * Context menu for canvas background.
 * 
 * Displays a menu with options to create new items when right-clicking on
 * the canvas background. Automatically closes when clicking outside or
 * selecting an item.
 * 
 * @param props - Component props
 * @returns The context menu JSX, or null if not visible
 */
export function CanvasContextMenu({
  visible,
  position,
  onClose,
  onAddConcept,
  onAddComment,
  hasWriteAccess,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    if (!visible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    // Use capture phase to catch clicks before they bubble
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [visible, onClose])

  // Close menu on Escape key
  useEffect(() => {
    if (!visible) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [visible, onClose])

  if (!visible || !position || !hasWriteAccess) return null

  const handleAddConcept = () => {
    onAddConcept()
    onClose()
  }

  const handleAddComment = () => {
    onAddComment()
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleAddConcept}
        className="w-full px-4 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>Add Concept</span>
      </button>
      <button
        onClick={handleAddComment}
        className="w-full px-4 py-2 text-left text-sm text-popover-foreground hover:bg-accent flex items-center gap-2 transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Add Comment</span>
      </button>
    </div>
  )
}


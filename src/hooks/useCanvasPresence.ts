/**
 * Hook for handling presence integration in the concept map canvas.
 * 
 * Provides functionality for:
 * - Cursor tracking setup (mouse movement on React Flow pane)
 * - Editing state updates (tracking selected nodes/edges)
 * 
 * This hook isolates presence/collaboration logic, making it easier to test
 * and maintain.
 */

import { useEffect } from 'react'
import { usePresenceCursorSetter } from '@/hooks/usePresenceCursorSetter'
import { usePresenceEditing } from '@/hooks/usePresenceEditing'
import { useUIStore } from '@/stores/uiStore'

/**
 * Options for presence hook.
 */
export interface UseCanvasPresenceOptions {
  /** Function to convert screen coordinates to flow coordinates */
  screenToFlowPosition: (point: { x: number; y: number }) => { x: number; y: number }
}

/**
 * Hook for presence integration.
 * 
 * @param options - Configuration options
 */
export function useCanvasPresence(options: UseCanvasPresenceOptions) {
  const { screenToFlowPosition } = options

  // Presence tracking - split into separate hooks to prevent unnecessary re-renders
  // Cursor setter: only updates cursor position, doesn't subscribe to peer cursors
  const { setCursor } = usePresenceCursorSetter()
  // Editing hook: updates only when editing state changes
  const { setEditingNode, setEditingEdge } = usePresenceEditing()

  const selectedConceptId = useUIStore((state) => state.selectedConceptId)
  const selectedRelationshipId = useUIStore((state) => state.selectedRelationshipId)

  /**
   * Track cursor movement on the React Flow pane.
   * Converts screen coordinates to flow coordinates for storage.
   */
  useEffect(() => {
    const reactFlowPane = document.querySelector<HTMLElement>('.react-flow')
    if (!reactFlowPane) return

    const handleMouseMove = (event: MouseEvent) => {
      // Get the React Flow pane bounds
      const paneRect = reactFlowPane.getBoundingClientRect()

      // Check if mouse is within the pane
      if (
        event.clientX >= paneRect.left &&
        event.clientX <= paneRect.right &&
        event.clientY >= paneRect.top &&
        event.clientY <= paneRect.bottom
      ) {
        // Convert screen coordinates to flow coordinates
        const flowPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
        setCursor(flowPosition)
      } else {
        // Mouse outside pane - clear cursor
        setCursor(null)
      }
    }

    const handleMouseLeave = () => {
      setCursor(null)
    }

    reactFlowPane.addEventListener('mousemove', handleMouseMove)
    reactFlowPane.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      reactFlowPane.removeEventListener('mousemove', handleMouseMove)
      reactFlowPane.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [setCursor, screenToFlowPosition])

  /**
   * Track editing state for selected concept.
   */
  useEffect(() => {
    setEditingNode(selectedConceptId)
  }, [selectedConceptId, setEditingNode])

  /**
   * Track editing state for selected relationship.
   */
  useEffect(() => {
    setEditingEdge(selectedRelationshipId)
  }, [selectedRelationshipId, setEditingEdge])
}


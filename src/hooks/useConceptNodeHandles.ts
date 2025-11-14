/**
 * Hook for managing concept node connection handles with Option key expansion.
 * 
 * Tracks Option/Alt key state and mouse hover to expand handles when Option is held.
 * This allows users to drag from anywhere on the node to create connections.
 * 
 * **Handle Expansion:**
 * - When Option/Alt key is pressed and mouse is over node, handle expands to cover entire node
 * - When Option/Alt key is released or mouse leaves, handle collapses to center
 * - Only works when user has write access and node is not being edited
 * 
 * @param isOptionKeyPressed - Whether Option/Alt key is currently pressed (from canvas store)
 * @param hasWriteAccess - Whether user has write access to the map
 * @param isEditing - Whether the node label is currently being edited
 * @returns Object containing handle hover state and style props
 * 
 * @example
 * ```tsx
 * import { useConceptNodeHandles } from '@/hooks/useConceptNodeHandles'
 * import { useCanvasStore } from '@/stores/canvasStore'
 * 
 * function ConceptNode({ isEditing }) {
 *   const isOptionKeyPressed = useCanvasStore((state) => state.isOptionKeyPressed)
 *   const { hasWriteAccess } = useMapPermissions()
 *   const { isOptionHovered, handleMouseEnter, handleMouseLeave, handleMouseMove } = 
 *     useConceptNodeHandles(isOptionKeyPressed, hasWriteAccess, isEditing)
 *   
 *   return (
 *     <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
 *       <Handle style={isOptionHovered ? expandedStyle : collapsedStyle} />
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react'

/**
 * Return type for useConceptNodeHandles hook
 */
export interface UseConceptNodeHandlesReturn {
  /** Whether handle should be expanded (Option key + mouse over) */
  isOptionHovered: boolean
  /** Mouse enter handler */
  handleMouseEnter: () => void
  /** Mouse leave handler */
  handleMouseLeave: () => void
  /** Mouse move handler (checks Option key state) */
  handleMouseMove: (e: React.MouseEvent) => void
}

/**
 * Hook to manage Option key handle expansion.
 * 
 * Tracks mouse hover state and Option key state to expand/collapse handles.
 * 
 * @param isOptionKeyPressed - Whether Option/Alt key is currently pressed
 * @param hasWriteAccess - Whether user has write access
 * @param isEditing - Whether node is being edited
 * @returns Handle state and event handlers
 */
export function useConceptNodeHandles(
  isOptionKeyPressed: boolean,
  hasWriteAccess: boolean,
  isEditing: boolean
): UseConceptNodeHandlesReturn {
  const [isOptionHovered, setIsOptionHovered] = useState(false)
  const isMouseOverRef = useRef(false)

  /**
   * Handle mouse enter - check if Option/Alt key is pressed and expand handle.
   */
  const handleMouseEnter = () => {
    isMouseOverRef.current = true
    if (isOptionKeyPressed && hasWriteAccess && !isEditing) {
      setIsOptionHovered(true)
    }
  }

  /**
   * Handle mouse leave - collapse handle if Option was held.
   */
  const handleMouseLeave = () => {
    isMouseOverRef.current = false
    setIsOptionHovered(false)
  }

  /**
   * Handle mouse move - check if Option key state changed while hovering.
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    // Only check altKey - metaKey is Command key, not Option key
    const isOptionKey = e.altKey
    if (hasWriteAccess && !isEditing) {
      setIsOptionHovered(isOptionKey)
    }
  }

  // Update hover state when Option key state changes (if mouse is over node)
  useEffect(() => {
    if (isMouseOverRef.current && hasWriteAccess && !isEditing) {
      setIsOptionHovered(isOptionKeyPressed)
    } else if (!isOptionKeyPressed) {
      setIsOptionHovered(false)
    }
  }, [isOptionKeyPressed, hasWriteAccess, isEditing])

  return {
    isOptionHovered,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
  }
}


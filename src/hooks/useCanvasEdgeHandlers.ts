/**
 * Hook for handling edge-related events in the concept map canvas.
 * 
 * Provides handlers for:
 * - Edge changes (deletions)
 * - Edge click events
 * 
 * This hook centralizes all edge interaction logic, making it easier to test
 * and maintain.
 */

import { useCallback } from 'react'
import type { Edge, EdgeChange } from 'reactflow'
import { useCanvasMutations } from './useCanvasMutations'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { useMapPermissions } from './useMapPermissions'

/**
 * Options for edge handlers hook.
 */
export interface UseCanvasEdgeHandlersOptions {
  /** Array of React Flow edges */
  edges: Edge[]
  /** Base handler from useEdgesState */
  onEdgesChangeBase: (changes: EdgeChange[]) => void
}

/**
 * Hook for edge event handlers.
 * 
 * @param options - Configuration options
 * @returns Object containing edge event handlers
 */
export function useCanvasEdgeHandlers(options: UseCanvasEdgeHandlersOptions) {
  const {
    edges,
    onEdgesChangeBase,
  } = options

  const {
    deleteRelationship,
    unlinkCommentFromConcept,
    startOperation,
    endOperation,
  } = useCanvasMutations()

  const {
    setSelectedConceptId,
    setSelectedCommentId,
    setConceptEditorOpen,
    setSelectedRelationshipId,
    setRelationshipEditorOpen,
  } = useUIStore()

  const currentMapId = useMapStore((state) => state.currentMapId)
  const { hasWriteAccess } = useMapPermissions()

  const selectedRelationshipId = useUIStore((state) => state.selectedRelationshipId)

  /**
   * Handle edge changes (deletions, etc.)
   * Intercepts deletions and removes items from database.
   */
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Filter out remove actions and delete from database
      const removeChanges = changes.filter((change) => change.type === 'remove')

      // If user doesn't have write access, prevent deletions by filtering out remove changes
      if (removeChanges.length > 0 && !hasWriteAccess) {
        // Filter out remove changes before calling base handler
        const filteredChanges = changes.filter((change) => change.type !== 'remove')
        onEdgesChangeBase(filteredChanges)
        return
      }

      if (removeChanges.length > 0 && hasWriteAccess && currentMapId) {
        // Check if selected relationship is being deleted
        const deletedRelationshipIds = removeChanges
          .map((change) => change.type === 'remove' ? change.id : undefined)
          .filter((id): id is string => id !== undefined)
        
        if (selectedRelationshipId && deletedRelationshipIds.includes(selectedRelationshipId)) {
          setSelectedRelationshipId(null)
          setRelationshipEditorOpen(false)
        }

        // Separate comment edges from relationship edges
        const currentEdges = edges
        const commentEdgeIds = new Set(
          currentEdges.filter((e) => e.type === 'comment-edge').map((e) => e.id)
        )

        // Delete relationships and unlink comments from database
        void (async () => {
          try {
            // Start a deletion operation
            startOperation()
            
            const deletePromises = removeChanges.map((change) => {
              if (change.type === 'remove' && change.id) {
                const isCommentEdge = commentEdgeIds.has(change.id)
                
                if (isCommentEdge) {
                  // Find the edge to get source (comment) and target (concept)
                  const edge = currentEdges.find((e) => e.id === change.id)
                  if (edge && edge.source && edge.target) {
                    // Unlink comment from concept
                    return unlinkCommentFromConcept(edge.source, edge.target)
                  }
                } else {
                  // Delete relationship (mutation hook handles undo tracking)
                  return deleteRelationship(change.id)
                }
              }
              return Promise.resolve()
            })
            await Promise.all(deletePromises)
            
            // End the deletion operation
            endOperation()
          } catch (error) {
            console.error('Failed to delete edges:', error)
            alert('Failed to delete edges. Please try again.')
            // End operation even on error
            endOperation()
          }
        })()
      }

      // Always call the base handler to update React Flow state
      onEdgesChangeBase(changes)
    },
    [
      hasWriteAccess,
      currentMapId,
      deleteRelationship,
      unlinkCommentFromConcept,
      onEdgesChangeBase,
      selectedRelationshipId,
      setSelectedRelationshipId,
      setRelationshipEditorOpen,
      startOperation,
      endOperation,
      edges,
    ]
  )

  /**
   * Handle edge click - select relationship and show toolbar (not comment edges).
   * Note: Double-click is handled by RelationshipEdge for inline editing.
   */
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // Only show toolbar for relationship edges, not comment edges
      if (edge.type === 'comment-edge') {
        return
      }
      
      // Clear other selections
      setSelectedConceptId(null)
      setSelectedCommentId(null)
      setConceptEditorOpen(false)
      // Set relationship selection (toolbar will appear)
      setSelectedRelationshipId(edge.id)
    },
    [
      setSelectedConceptId,
      setSelectedCommentId,
      setConceptEditorOpen,
      setSelectedRelationshipId,
    ]
  )

  return {
    onEdgesChange,
    onEdgeClick,
  }
}


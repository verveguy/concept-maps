/**
 * Hook for handling creation logic in the concept map canvas.
 * 
 * Provides functionality for:
 * - Pending concept relationship creation (drag-to-create flow)
 * 
 * This hook centralizes all creation-related logic, making it easier to test
 * and maintain.
 */

import { useEffect } from 'react'
import type { Node } from 'reactflow'
import { useCanvasMutations } from './useCanvasMutations'
import { useCanvasStore } from '@/stores/canvasStore'
import { useMapStore } from '@/stores/mapStore'
import type { Concept } from '@/lib/schema'

/**
 * Options for creation hook.
 */
export interface UseCanvasCreationOptions {
  /** Array of concepts from InstantDB */
  concepts: Concept[]
  /** Function to get all nodes (from React Flow) */
  getNodes: () => Node[]
  /** Function to set nodes (from React Flow) */
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
}

/**
 * Hook for creation logic.
 * 
 * @param options - Configuration options
 */
export function useCanvasCreation(options: UseCanvasCreationOptions) {
  const { concepts } = options

  const {
    createRelationship,
  } = useCanvasMutations()

  const {
    pendingConcept,
    setPendingConcept,
  } = useCanvasStore()

  const currentMapId = useMapStore((state) => state.currentMapId)

  /**
   * Create relationship for pending concept (drag-to-create flow).
   * This effect watches for concepts created via drag-to-create and creates
   * the relationship between the source and the newly created concept.
   */
  useEffect(() => {
    if (!pendingConcept || !currentMapId) return

    const { sourceId, position } = pendingConcept

    // Find the concept we just created (by position)
    const createdConcept = concepts.find(
      (c) =>
        Math.abs(c.position.x - position.x) < 50 &&
        Math.abs(c.position.y - position.y) < 50 &&
        c.label === 'New Concept'
    )

    if (createdConcept) {
      // Create the relationship
      createRelationship({
        mapId: currentMapId,
        fromConceptId: sourceId,
        toConceptId: createdConcept.id,
        primaryLabel: 'related to',
        reverseLabel: 'related from',
      }).catch((error) => {
        console.error('Failed to create relationship:', error)
      })

      // Clear pending
      setPendingConcept(null)
    }
  }, [concepts, currentMapId, createRelationship, pendingConcept, setPendingConcept])
}


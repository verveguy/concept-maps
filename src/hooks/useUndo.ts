/**
 * Hook for undo functionality.
 * Tracks recent deletions and provides ability to undo them.
 * Uses a shared Zustand store for state management.
 */

import { useCallback } from 'react'
import { useConceptActions } from './useConceptActions'
import { useRelationshipActions } from './useRelationshipActions'
import { useUndoStore } from '@/stores/undoStore'

/**
 * Represents a deletion entry in the undo history.
 */
export interface DeletionEntry {
  /** Type of item deleted */
  type: 'concept' | 'relationship'
  /** ID of the deleted item */
  id: string
  /** Timestamp when deleted */
  deletedAt: number
  /** Operation ID to group related deletions */
  operationId: string
}

/**
 * Hook for undo functionality.
 * Tracks recent deletions and provides ability to undo them.
 * 
 * @returns Object containing undo function and current deletion history
 */
export function useUndo() {
  const { undeleteConcept } = useConceptActions()
  const { undeleteRelationship } = useRelationshipActions()
  const {
    recordDeletion,
    getHistory,
    clearHistory,
    getMostRecentOperation,
    removeMostRecentOperation,
    startOperation,
    endOperation,
  } = useUndoStore()

  /**
   * Undo the most recent deletion operation.
   * 
   * Restores all items deleted in the most recent operation (concepts and their
   * relationships). Processes concepts first, then relationships, executing all
   * restorations in parallel for performance.
   * 
   * **Operation Grouping:**
   * All deletions within a short time window are grouped into a single operation.
   * This ensures that related deletions (e.g., a concept and its relationships)
   * are restored together.
   * 
   * **Return Value:**
   * Returns `true` if undo was successful, `false` if there was nothing to undo.
   * 
   * @returns Promise that resolves to `true` if undo was successful, `false` otherwise
   * 
   * @example
   * ```tsx
   * const { undo } = useUndo()
   * 
   * const handleUndo = async () => {
   *   const success = await undo()
   *   if (success) {
   *     console.log('Undo successful')
   *   } else {
   *     console.log('Nothing to undo')
   *   }
   * }
   * ```
   */
  const undo = useCallback(async (): Promise<boolean> => {
    const operation = getMostRecentOperation()
    if (operation.length === 0) {
      console.log('No deletion history to undo')
      return false
    }

    console.log('Attempting to undo operation with', operation.length, 'deletions:', operation)
    
    try {
      // Undelete all items in the operation
      // Process concepts first, then relationships
      const conceptPromises = operation
        .filter((entry) => entry.type === 'concept')
        .map((entry) => {
          console.log('Undeleting concept:', entry.id)
          return undeleteConcept(entry.id)
        })
      
      const relationshipPromises = operation
        .filter((entry) => entry.type === 'relationship')
        .map((entry) => {
          console.log('Undeleting relationship:', entry.id)
          return undeleteRelationship(entry.id)
        })
      
      // Execute all undeletes in parallel
      await Promise.all([...conceptPromises, ...relationshipPromises])
      
      // Remove the entire operation from history after successful undo
      removeMostRecentOperation()
      console.log('Undo successful - restored', operation.length, 'items')
      
      return true
    } catch (error) {
      console.error('Failed to undo deletion operation:', error)
      return false
    }
  }, [undeleteConcept, undeleteRelationship, getMostRecentOperation, removeMostRecentOperation])

  return {
    undo,
    recordDeletion,
    getHistory,
    clearHistory,
    startOperation,
    endOperation,
  }
}


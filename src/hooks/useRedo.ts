/**
 * Hook for redo functionality.
 * Re-executes previously undone operations.
 * Uses a shared Zustand store for state management.
 */

import { useCallback } from 'react'
import { useCanvasMutations } from './useCanvasMutations'
import { useUndoStore, type MutationCommandUnion } from '@/stores/undoStore'

/**
 * Hook for redo functionality.
 * Re-executes previously undone operations.
 * 
 * @returns Object containing redo function and redo availability check
 */
export function useRedo() {
  // Use canvas mutations hooks so mutations are properly recorded for undo
  const {
    createConcept,
    updateConcept,
    deleteConcept,
    createRelationship,
    updateRelationship,
    reverseRelationship,
    deleteRelationship,
    createComment,
    updateComment,
    deleteComment,
    linkCommentToConcept,
    unlinkCommentFromConcept,
    resolveComment,
    unresolveComment,
    updateMap,
  } = useCanvasMutations()
  
  const {
    getMostRecentRedoOperation,
    removeMostRecentRedoOperation,
    canRedo,
  } = useUndoStore()

  /**
   * Re-execute a mutation command.
   * Executes the original operation for a single command.
   */
  const reexecuteCommand = useCallback(async (command: MutationCommandUnion): Promise<boolean> => {
    try {
      switch (command.type) {
        case 'createConcept': {
          // Re-execute create: create the concept again with original data
          if (command.data) {
            await createConcept(command.data)
            return true
          } else {
            console.warn('Cannot redo createConcept: data not available', command)
            return false
          }
        }
        case 'updateConcept': {
          // Re-execute update: apply the same updates again
          await updateConcept(command.conceptId, command.updates)
          return true
        }
        case 'deleteConcept': {
          // Re-execute delete: delete the concept again
          await deleteConcept(command.conceptId)
          return true
        }
        case 'createRelationship': {
          // Re-execute create: create the relationship again with original data
          if (command.data) {
            await createRelationship(command.data)
            return true
          } else {
            console.warn('Cannot redo createRelationship: data not available', command)
            return false
          }
        }
        case 'updateRelationship': {
          // Re-execute update: apply the same updates again
          await updateRelationship(command.relationshipId, command.updates)
          return true
        }
        case 'reverseRelationship': {
          // Re-execute reverse: reverse the relationship again
          // Note: We need to reverse from the current state, not the previousState
          // For now, we'll reverse it again (which should swap it back)
          await reverseRelationship(command.relationshipId, {
            fromConceptId: command.previousState.toConceptId,
            toConceptId: command.previousState.fromConceptId,
            primaryLabel: command.previousState.reverseLabel,
            reverseLabel: command.previousState.primaryLabel,
          })
          return true
        }
        case 'deleteRelationship': {
          // Re-execute delete: delete the relationship again
          await deleteRelationship(command.relationshipId)
          return true
        }
        case 'createComment': {
          // Re-execute create: create the comment again with original data
          if (command.data) {
            await createComment(command.data)
            return true
          } else {
            console.warn('Cannot redo createComment: data not available', command)
            return false
          }
        }
        case 'updateComment': {
          // Re-execute update: apply the same updates again
          await updateComment(command.commentId, command.updates)
          return true
        }
        case 'deleteComment': {
          // Re-execute delete: delete the comment again
          await deleteComment(command.commentId)
          return true
        }
        case 'linkCommentToConcept': {
          // Re-execute link: link again
          await linkCommentToConcept(command.commentId, command.conceptId)
          return true
        }
        case 'unlinkCommentFromConcept': {
          // Re-execute unlink: unlink again
          await unlinkCommentFromConcept(command.commentId, command.conceptId)
          return true
        }
        case 'resolveComment': {
          // Re-execute resolve: resolve again
          await resolveComment(command.commentId, command.previousState)
          return true
        }
        case 'unresolveComment': {
          // Re-execute unresolve: unresolve again
          await unresolveComment(command.commentId, command.previousState)
          return true
        }
        case 'updateMap': {
          // Re-execute update: apply the same updates again
          await updateMap(command.mapId, command.updates, command.previousState)
          return true
        }
        default: {
          // This should never happen due to exhaustive type checking
          const _exhaustive: never = command
          console.warn('Unknown command type for redo:', _exhaustive)
          return false
        }
      }
    } catch (error) {
      console.error('Failed to re-execute command:', command, error)
      return false
    }
  }, [
    createConcept,
    updateConcept,
    deleteConcept,
    createRelationship,
    updateRelationship,
    reverseRelationship,
    deleteRelationship,
    createComment,
    updateComment,
    deleteComment,
    linkCommentToConcept,
    unlinkCommentFromConcept,
    resolveComment,
    unresolveComment,
    updateMap,
  ])

  /**
   * Redo the most recently undone operation.
   * 
   * Re-executes all mutations in the most recent redo operation and moves them
   * back to the mutation history. Processes commands in original order.
   * 
   * **Operation Grouping:**
   * Operations are grouped by operationId, ensuring related mutations are
   * re-executed together.
   * 
   * **Return Value:**
   * Returns `true` if redo was successful, `false` if there was nothing to redo.
   * 
   * @returns Promise that resolves to `true` if redo was successful, `false` otherwise
   * 
   * @example
   * ```tsx
   * const { redo } = useRedo()
   * 
   * const handleRedo = async () => {
   *   const success = await redo()
   *   if (success) {
   *     console.log('Redo successful')
   *   } else {
   *     console.log('Nothing to redo')
   *   }
   * }
   * ```
   */
  const redo = useCallback(async (): Promise<boolean> => {
    const operation = getMostRecentRedoOperation()
    if (operation.length === 0) {
      console.log('No redo operations available')
      return false
    }

    console.log('Attempting to redo operation with', operation.length, 'commands:', operation)
    
    try {
      // Remove from redo stack BEFORE re-executing to avoid race condition
      removeMostRecentRedoOperation()
      
      // Set isRedoing flag to prevent double-recording mutations
      // Mutations re-executed during redo should not be recorded again
      useUndoStore.getState().setIsRedoing(true)
      
      try {
        // Re-execute commands in original order (oldest first)
        // Since redo stack is newest first, we need to reverse to get original order
        const reexecutePromises = operation
          .slice()
          .reverse()
          .map((command) => reexecuteCommand(command))
        
        const results = await Promise.all(reexecutePromises)
        const allSucceeded = results.every((r) => r === true)
        
        if (allSucceeded || results.some((r) => r === true)) {
          // Mutations were re-executed but not re-recorded (due to isRedoing flag)
          // We'll add them back to mutation history after clearing the flag
          console.log('Redo successful - re-executed', operation.length, 'commands')
          return true
        } else {
          console.error('All re-execute operations failed')
          return false
        }
      } finally {
        // Always clear the isRedoing flag
        useUndoStore.getState().setIsRedoing(false)
        
        // After clearing the flag, manually add the operation back to mutation history
        // This restores the commands to the history so they can be undone again
        if (operation.length > 0) {
          const state = useUndoStore.getState()
          const MAX_MUTATION_HISTORY_SIZE = 100
          const newHistory = [...operation, ...state.mutationHistory]
          // Trim if needed
          const trimmedHistory = newHistory.length > MAX_MUTATION_HISTORY_SIZE 
            ? newHistory.slice(0, MAX_MUTATION_HISTORY_SIZE)
            : newHistory
          useUndoStore.setState({ mutationHistory: trimmedHistory })
        }
      }
    } catch (error) {
      console.error('Failed to redo operation:', error)
      // Ensure flag is cleared even on error
      useUndoStore.getState().setIsRedoing(false)
      return false
    }
  }, [
    getMostRecentRedoOperation,
    removeMostRecentRedoOperation,
    reexecuteCommand,
  ])

  return {
    redo,
    canRedo,
  }
}


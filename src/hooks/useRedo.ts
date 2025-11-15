/**
 * Hook for redo functionality.
 * Re-executes previously undone operations.
 * Uses a shared Zustand store for state management.
 */

import { useCallback } from 'react'
import { useCanvasCommands } from './useCanvasCommands'
import { usePerspectiveCommands } from './usePerspectiveCommands'
import { useUndoStore, type MutationCommandUnion } from '@/stores/undoStore'

/**
 * Hook for redo functionality.
 * Re-executes previously undone operations.
 * 
 * @returns Object containing redo function and redo availability check
 */
export function useRedo() {
  // Use canvas command hooks so commands are properly recorded for undo
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
    updateMap,
  } = useCanvasCommands()
  
  // Use perspective command hooks so commands are properly recorded for undo
  const {
    createPerspective,
    updatePerspective,
    deletePerspective,
    toggleConceptInPerspective,
    toggleRelationshipInPerspective,
  } = usePerspectiveCommands()
  
  const {
    getMostRecentRedoOperation,
    removeMostRecentRedoOperation,
    canRedo,
    setIsRedoing,
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
        case 'updateMap': {
          // Re-execute update: apply the same updates again
          await updateMap(command.mapId, command.updates, command.previousState)
          return true
        }
        case 'createPerspective': {
          // Re-execute create: create the perspective again with original data
          await createPerspective({
            mapId: command.mapId,
            name: command.name,
            conceptIds: command.conceptIds,
            relationshipIds: command.relationshipIds,
          })
          return true
        }
        case 'updatePerspective': {
          // Re-execute update: apply the same updates again
          await updatePerspective(command.perspectiveId, command.updates, command.previousState)
          return true
        }
        case 'deletePerspective': {
          // Re-execute delete: delete the perspective again
          await deletePerspective(command.perspectiveId, command.previousState)
          return true
        }
        case 'toggleConceptInPerspective': {
          // Re-execute toggle: toggle again
          // We need allRelationships - for redo, relationships should be in current state
          // Pass empty array for now - the action will handle relationship updates
          const allRelationships: Array<{ id: string; fromConceptId: string; toConceptId: string }> = []
          await toggleConceptInPerspective(
            command.perspectiveId,
            command.conceptId,
            command.previousConceptIds,
            command.previousRelationshipIds,
            allRelationships
          )
          return true
        }
        case 'toggleRelationshipInPerspective': {
          // Re-execute toggle: toggle again
          await toggleRelationshipInPerspective(
            command.perspectiveId,
            command.relationshipId,
            command.previousRelationshipIds
          )
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
    updateMap,
    createPerspective,
    updatePerspective,
    deletePerspective,
    toggleConceptInPerspective,
    toggleRelationshipInPerspective,
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
    
    // Set isRedoing flag to prevent mutations from being recorded during redo
    setIsRedoing(true)
    
    try {
      // Remove from redo stack BEFORE re-executing to avoid race condition
      // (re-execution will trigger recordMutation which clears redo stack)
      removeMostRecentRedoOperation()
      
      // Re-execute commands in original order (oldest first)
      // Since redo stack is newest first, we need to reverse to get original order
      const reexecutePromises = operation
        .slice()
        .reverse()
        .map((command) => reexecuteCommand(command))
      
      const results = await Promise.all(reexecutePromises)
      const allSucceeded = results.every((r) => r === true)
      
      if (allSucceeded || results.some((r) => r === true)) {
        // Mutations are NOT re-recorded because isRedoing flag prevents recordMutation
        console.log('Redo successful - re-executed', operation.length, 'commands')
        return true
      } else {
        console.error('All re-execute operations failed')
        return false
      }
    } catch (error) {
      console.error('Failed to redo operation:', error)
      return false
    } finally {
      // Always clear the isRedoing flag, even if redo fails
      setIsRedoing(false)
    }
  }, [
    getMostRecentRedoOperation,
    removeMostRecentRedoOperation,
    reexecuteCommand,
    setIsRedoing,
  ])

  return {
    redo,
    canRedo,
  }
}


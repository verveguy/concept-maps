/**
 * Hook for undo functionality.
 * Tracks recent deletions and provides ability to undo them.
 * Uses a shared Zustand store for state management.
 */

import { useCallback } from 'react'
import { useConceptActions } from './useConceptActions'
import { useRelationshipActions } from './useRelationshipActions'
import { useCommentActions } from './useCommentActions'
import { useMapActions } from './useMapActions'
import { useUndoStore, type MutationCommandUnion } from '@/stores/undoStore'

/**
 * Represents a deletion entry in the undo history.
 */
export interface DeletionEntry {
  /** Type of item deleted */
  type: 'concept' | 'relationship' | 'comment'
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
  const { 
    undeleteConcept, 
    deleteConcept, 
    updateConcept: updateConceptAction 
  } = useConceptActions()
  const { 
    undeleteRelationship, 
    deleteRelationship, 
    updateRelationship: updateRelationshipAction,
    reverseRelationship: reverseRelationshipAction 
  } = useRelationshipActions()
  const { 
    undeleteComment, 
    deleteComment, 
    updateComment: updateCommentAction,
    linkCommentToConcept: linkCommentToConceptAction,
    unlinkCommentFromConcept: unlinkCommentFromConceptAction 
  } = useCommentActions()
  const {
    updateMap: updateMapAction,
  } = useMapActions()
  const {
    recordDeletion,
    getHistory,
    clearHistory,
    getMostRecentOperation,
    removeMostRecentOperation,
    getMostRecentMutationOperation,
    removeMostRecentMutationOperation,
    pushToRedoStack,
    startOperation,
    endOperation,
    canUndo,
  } = useUndoStore()

  /**
   * Reverse a mutation command.
   * Executes the reverse operation for a single command.
   */
  const reverseCommand = useCallback(async (command: MutationCommandUnion): Promise<boolean> => {
    try {
      switch (command.type) {
        case 'createConcept': {
          // Reverse create: delete the concept
          // Note: conceptId may not be populated in the command
          // For now, we can't undo creates without IDs - this is a limitation
          if (!command.conceptId) {
            console.warn('Cannot undo createConcept: conceptId not available', command)
            return false
          }
          await deleteConcept(command.conceptId)
          return true
        }
        case 'updateConcept': {
          // Reverse update: restore previous state if available
          if (command.previousState) {
            const reverseUpdates: any = {}
            if (command.previousState.label !== undefined) reverseUpdates.label = command.previousState.label
            if (command.previousState.position !== undefined) reverseUpdates.position = command.previousState.position
            if (command.previousState.notes !== undefined) reverseUpdates.notes = command.previousState.notes
            if (command.previousState.metadata !== undefined) reverseUpdates.metadata = command.previousState.metadata
            if (command.previousState.showNotesAndMetadata !== undefined) reverseUpdates.showNotesAndMetadata = command.previousState.showNotesAndMetadata
            if (command.previousState.userPlaced !== undefined) reverseUpdates.userPlaced = command.previousState.userPlaced
            await updateConceptAction(command.conceptId, reverseUpdates)
            return true
          } else {
            console.warn('Cannot undo updateConcept: previousState not available', command)
            return false
          }
        }
        case 'deleteConcept': {
          // Reverse delete: undelete the concept
          await undeleteConcept(command.conceptId)
          return true
        }
        case 'createRelationship': {
          // Reverse create: delete the relationship
          // Note: relationshipId may not be populated in the command
          if (!command.relationshipId) {
            console.warn('Cannot undo createRelationship: relationshipId not available', command)
            return false
          }
          await deleteRelationship(command.relationshipId)
          return true
        }
        case 'updateRelationship': {
          // Reverse update: restore previous state if available
          if (command.previousState) {
            const reverseUpdates: any = {}
            if (command.previousState.primaryLabel !== undefined) reverseUpdates.primaryLabel = command.previousState.primaryLabel
            if (command.previousState.reverseLabel !== undefined) reverseUpdates.reverseLabel = command.previousState.reverseLabel
            if (command.previousState.notes !== undefined) reverseUpdates.notes = command.previousState.notes
            if (command.previousState.metadata !== undefined) reverseUpdates.metadata = command.previousState.metadata
            await updateRelationshipAction(command.relationshipId, reverseUpdates)
            return true
          } else {
            console.warn('Cannot undo updateRelationship: previousState not available', command)
            return false
          }
        }
        case 'reverseRelationship': {
          // Reverse reverse: reverse again (swap back)
          await reverseRelationshipAction(command.relationshipId, {
            fromConceptId: command.previousState.fromConceptId,
            toConceptId: command.previousState.toConceptId,
            primaryLabel: command.previousState.primaryLabel,
            reverseLabel: command.previousState.reverseLabel,
          })
          return true
        }
        case 'deleteRelationship': {
          // Reverse delete: undelete the relationship
          await undeleteRelationship(command.relationshipId)
          return true
        }
        case 'createComment': {
          // Reverse create: delete the comment
          // Note: commentId may not be populated in the command
          if (!command.commentId) {
            console.warn('Cannot undo createComment: commentId not available', command)
            return false
          }
          await deleteComment(command.commentId)
          return true
        }
        case 'updateComment': {
          // Reverse update: restore previous state if available
          if (command.previousState) {
            const reverseUpdates: any = {}
            if (command.previousState.text !== undefined) reverseUpdates.text = command.previousState.text
            if (command.previousState.position !== undefined) reverseUpdates.position = command.previousState.position
            if (command.previousState.userPlaced !== undefined) reverseUpdates.userPlaced = command.previousState.userPlaced
            await updateCommentAction(command.commentId, reverseUpdates)
            return true
          } else {
            console.warn('Cannot undo updateComment: previousState not available', command)
            return false
          }
        }
        case 'deleteComment': {
          // Reverse delete: undelete the comment
          await undeleteComment(command.commentId)
          return true
        }
        case 'linkCommentToConcept': {
          // Reverse link: unlink
          await unlinkCommentFromConceptAction(command.commentId, command.conceptId)
          return true
        }
        case 'unlinkCommentFromConcept': {
          // Reverse unlink: link
          await linkCommentToConceptAction(command.commentId, command.conceptId)
          return true
        }
        case 'updateMap': {
          // Reverse update: restore previous state if available
          if (command.previousState) {
            const reverseUpdates: any = {}
            if (command.previousState.name !== undefined) reverseUpdates.name = command.previousState.name
            if (command.previousState.layoutAlgorithm !== undefined) reverseUpdates.layoutAlgorithm = command.previousState.layoutAlgorithm
            await updateMapAction(command.mapId, reverseUpdates)
            return true
          } else {
            console.warn('Cannot undo updateMap: previousState not available', command)
            return false
          }
        }
        default: {
          // This should never happen due to exhaustive type checking
          const _exhaustive: never = command
          console.warn('Unknown command type for undo:', _exhaustive)
          return false
        }
      }
    } catch (error) {
      console.error('Failed to reverse command:', command, error)
      return false
    }
  }, [
    deleteConcept,
    updateConceptAction,
    undeleteConcept,
    deleteRelationship,
    updateRelationshipAction,
    reverseRelationshipAction,
    undeleteRelationship,
    deleteComment,
    updateCommentAction,
    undeleteComment,
    linkCommentToConceptAction,
    unlinkCommentFromConceptAction,
    updateMapAction,
  ])

  /**
   * Undo the most recent mutation operation.
   * 
   * Reverses all mutations in the most recent operation and moves them to the redo stack.
   * Processes commands in reverse order (most recent first) to properly reverse the operation.
   * 
   * **Operation Grouping:**
   * All mutations within a short time window are grouped into a single operation.
   * This ensures that related mutations are reversed together.
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
    // Try mutation history first (newer system)
    const mutationOperation = getMostRecentMutationOperation()
    
    if (mutationOperation.length > 0) {
      console.log('Attempting to undo mutation operation with', mutationOperation.length, 'commands:', mutationOperation)
      
      try {
        // Reverse commands in reverse order (most recent first)
        const reversePromises = mutationOperation
          .slice()
          .reverse()
          .map((command) => reverseCommand(command))
        
        const results = await Promise.all(reversePromises)
        const allSucceeded = results.every((r) => r === true)
        const someSucceeded = results.some((r) => r === true)
        
        // Always move operation to redo stack, even if reversal failed
        // This allows users to see what was attempted and potentially redo it
        pushToRedoStack(mutationOperation)
        removeMostRecentMutationOperation()
        
        if (allSucceeded) {
          console.log('Undo successful - reversed', mutationOperation.length, 'commands')
          return true
        } else if (someSucceeded) {
          console.warn('Undo partially successful - some commands could not be reversed')
          return true
        } else {
          console.warn('Undo recorded but all reverse operations failed - operation moved to redo stack')
          return true
        }
      } catch (error) {
        console.error('Failed to undo mutation operation:', error)
        // Still move to redo stack even on error
        pushToRedoStack(mutationOperation)
        removeMostRecentMutationOperation()
        return false
      }
    }
    
    // Fallback to deletion history (backward compatibility)
    const deletionOperation = getMostRecentOperation()
    if (deletionOperation.length > 0) {
      console.log('Attempting to undo deletion operation with', deletionOperation.length, 'deletions:', deletionOperation)
      
      try {
        // Undelete all items in the operation
        // Process concepts first, then relationships, then comments
        const conceptPromises = deletionOperation
          .filter((entry) => entry.type === 'concept')
          .map((entry) => {
            console.log('Undeleting concept:', entry.id)
            return undeleteConcept(entry.id)
          })
        
        const relationshipPromises = deletionOperation
          .filter((entry) => entry.type === 'relationship')
          .map((entry) => {
            console.log('Undeleting relationship:', entry.id)
            return undeleteRelationship(entry.id)
          })
        
        const commentPromises = deletionOperation
          .filter((entry) => entry.type === 'comment')
          .map((entry) => {
            console.log('Undeleting comment:', entry.id)
            return undeleteComment(entry.id)
          })
        
        // Execute all undeletes in parallel
        await Promise.all([...conceptPromises, ...relationshipPromises, ...commentPromises])
        
        // Remove the entire operation from history after successful undo
        removeMostRecentOperation()
        console.log('Undo successful - restored', deletionOperation.length, 'items')
        
        return true
      } catch (error) {
        console.error('Failed to undo deletion operation:', error)
        return false
      }
    }
    
    console.log('No operations to undo')
    return false
  }, [
    getMostRecentMutationOperation,
    getMostRecentOperation,
    reverseCommand,
    pushToRedoStack,
    removeMostRecentMutationOperation,
    removeMostRecentOperation,
    undeleteConcept,
    undeleteRelationship,
    undeleteComment,
  ])

  return {
    undo,
    recordDeletion,
    getHistory,
    clearHistory,
    startOperation,
    endOperation,
    canUndo,
  }
}


/**
 * Canvas commands hook.
 * 
 * Wraps all database actions with command tracking and operation grouping.
 * Provides a consistent command interface for the canvas component.
 * 
 * This hook implements the Command Pattern, where each action is recorded
 * as a command that can be executed and undone. Commands are automatically
 * grouped into operations for better undo/redo behavior.
 */

import { useCallback } from 'react'
import { id } from '@/lib/instant'
import { useConceptActions, type CreateConceptData, type UpdateConceptData } from './useConceptActions'
import { useRelationshipActions, type CreateRelationshipData, type UpdateRelationshipData } from './useRelationshipActions'
import { useCommentActions, type CreateCommentData, type UpdateCommentData } from './useCommentActions'
import { useMapActions } from './useMapActions'
import { useUndoStore, generateCommandId, generateOperationId } from '@/stores/undoStore'
import type {
  CreateConceptCommand,
  UpdateConceptCommand,
  DeleteConceptCommand,
  CreateRelationshipCommand,
  UpdateRelationshipCommand,
  ReverseRelationshipCommand,
  DeleteRelationshipCommand,
  CreateCommentCommand,
  UpdateCommentCommand,
  DeleteCommentCommand,
  LinkCommentToConceptCommand,
  UnlinkCommentFromConceptCommand,
  UpdateMapCommand,
} from '@/stores/undoStore'

/**
 * Hook for canvas commands with undo tracking.
 * 
 * Wraps all action hooks and automatically records them as commands for undo/redo.
 * Commands are grouped into operations for better undo behavior.
 * 
 * @returns Object containing wrapped command functions
 */
export function useCanvasCommands() {
  const {
    createConcept: createConceptAction,
    updateConcept: updateConceptAction,
    deleteConcept: deleteConceptAction,
  } = useConceptActions()

  const {
    createRelationship: createRelationshipAction,
    updateRelationship: updateRelationshipAction,
    reverseRelationship: reverseRelationshipAction,
    deleteRelationship: deleteRelationshipAction,
  } = useRelationshipActions()

  const {
    createComment: createCommentAction,
    updateComment: updateCommentAction,
    deleteComment: deleteCommentAction,
    linkCommentToConcept: linkCommentToConceptAction,
    unlinkCommentFromConcept: unlinkCommentFromConceptAction,
  } = useCommentActions()

  const {
    updateMap: updateMapAction,
  } = useMapActions()

  const {
    recordMutation,
    startOperation,
    endOperation,
  } = useUndoStore()

  /**
   * Create a new concept with command tracking.
   * Generates the concept ID before creating so it can be stored in the command for undo.
   */
  const createConcept = useCallback(
    async (data: CreateConceptData) => {
      try {
        // Generate ID before creating so we can store it in the command
        const conceptId = id()
        
        // Create the concept with the generated ID
        await createConceptAction(data, conceptId)
        
        // Record command for undo with the concept ID
        const command: CreateConceptCommand = {
          type: 'createConcept',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          data,
          conceptId,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to create concept:', error)
        throw error
      }
    },
    [createConceptAction, recordMutation]
  )

  /**
   * Update a concept with command tracking.
   * 
   * @param conceptId - ID of the concept to update
   * @param updates - Partial concept data to update
   * @param previousState - Optional previous state for undo support. If not provided,
   *                        the command will be recorded without previousState (undo may not work properly).
   */
  const updateConcept = useCallback(
    async (
      conceptId: string,
      updates: UpdateConceptData,
      previousState?: {
        label?: string
        position?: { x: number; y: number }
        notes?: string
        metadata?: Record<string, unknown>
        showNotesAndMetadata?: boolean
        userPlaced?: boolean
      }
    ) => {
      try {
        await updateConceptAction(conceptId, updates)
        
        // Record command for undo
        const command: UpdateConceptCommand = {
          type: 'updateConcept',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          conceptId,
          updates,
          previousState,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to update concept:', error)
        throw error
      }
    },
    [updateConceptAction, recordMutation]
  )

  /**
   * Delete a concept with command tracking.
   */
  const deleteConcept = useCallback(
    async (conceptId: string) => {
      try {
        await deleteConceptAction(conceptId)
        
        // Record command for undo (also record in deletion history for backward compatibility)
        const command: DeleteConceptCommand = {
          type: 'deleteConcept',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          conceptId,
        }
        recordMutation(command)
        
        // Also record in deletion history for backward compatibility with existing undo system
        useUndoStore.getState().recordDeletion('concept', conceptId)
      } catch (error) {
        console.error('Failed to delete concept:', error)
        throw error
      }
    },
    [deleteConceptAction, recordMutation]
  )

  /**
   * Create a new relationship with command tracking.
   * Generates the relationship ID before creating so it can be stored in the command for undo.
   */
  const createRelationship = useCallback(
    async (data: CreateRelationshipData) => {
      try {
        // Generate ID before creating so we can store it in the command
        const relationshipId = id()
        
        // Create the relationship with the generated ID
        await createRelationshipAction(data, relationshipId)
        
        // Record command for undo with the relationship ID
        const command: CreateRelationshipCommand = {
          type: 'createRelationship',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          data,
          relationshipId,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to create relationship:', error)
        throw error
      }
    },
    [createRelationshipAction, recordMutation]
  )

  /**
   * Update a relationship with command tracking.
   * 
   * @param relationshipId - ID of the relationship to update
   * @param updates - Partial relationship data to update
   * @param previousState - Optional previous state for undo support. If not provided,
   *                        the command will be recorded without previousState (undo may not work properly).
   */
  const updateRelationship = useCallback(
    async (
      relationshipId: string,
      updates: UpdateRelationshipData,
      previousState?: {
        primaryLabel?: string
        reverseLabel?: string
        notes?: string
        metadata?: Record<string, unknown>
      }
    ) => {
      try {
        await updateRelationshipAction(relationshipId, updates)
        
        // Record command for undo
        const command: UpdateRelationshipCommand = {
          type: 'updateRelationship',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          relationshipId,
          updates,
          previousState,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to update relationship:', error)
        throw error
      }
    },
    [updateRelationshipAction, recordMutation]
  )

  /**
   * Reverse a relationship's direction with command tracking.
   */
  const reverseRelationship = useCallback(
    async (
      relationshipId: string,
      relationship: {
        fromConceptId: string
        toConceptId: string
        primaryLabel: string
        reverseLabel: string
      }
    ) => {
      try {
        // Store previous state for undo
        const previousState = {
          fromConceptId: relationship.fromConceptId,
          toConceptId: relationship.toConceptId,
          primaryLabel: relationship.primaryLabel,
          reverseLabel: relationship.reverseLabel,
        }

        await reverseRelationshipAction(relationshipId, relationship)

        // Record command for undo
        const command: ReverseRelationshipCommand = {
          type: 'reverseRelationship',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          relationshipId,
          previousState,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to reverse relationship:', error)
        throw error
      }
    },
    [reverseRelationshipAction, recordMutation]
  )

  /**
   * Delete a relationship with command tracking.
   */
  const deleteRelationship = useCallback(
    async (relationshipId: string) => {
      try {
        await deleteRelationshipAction(relationshipId)
        
        // Record command for undo
        const command: DeleteRelationshipCommand = {
          type: 'deleteRelationship',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          relationshipId,
        }
        recordMutation(command)
        
        // Also record in deletion history for backward compatibility
        useUndoStore.getState().recordDeletion('relationship', relationshipId)
      } catch (error) {
        console.error('Failed to delete relationship:', error)
        throw error
      }
    },
    [deleteRelationshipAction, recordMutation]
  )

  /**
   * Create a new comment with command tracking.
   * Generates the comment ID before creating so it can be stored in the command for undo.
   */
  const createComment = useCallback(
    async (data: CreateCommentData) => {
      try {
        // Generate ID before creating so we can store it in the command
        const commentId = id()
        
        // Create the comment with the generated ID
        await createCommentAction(data, commentId)
        
        // Record command for undo with the comment ID
        const command: CreateCommentCommand = {
          type: 'createComment',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          data,
          commentId,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to create comment:', error)
        throw error
      }
    },
    [createCommentAction, recordMutation]
  )

  /**
   * Update a comment with command tracking.
   * 
   * @param commentId - ID of the comment to update
   * @param updates - Partial comment data to update
   * @param previousState - Optional previous state for undo support. If not provided,
   *                        the command will be recorded without previousState (undo may not work properly).
   */
  const updateComment = useCallback(
    async (
      commentId: string,
      updates: UpdateCommentData,
      previousState?: {
        text?: string
        position?: { x: number; y: number }
        userPlaced?: boolean
      }
    ) => {
      try {
        await updateCommentAction(commentId, updates)
        
        // Record command for undo
        const command: UpdateCommentCommand = {
          type: 'updateComment',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          commentId,
          updates,
          previousState,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to update comment:', error)
        throw error
      }
    },
    [updateCommentAction, recordMutation]
  )

  /**
   * Delete a comment with command tracking.
   */
  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteCommentAction(commentId)
        
        // Record command for undo
        const command: DeleteCommentCommand = {
          type: 'deleteComment',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          commentId,
        }
        recordMutation(command)
        
        // Also record in deletion history for backward compatibility
        useUndoStore.getState().recordDeletion('comment', commentId)
      } catch (error) {
        console.error('Failed to delete comment:', error)
        throw error
      }
    },
    [deleteCommentAction, recordMutation]
  )

  /**
   * Link a comment to a concept with command tracking.
   */
  const linkCommentToConcept = useCallback(
    async (commentId: string, conceptId: string) => {
      try {
        await linkCommentToConceptAction(commentId, conceptId)
        
        // Record command for undo
        const command: LinkCommentToConceptCommand = {
          type: 'linkCommentToConcept',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          commentId,
          conceptId,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to link comment to concept:', error)
        throw error
      }
    },
    [linkCommentToConceptAction, recordMutation]
  )

  /**
   * Unlink a comment from a concept with command tracking.
   */
  const unlinkCommentFromConcept = useCallback(
    async (commentId: string, conceptId: string) => {
      try {
        await unlinkCommentFromConceptAction(commentId, conceptId)
        
        // Record command for undo
        const command: UnlinkCommentFromConceptCommand = {
          type: 'unlinkCommentFromConcept',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          commentId,
          conceptId,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to unlink comment from concept:', error)
        throw error
      }
    },
    [unlinkCommentFromConceptAction, recordMutation]
  )

  /**
   * Update a map with command tracking.
   */
  const updateMap = useCallback(
    async (
      mapId: string,
      updates: { name?: string; layoutAlgorithm?: string },
      previousState?: { name?: string; layoutAlgorithm?: string }
    ) => {
      try {
        await updateMapAction(mapId, updates)
        
        // Record command for undo
        const command: UpdateMapCommand = {
          type: 'updateMap',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          mapId,
          updates,
          previousState,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to update map:', error)
        throw error
      }
    },
    [updateMapAction, recordMutation]
  )

  return {
    // Concept commands
    createConcept,
    updateConcept,
    deleteConcept,
    
    // Relationship commands
    createRelationship,
    updateRelationship,
    reverseRelationship,
    deleteRelationship,
    
    // Comment commands
    createComment,
    updateComment,
    deleteComment,
    linkCommentToConcept,
    unlinkCommentFromConcept,
    
    // Map commands
    updateMap,
    
    // Operation management
    startOperation,
    endOperation,
  }
}

/**
 * Canvas mutations hook.
 * 
 * Wraps all database mutations with undo tracking and operation grouping.
 * Provides a consistent mutation interface for the canvas component.
 * 
 * This hook implements the Command Pattern, where each mutation is recorded
 * as a command that can be executed and undone. Mutations are automatically
 * grouped into operations for better undo/redo behavior.
 */

import { useCallback } from 'react'
import { useConceptActions, type CreateConceptData, type UpdateConceptData } from './useConceptActions'
import { useRelationshipActions, type CreateRelationshipData, type UpdateRelationshipData } from './useRelationshipActions'
import { useCommentActions, type CreateCommentData, type UpdateCommentData } from './useCommentActions'
import { useMapActions } from './useMapActions'
import { useUndoStore } from '@/stores/undoStore'
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
 * Hook for canvas mutations with undo tracking.
 * 
 * Wraps all mutation actions and automatically records them for undo/redo.
 * Mutations are grouped into operations for better undo behavior.
 * 
 * @returns Object containing wrapped mutation functions
 */
export function useCanvasMutations() {
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
   * Create a new concept with undo tracking.
   */
  const createConcept = useCallback(
    async (data: CreateConceptData) => {
      try {
        await createConceptAction(data)
        
        // Record mutation for undo
        // Note: We don't have the generated conceptId here, but we can track by operation
        const command: CreateConceptCommand = {
          type: 'createConcept',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          data,
          conceptId: '', // Will be populated if needed for undo
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
   * Update a concept with undo tracking.
   * 
   * Records the mutation as a command for undo/redo functionality.
   * If previousState is provided, it will be stored in the command to enable
   * proper undo functionality.
   * 
   * @param conceptId - ID of the concept to update
   * @param updates - Partial concept data to update
   * @param previousState - Optional previous state to enable undo (should be provided when available)
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
        
        // Record mutation for undo with previous state if provided
        const command: UpdateConceptCommand = {
          type: 'updateConcept',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
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
   * Delete a concept with undo tracking.
   */
  const deleteConcept = useCallback(
    async (conceptId: string) => {
      try {
        await deleteConceptAction(conceptId)
        
        // Record mutation for undo (also record in deletion history for backward compatibility)
        const command: DeleteConceptCommand = {
          type: 'deleteConcept',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
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
   * Create a new relationship with undo tracking.
   */
  const createRelationship = useCallback(
    async (data: CreateRelationshipData) => {
      try {
        await createRelationshipAction(data)
        
        // Record mutation for undo
        const command: CreateRelationshipCommand = {
          type: 'createRelationship',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          data,
          relationshipId: '', // Will be populated if needed for undo
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
   * Update a relationship with undo tracking.
   */
  const updateRelationship = useCallback(
    async (relationshipId: string, updates: UpdateRelationshipData) => {
      try {
        await updateRelationshipAction(relationshipId, updates)
        
        // Record mutation for undo
        const command: UpdateRelationshipCommand = {
          type: 'updateRelationship',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          relationshipId,
          updates,
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
   * Reverse a relationship's direction with undo tracking.
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

        // Record mutation for undo
        const command: ReverseRelationshipCommand = {
          type: 'reverseRelationship',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
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
   * Delete a relationship with undo tracking.
   */
  const deleteRelationship = useCallback(
    async (relationshipId: string) => {
      try {
        await deleteRelationshipAction(relationshipId)
        
        // Record mutation for undo
        const command: DeleteRelationshipCommand = {
          type: 'deleteRelationship',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
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
   * Create a new comment with undo tracking.
   */
  const createComment = useCallback(
    async (data: CreateCommentData) => {
      try {
        await createCommentAction(data)
        
        // Record mutation for undo
        const command: CreateCommentCommand = {
          type: 'createComment',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          data,
          commentId: '', // Will be populated if needed for undo
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
   * Update a comment with undo tracking.
   */
  const updateComment = useCallback(
    async (commentId: string, updates: UpdateCommentData) => {
      try {
        await updateCommentAction(commentId, updates)
        
        // Record mutation for undo
        const command: UpdateCommentCommand = {
          type: 'updateComment',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          commentId,
          updates,
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
   * Delete a comment with undo tracking.
   */
  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        await deleteCommentAction(commentId)
        
        // Record mutation for undo
        const command: DeleteCommentCommand = {
          type: 'deleteComment',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
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
   * Link a comment to a concept with undo tracking.
   */
  const linkCommentToConcept = useCallback(
    async (commentId: string, conceptId: string) => {
      try {
        await linkCommentToConceptAction(commentId, conceptId)
        
        // Record mutation for undo
        const command: LinkCommentToConceptCommand = {
          type: 'linkCommentToConcept',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
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
   * Unlink a comment from a concept with undo tracking.
   */
  const unlinkCommentFromConcept = useCallback(
    async (commentId: string, conceptId: string) => {
      try {
        await unlinkCommentFromConceptAction(commentId, conceptId)
        
        // Record mutation for undo
        const command: UnlinkCommentFromConceptCommand = {
          type: 'unlinkCommentFromConcept',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
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
   * Update a map with undo tracking.
   */
  const updateMap = useCallback(
    async (
      mapId: string,
      updates: { name?: string; layoutAlgorithm?: string },
      previousState?: { name?: string; layoutAlgorithm?: string }
    ) => {
      try {
        await updateMapAction(mapId, updates)
        
        // Record mutation for undo
        const command: UpdateMapCommand = {
          type: 'updateMap',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
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
    // Concept mutations
    createConcept,
    updateConcept,
    deleteConcept,
    
    // Relationship mutations
    createRelationship,
    updateRelationship,
    reverseRelationship,
    deleteRelationship,
    
    // Comment mutations
    createComment,
    updateComment,
    deleteComment,
    linkCommentToConcept,
    unlinkCommentFromConcept,
    
    // Map mutations
    updateMap,
    
    // Operation management
    startOperation,
    endOperation,
  }
}


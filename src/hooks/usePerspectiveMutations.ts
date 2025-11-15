/**
 * Perspective mutations hook.
 * 
 * Wraps all perspective mutations with undo tracking and operation grouping.
 * Provides a consistent mutation interface for perspective operations.
 * 
 * This hook implements the Command Pattern, where each mutation is recorded
 * as a command that can be executed and undone. Mutations are automatically
 * grouped into operations for better undo/redo behavior.
 */

import { useCallback } from 'react'
import { id } from '@/lib/instant'
import { usePerspectiveActions, type CreatePerspectiveData, type UpdatePerspectiveData } from './usePerspectiveActions'
import { useUndoStore, generateCommandId, generateOperationId } from '@/stores/undoStore'
import type {
  CreatePerspectiveCommand,
  UpdatePerspectiveCommand,
  DeletePerspectiveCommand,
  ToggleConceptInPerspectiveCommand,
  ToggleRelationshipInPerspectiveCommand,
} from '@/stores/undoStore'

/**
 * Hook for perspective mutations with undo tracking.
 * 
 * Wraps all perspective mutation actions and automatically records them for undo/redo.
 * Mutations are grouped into operations for better undo behavior.
 * 
 * @returns Object containing wrapped perspective mutation functions
 */
export function usePerspectiveMutations() {
  const {
    createPerspective: createPerspectiveAction,
    updatePerspective: updatePerspectiveAction,
    deletePerspective: deletePerspectiveAction,
    toggleConceptInPerspective: toggleConceptInPerspectiveAction,
    toggleRelationshipInPerspective: toggleRelationshipInPerspectiveAction,
  } = usePerspectiveActions()

  const {
    recordMutation,
    startOperation,
    endOperation,
  } = useUndoStore()

  /**
   * Create a new perspective with undo tracking.
   * Generates the perspective ID before creating so it can be stored in the command for undo.
   */
  const createPerspective = useCallback(
    async (data: CreatePerspectiveData) => {
      try {
        // Generate ID before creating so we can store it in the command
        const perspectiveId = id()
        
        // Create the perspective with the generated ID
        await createPerspectiveAction(data, perspectiveId)
        
        // Record mutation for undo with the perspective ID
        const command: CreatePerspectiveCommand = {
          type: 'createPerspective',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          perspectiveId,
          mapId: data.mapId,
          name: data.name,
          conceptIds: data.conceptIds || [],
          relationshipIds: data.relationshipIds || [],
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to create perspective:', error)
        throw error
      }
    },
    [createPerspectiveAction, recordMutation]
  )

  /**
   * Update a perspective with undo tracking.
   * 
   * @param perspectiveId - ID of the perspective to update
   * @param updates - Partial perspective data to update
   * @param previousState - Optional previous state for undo support. If not provided,
   *                        the mutation will be recorded without previousState (undo may not work properly).
   */
  const updatePerspective = useCallback(
    async (
      perspectiveId: string,
      updates: UpdatePerspectiveData,
      previousState?: {
        name?: string
        conceptIds?: string[]
        relationshipIds?: string[]
      }
    ) => {
      try {
        await updatePerspectiveAction(perspectiveId, updates)
        
        // Record mutation for undo
        const command: UpdatePerspectiveCommand = {
          type: 'updatePerspective',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          perspectiveId,
          updates,
          previousState,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to update perspective:', error)
        throw error
      }
    },
    [updatePerspectiveAction, recordMutation]
  )

  /**
   * Delete a perspective with undo tracking.
   * Captures previous state before deletion for undo support.
   */
  const deletePerspective = useCallback(
    async (
      perspectiveId: string,
      previousState: {
        mapId: string
        name: string
        conceptIds: string[]
        relationshipIds: string[]
      }
    ) => {
      try {
        await deletePerspectiveAction(perspectiveId)
        
        // Record mutation for undo
        const command: DeletePerspectiveCommand = {
          type: 'deletePerspective',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          perspectiveId,
          previousState,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to delete perspective:', error)
        throw error
      }
    },
    [deletePerspectiveAction, recordMutation]
  )

  /**
   * Toggle a concept's inclusion in a perspective with undo tracking.
   */
  const toggleConceptInPerspective = useCallback(
    async (
      perspectiveId: string,
      conceptId: string,
      currentConceptIds: string[],
      currentRelationshipIds: string[],
      allRelationships: Array<{ id: string; fromConceptId: string; toConceptId: string }>
    ) => {
      try {
        // Store previous state before toggling
        const wasIncluded = currentConceptIds.includes(conceptId)
        const previousConceptIds = [...currentConceptIds]
        const previousRelationshipIds = [...currentRelationshipIds]

        await toggleConceptInPerspectiveAction(
          perspectiveId,
          conceptId,
          currentConceptIds,
          currentRelationshipIds,
          allRelationships
        )
        
        // Record mutation for undo
        const command: ToggleConceptInPerspectiveCommand = {
          type: 'toggleConceptInPerspective',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          perspectiveId,
          conceptId,
          wasIncluded,
          previousConceptIds,
          previousRelationshipIds,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to toggle concept in perspective:', error)
        throw error
      }
    },
    [toggleConceptInPerspectiveAction, recordMutation]
  )

  /**
   * Toggle a relationship's inclusion in a perspective with undo tracking.
   */
  const toggleRelationshipInPerspective = useCallback(
    async (
      perspectiveId: string,
      relationshipId: string,
      currentRelationshipIds: string[]
    ) => {
      try {
        // Store previous state before toggling
        const wasIncluded = currentRelationshipIds.includes(relationshipId)
        const previousRelationshipIds = [...currentRelationshipIds]

        await toggleRelationshipInPerspectiveAction(
          perspectiveId,
          relationshipId,
          currentRelationshipIds
        )
        
        // Record mutation for undo
        const command: ToggleRelationshipInPerspectiveCommand = {
          type: 'toggleRelationshipInPerspective',
          id: generateCommandId(),
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || generateOperationId(),
          perspectiveId,
          relationshipId,
          wasIncluded,
          previousRelationshipIds,
        }
        recordMutation(command)
      } catch (error) {
        console.error('Failed to toggle relationship in perspective:', error)
        throw error
      }
    },
    [toggleRelationshipInPerspectiveAction, recordMutation]
  )

  return {
    createPerspective,
    updatePerspective,
    deletePerspective,
    toggleConceptInPerspective,
    toggleRelationshipInPerspective,
    
    // Operation management
    startOperation,
    endOperation,
  }
}

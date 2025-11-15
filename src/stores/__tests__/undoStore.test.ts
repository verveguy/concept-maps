/**
 * Tests for undo store mutation tracking.
 * Verifies mutation history management functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useUndoStore } from '../undoStore'
import type {
  CreateConceptCommand,
  UpdateConceptCommand,
  DeleteConceptCommand,
  CreateRelationshipCommand,
  CreateCommentCommand,
} from '../undoStore'

describe('undoStore mutation tracking', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUndoStore.getState().clearHistory()
    useUndoStore.getState().clearMutationHistory()
    useUndoStore.getState().clearRedoStack()
    useUndoStore.getState().endOperation()
  })

  describe('recordMutation', () => {
    it('should record a mutation command', () => {
      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'Test Concept',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      useUndoStore.getState().recordMutation(command)
      const history = useUndoStore.getState().mutationHistory

      expect(history.length).toBe(1)
      expect(history[0]).toEqual(command)
    })

    it('should add mutations to the beginning of history', () => {
      const command1: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      const command2: UpdateConceptCommand = {
        type: 'updateConcept',
        id: 'cmd-2',
        timestamp: Date.now() + 1000,
        operationId: 'op-1',
        conceptId: 'concept-1',
        updates: { label: 'Updated Concept' },
      }

      useUndoStore.getState().recordMutation(command1)
      useUndoStore.getState().recordMutation(command2)

      const history = useUndoStore.getState().mutationHistory

      expect(history.length).toBe(2)
      expect(history[0]).toEqual(command2) // Most recent first
      expect(history[1]).toEqual(command1)
    })

    it('should limit history size to MAX_MUTATION_HISTORY_SIZE', () => {
      const MAX_SIZE = 100
      
      // Create more mutations than the max
      for (let i = 0; i < MAX_SIZE + 10; i++) {
        const command: CreateConceptCommand = {
          type: 'createConcept',
          id: `cmd-${i}`,
          timestamp: Date.now() + i,
          operationId: 'op-1',
          data: {
            mapId: 'map-1',
            label: `Concept ${i}`,
            position: { x: 100, y: 200 },
          },
          conceptId: `concept-${i}`,
        }
        useUndoStore.getState().recordMutation(command)
      }

      const history = useUndoStore.getState().mutationHistory
      expect(history.length).toBe(MAX_SIZE)
      // Most recent should be first
      expect(history[0].id).toBe(`cmd-${MAX_SIZE + 9}`)
    })

    it('should clear redo stack when recording new mutations', () => {
      // Add something to redo stack
      const redoCommand: CreateConceptCommand = {
        type: 'createConcept',
        id: 'redo-cmd-1',
        timestamp: Date.now(),
        operationId: 'redo-op-1',
        data: {
          mapId: 'map-1',
          label: 'Redo Concept',
          position: { x: 100, y: 200 },
        },
        conceptId: 'redo-concept-1',
      }
      useUndoStore.getState().pushToRedoStack([redoCommand])
      expect(useUndoStore.getState().redoStack.length).toBe(1)

      // Record a new mutation
      const newCommand: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'New Concept',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }
      useUndoStore.getState().recordMutation(newCommand)

      // Redo stack should be cleared
      expect(useUndoStore.getState().redoStack.length).toBe(0)
      // Mutation history should have the new command
      expect(useUndoStore.getState().mutationHistory.length).toBe(1)
    })
  })

  describe('getMostRecentMutationOperation', () => {
    it('should return empty array when no mutations exist', () => {
      const operation = useUndoStore.getState().getMostRecentMutationOperation()
      expect(operation).toEqual([])
    })

    it('should return all mutations with the same operation ID', () => {
      const operationId = 'op-1'

      const command1: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId,
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      const command2: CreateRelationshipCommand = {
        type: 'createRelationship',
        id: 'cmd-2',
        timestamp: Date.now() + 100,
        operationId,
        data: {
          mapId: 'map-1',
          fromConceptId: 'concept-1',
          toConceptId: 'concept-2',
          primaryLabel: 'related to',
        },
        relationshipId: 'rel-1',
      }

      const command3: CreateCommentCommand = {
        type: 'createComment',
        id: 'cmd-3',
        timestamp: Date.now() + 200,
        operationId: 'op-2', // Different operation
        data: {
          mapId: 'map-1',
          text: 'Comment',
          position: { x: 200, y: 300 },
        },
        commentId: 'comment-1',
      }

      useUndoStore.getState().recordMutation(command1)
      useUndoStore.getState().recordMutation(command2)
      useUndoStore.getState().recordMutation(command3)

      const operation = useUndoStore.getState().getMostRecentMutationOperation()

      expect(operation.length).toBe(1)
      expect(operation[0]).toEqual(command3) // Most recent operation
    })

    it('should return all mutations from the most recent operation', () => {
      const operationId1 = 'op-1'
      const operationId2 = 'op-2'

      // Operation 1 mutations
      const cmd1: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: operationId1,
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      const cmd2: CreateRelationshipCommand = {
        type: 'createRelationship',
        id: 'cmd-2',
        timestamp: Date.now() + 100,
        operationId: operationId1,
        data: {
          mapId: 'map-1',
          fromConceptId: 'concept-1',
          toConceptId: 'concept-2',
          primaryLabel: 'related to',
        },
        relationshipId: 'rel-1',
      }

      // Operation 2 mutations
      const cmd3: DeleteConceptCommand = {
        type: 'deleteConcept',
        id: 'cmd-3',
        timestamp: Date.now() + 200,
        operationId: operationId2,
        conceptId: 'concept-3',
      }

      useUndoStore.getState().recordMutation(cmd1)
      useUndoStore.getState().recordMutation(cmd2)
      useUndoStore.getState().recordMutation(cmd3)

      const operation = useUndoStore.getState().getMostRecentMutationOperation()

      expect(operation.length).toBe(1)
      expect(operation[0].operationId).toBe(operationId2)
      expect(operation[0]).toEqual(cmd3)
    })
  })

  describe('removeMostRecentMutationOperation', () => {
    it('should do nothing when no mutations exist', () => {
      useUndoStore.getState().removeMostRecentMutationOperation()
      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
    })

    it('should remove all mutations from the most recent operation', () => {
      const operationId1 = 'op-1'
      const operationId2 = 'op-2'

      const cmd1: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: operationId1,
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      const cmd2: CreateRelationshipCommand = {
        type: 'createRelationship',
        id: 'cmd-2',
        timestamp: Date.now() + 100,
        operationId: operationId1,
        data: {
          mapId: 'map-1',
          fromConceptId: 'concept-1',
          toConceptId: 'concept-2',
          primaryLabel: 'related to',
        },
        relationshipId: 'rel-1',
      }

      const cmd3: DeleteConceptCommand = {
        type: 'deleteConcept',
        id: 'cmd-3',
        timestamp: Date.now() + 200,
        operationId: operationId2,
        conceptId: 'concept-3',
      }

      useUndoStore.getState().recordMutation(cmd1)
      useUndoStore.getState().recordMutation(cmd2)
      useUndoStore.getState().recordMutation(cmd3)

      useUndoStore.getState().removeMostRecentMutationOperation()

      const history = useUndoStore.getState().mutationHistory
      expect(history.length).toBe(2)
      expect(history[0]).toEqual(cmd2)
      expect(history[1]).toEqual(cmd1)
    })
  })

  describe('clearMutationHistory', () => {
    it('should clear all mutation history', () => {
      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      useUndoStore.getState().recordMutation(command)
      expect(useUndoStore.getState().mutationHistory.length).toBe(1)

      useUndoStore.getState().clearMutationHistory()
      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
    })
  })

  describe('operation grouping', () => {
    it('should use currentOperationId when recording mutations', () => {
      useUndoStore.getState().startOperation()
      
      // Get the operation ID that was set by startOperation
      const state = useUndoStore.getState()
      const currentOpId = state.currentOperationId

      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: currentOpId || 'op-fallback',
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      useUndoStore.getState().recordMutation(command)

      const operation = useUndoStore.getState().getMostRecentMutationOperation()
      expect(operation.length).toBe(1)
      expect(operation[0].operationId).toBe(currentOpId)
    })
  })

  describe('redo stack', () => {
    it('should push operation to redo stack', () => {
      const command1: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      const command2: UpdateConceptCommand = {
        type: 'updateConcept',
        id: 'cmd-2',
        timestamp: Date.now() + 100,
        operationId: 'op-1',
        conceptId: 'concept-1',
        updates: { label: 'Updated' },
      }

      useUndoStore.getState().pushToRedoStack([command1, command2])

      const redoStack = useUndoStore.getState().redoStack
      expect(redoStack.length).toBe(2)
      expect(redoStack[0]).toEqual(command1)
      expect(redoStack[1]).toEqual(command2)
    })

    it('should get most recent redo operation', () => {
      const operationId1 = 'op-1'
      const operationId2 = 'op-2'

      const cmd1: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: operationId1,
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      const cmd2: CreateRelationshipCommand = {
        type: 'createRelationship',
        id: 'cmd-2',
        timestamp: Date.now() + 100,
        operationId: operationId1,
        data: {
          mapId: 'map-1',
          fromConceptId: 'concept-1',
          toConceptId: 'concept-2',
          primaryLabel: 'related to',
        },
        relationshipId: 'rel-1',
      }

      const cmd3: DeleteConceptCommand = {
        type: 'deleteConcept',
        id: 'cmd-3',
        timestamp: Date.now() + 200,
        operationId: operationId2,
        conceptId: 'concept-3',
      }

      useUndoStore.getState().pushToRedoStack([cmd1, cmd2])
      useUndoStore.getState().pushToRedoStack([cmd3])

      const operation = useUndoStore.getState().getMostRecentRedoOperation()
      expect(operation.length).toBe(1)
      expect(operation[0].operationId).toBe(operationId2)
      expect(operation[0]).toEqual(cmd3)
    })

    it('should return empty array when redo stack is empty', () => {
      const operation = useUndoStore.getState().getMostRecentRedoOperation()
      expect(operation).toEqual([])
    })

    it('should remove most recent redo operation', () => {
      const operationId1 = 'op-1'
      const operationId2 = 'op-2'

      const cmd1: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: operationId1,
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      const cmd2: CreateRelationshipCommand = {
        type: 'createRelationship',
        id: 'cmd-2',
        timestamp: Date.now() + 100,
        operationId: operationId1,
        data: {
          mapId: 'map-1',
          fromConceptId: 'concept-1',
          toConceptId: 'concept-2',
          primaryLabel: 'related to',
        },
        relationshipId: 'rel-1',
      }

      const cmd3: DeleteConceptCommand = {
        type: 'deleteConcept',
        id: 'cmd-3',
        timestamp: Date.now() + 200,
        operationId: operationId2,
        conceptId: 'concept-3',
      }

      useUndoStore.getState().pushToRedoStack([cmd1, cmd2])
      useUndoStore.getState().pushToRedoStack([cmd3])

      useUndoStore.getState().removeMostRecentRedoOperation()

      const redoStack = useUndoStore.getState().redoStack
      expect(redoStack.length).toBe(2)
      expect(redoStack[0]).toEqual(cmd1)
      expect(redoStack[1]).toEqual(cmd2)
    })

    it('should clear redo stack', () => {
      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      useUndoStore.getState().pushToRedoStack([command])
      expect(useUndoStore.getState().redoStack.length).toBe(1)

      useUndoStore.getState().clearRedoStack()
      expect(useUndoStore.getState().redoStack.length).toBe(0)
    })

    it('should limit redo stack size to MAX_MUTATION_HISTORY_SIZE', () => {
      const MAX_SIZE = 100
      
      // Create more commands than the max
      for (let i = 0; i < MAX_SIZE + 10; i++) {
        const command: CreateConceptCommand = {
          type: 'createConcept',
          id: `redo-cmd-${i}`,
          timestamp: Date.now() + i,
          operationId: 'op-1',
          data: {
            mapId: 'map-1',
            label: `Concept ${i}`,
            position: { x: 100, y: 200 },
          },
          conceptId: `concept-${i}`,
        }
        useUndoStore.getState().pushToRedoStack([command])
      }

      const redoStack = useUndoStore.getState().redoStack
      expect(redoStack.length).toBe(MAX_SIZE)
      // Most recent should be first
      expect(redoStack[0].id).toBe(`redo-cmd-${MAX_SIZE + 9}`)
    })
  })

  describe('canUndo and canRedo', () => {
    it('should return false when no mutations exist', () => {
      expect(useUndoStore.getState().canUndo()).toBe(false)
    })

    it('should return true when mutations exist', () => {
      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      useUndoStore.getState().recordMutation(command)
      expect(useUndoStore.getState().canUndo()).toBe(true)
    })

    it('should return false when redo stack is empty', () => {
      expect(useUndoStore.getState().canRedo()).toBe(false)
    })

    it('should return true when redo stack has items', () => {
      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'Concept 1',
          position: { x: 100, y: 200 },
        },
        conceptId: 'concept-1',
      }

      useUndoStore.getState().pushToRedoStack([command])
      expect(useUndoStore.getState().canRedo()).toBe(true)
    })
  })
})


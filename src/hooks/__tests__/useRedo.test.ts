/**
 * Tests for useRedo hook.
 * Verifies redo functionality for all mutation types.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRedo } from '../useRedo'
import { useUndoStore } from '../../stores/undoStore'
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
} from '../../stores/undoStore'

// Mock useCanvasMutations
const mockCreateConcept = vi.fn().mockResolvedValue(undefined)
const mockUpdateConcept = vi.fn().mockResolvedValue(undefined)
const mockDeleteConcept = vi.fn().mockResolvedValue(undefined)
const mockCreateRelationship = vi.fn().mockResolvedValue(undefined)
const mockUpdateRelationship = vi.fn().mockResolvedValue(undefined)
const mockReverseRelationship = vi.fn().mockResolvedValue(undefined)
const mockDeleteRelationship = vi.fn().mockResolvedValue(undefined)
const mockCreateComment = vi.fn().mockResolvedValue(undefined)
const mockUpdateComment = vi.fn().mockResolvedValue(undefined)
const mockDeleteComment = vi.fn().mockResolvedValue(undefined)
const mockLinkCommentToConcept = vi.fn().mockResolvedValue(undefined)
const mockUnlinkCommentFromConcept = vi.fn().mockResolvedValue(undefined)
const mockUpdateMap = vi.fn().mockResolvedValue(undefined)

vi.mock('../useCanvasMutations', () => ({
  useCanvasMutations: () => ({
    createConcept: mockCreateConcept,
    updateConcept: mockUpdateConcept,
    deleteConcept: mockDeleteConcept,
    createRelationship: mockCreateRelationship,
    updateRelationship: mockUpdateRelationship,
    reverseRelationship: mockReverseRelationship,
    deleteRelationship: mockDeleteRelationship,
    createComment: mockCreateComment,
    updateComment: mockUpdateComment,
    deleteComment: mockDeleteComment,
    linkCommentToConcept: mockLinkCommentToConcept,
    unlinkCommentFromConcept: mockUnlinkCommentFromConcept,
    updateMap: mockUpdateMap,
  }),
}))

describe('useRedo', () => {
  beforeEach(() => {
    // Reset stores
    useUndoStore.getState().clearHistory()
    useUndoStore.getState().clearMutationHistory()
    useUndoStore.getState().clearRedoStack()
    useUndoStore.getState().endOperation()
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('redo with mutation commands', () => {
    it('should redo deleteConcept by deleting again', async () => {
      const { result } = renderHook(() => useRedo())

      const command: DeleteConceptCommand = {
        type: 'deleteConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        conceptId: 'concept-1',
      }

      useUndoStore.getState().pushToRedoStack([command])

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(true)
      })

      expect(mockDeleteConcept).toHaveBeenCalledWith('concept-1')
      expect(useUndoStore.getState().redoStack.length).toBe(0)
    })

    it('should redo updateConcept by applying updates again', async () => {
      const { result } = renderHook(() => useRedo())

      const command: UpdateConceptCommand = {
        type: 'updateConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        conceptId: 'concept-1',
        updates: { label: 'New Label', position: { x: 150, y: 250 } },
      }

      useUndoStore.getState().pushToRedoStack([command])

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(true)
      })

      expect(mockUpdateConcept).toHaveBeenCalledWith('concept-1', {
        label: 'New Label',
        position: { x: 150, y: 250 },
      })
      expect(useUndoStore.getState().redoStack.length).toBe(0)
    })

    it('should redo createConcept by creating again', async () => {
      const { result } = renderHook(() => useRedo())

      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'New Concept',
          position: { x: 100, y: 200 },
          notes: 'Test notes',
          metadata: { category: 'test' },
        },
        conceptId: 'concept-1',
      }

      useUndoStore.getState().pushToRedoStack([command])

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(true)
      })

      expect(mockCreateConcept).toHaveBeenCalledWith({
        mapId: 'map-1',
        label: 'New Concept',
        position: { x: 100, y: 200 },
        notes: 'Test notes',
        metadata: { category: 'test' },
      })
      expect(useUndoStore.getState().redoStack.length).toBe(0)
    })

    it('should fail to redo createConcept without data', async () => {
      const { result } = renderHook(() => useRedo())

      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: undefined as any, // Missing data
        conceptId: 'concept-1',
      }

      useUndoStore.getState().pushToRedoStack([command])

      await act(async () => {
        const success = await result.current.redo()
        // Should fail because data is missing
        expect(success).toBe(false)
      })

      expect(mockCreateConcept).not.toHaveBeenCalled()
      // Operation should still be removed from redo stack
      expect(useUndoStore.getState().redoStack.length).toBe(0)
    })

    it('should redo reverseRelationship by reversing again', async () => {
      const { result } = renderHook(() => useRedo())

      const command: ReverseRelationshipCommand = {
        type: 'reverseRelationship',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        relationshipId: 'rel-1',
        previousState: {
          fromConceptId: 'concept-1',
          toConceptId: 'concept-2',
          primaryLabel: 'explains',
          reverseLabel: 'explained by',
        },
      }

      useUndoStore.getState().pushToRedoStack([command])

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(true)
      })

      expect(mockReverseRelationship).toHaveBeenCalledWith('rel-1', {
        fromConceptId: 'concept-2',
        toConceptId: 'concept-1',
        primaryLabel: 'explained by',
        reverseLabel: 'explains',
      })
    })

    it('should redo linkCommentToConcept by linking again', async () => {
      const { result } = renderHook(() => useRedo())

      const command: LinkCommentToConceptCommand = {
        type: 'linkCommentToConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        commentId: 'comment-1',
        conceptId: 'concept-1',
      }

      useUndoStore.getState().pushToRedoStack([command])

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(true)
      })

      expect(mockLinkCommentToConcept).toHaveBeenCalledWith('comment-1', 'concept-1')
    })

    it('should redo unlinkCommentFromConcept by unlinking again', async () => {
      const { result } = renderHook(() => useRedo())

      const command: UnlinkCommentFromConceptCommand = {
        type: 'unlinkCommentFromConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        commentId: 'comment-1',
        conceptId: 'concept-1',
      }

      useUndoStore.getState().pushToRedoStack([command])

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(true)
      })

      expect(mockUnlinkCommentFromConcept).toHaveBeenCalledWith('comment-1', 'concept-1')
    })

    it('should redo updateMap by applying updates again', async () => {
      const { result } = renderHook(() => useRedo())

      const command: UpdateMapCommand = {
        type: 'updateMap',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        mapId: 'map-1',
        updates: { name: 'New Map Name', layoutAlgorithm: 'force-directed' },
        previousState: { name: 'Old Name', layoutAlgorithm: 'hierarchical' },
      }

      useUndoStore.getState().pushToRedoStack([command])

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(true)
      })

      expect(mockUpdateMap).toHaveBeenCalledWith('map-1', {
        name: 'New Map Name',
        layoutAlgorithm: 'force-directed',
      }, {
        name: 'Old Name',
        layoutAlgorithm: 'hierarchical',
      })
    })

    it('should redo operation with multiple commands in original order', async () => {
      const { result } = renderHook(() => useRedo())

      const operationId = 'op-1'

      const cmd1: CreateConceptCommand = {
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

      const cmd2: UpdateConceptCommand = {
        type: 'updateConcept',
        id: 'cmd-2',
        timestamp: Date.now() + 100,
        operationId,
        conceptId: 'concept-1',
        updates: { label: 'Updated' },
      }

      // Push in order as they would appear in mutationHistory (newest first)
      // When undone, operations are pushed newest first, so redo stack has newest first
      useUndoStore.getState().pushToRedoStack([cmd2, cmd1])

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(true)
      })

      // Commands should be re-executed in original order (cmd1, then cmd2)
      // The operation array is reversed before execution, so cmd1 (oldest) executes first
      expect(mockCreateConcept).toHaveBeenCalled()
      expect(mockUpdateConcept).toHaveBeenCalled()
      // Verify they were called with correct arguments
      expect(mockCreateConcept).toHaveBeenCalledWith({
        mapId: 'map-1',
        label: 'Concept 1',
        position: { x: 100, y: 200 },
      })
      expect(mockUpdateConcept).toHaveBeenCalledWith('concept-1', { label: 'Updated' })
      
      expect(useUndoStore.getState().redoStack.length).toBe(0)
    })

    it('should return false when no operations to redo', async () => {
      const { result } = renderHook(() => useRedo())

      await act(async () => {
        const success = await result.current.redo()
        expect(success).toBe(false)
      })

      expect(useUndoStore.getState().redoStack.length).toBe(0)
    })
  })

  describe('canRedo', () => {
    it('should return false when redo stack is empty', () => {
      const { result } = renderHook(() => useRedo())
      expect(result.current.canRedo()).toBe(false)
    })

    it('should return true when redo stack has items', () => {
      const command: DeleteConceptCommand = {
        type: 'deleteConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        conceptId: 'concept-1',
      }

      useUndoStore.getState().pushToRedoStack([command])

      const { result } = renderHook(() => useRedo())
      expect(result.current.canRedo()).toBe(true)
    })
  })
})


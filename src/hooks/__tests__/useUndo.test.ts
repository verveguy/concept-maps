/**
 * Tests for useUndo hook.
 * Verifies undo functionality for all mutation types.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUndo } from '../useUndo'
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
} from '../../stores/undoStore'

// Mock action hooks
const mockUndeleteConcept = vi.fn().mockResolvedValue(undefined)
const mockDeleteConcept = vi.fn().mockResolvedValue(undefined)
const mockUpdateConcept = vi.fn().mockResolvedValue(undefined)
const mockUndeleteRelationship = vi.fn().mockResolvedValue(undefined)
const mockDeleteRelationship = vi.fn().mockResolvedValue(undefined)
const mockUpdateRelationship = vi.fn().mockResolvedValue(undefined)
const mockReverseRelationship = vi.fn().mockResolvedValue(undefined)
const mockUndeleteComment = vi.fn().mockResolvedValue(undefined)
const mockDeleteComment = vi.fn().mockResolvedValue(undefined)
const mockUpdateComment = vi.fn().mockResolvedValue(undefined)
const mockLinkCommentToConcept = vi.fn().mockResolvedValue(undefined)
const mockUnlinkCommentFromConcept = vi.fn().mockResolvedValue(undefined)

vi.mock('../useConceptActions', () => ({
  useConceptActions: () => ({
    undeleteConcept: mockUndeleteConcept,
    deleteConcept: mockDeleteConcept,
    updateConcept: mockUpdateConcept,
  }),
}))

vi.mock('../useRelationshipActions', () => ({
  useRelationshipActions: () => ({
    undeleteRelationship: mockUndeleteRelationship,
    deleteRelationship: mockDeleteRelationship,
    updateRelationship: mockUpdateRelationship,
    reverseRelationship: mockReverseRelationship,
  }),
}))

vi.mock('../useCommentActions', () => ({
  useCommentActions: () => ({
    undeleteComment: mockUndeleteComment,
    deleteComment: mockDeleteComment,
    updateComment: mockUpdateComment,
    linkCommentToConcept: mockLinkCommentToConcept,
    unlinkCommentFromConcept: mockUnlinkCommentFromConcept,
  }),
}))

describe('useUndo', () => {
  beforeEach(() => {
    // Reset stores
    useUndoStore.getState().clearHistory()
    useUndoStore.getState().clearMutationHistory()
    useUndoStore.getState().clearRedoStack()
    useUndoStore.getState().endOperation()
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('undo with mutation commands', () => {
    it('should undo deleteConcept by undeleting', async () => {
      const { result } = renderHook(() => useUndo())

      const command: DeleteConceptCommand = {
        type: 'deleteConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        conceptId: 'concept-1',
      }

      useUndoStore.getState().recordMutation(command)

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(true)
      })

      expect(mockUndeleteConcept).toHaveBeenCalledWith('concept-1')
      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
      expect(useUndoStore.getState().redoStack.length).toBe(1)
    })

    it('should undo updateConcept by restoring previous state', async () => {
      const { result } = renderHook(() => useUndo())

      const command: UpdateConceptCommand = {
        type: 'updateConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        conceptId: 'concept-1',
        updates: { label: 'New Label' },
        previousState: {
          label: 'Old Label',
          position: { x: 100, y: 200 },
        },
      }

      useUndoStore.getState().recordMutation(command)

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(true)
      })

      expect(mockUpdateConcept).toHaveBeenCalledWith('concept-1', {
        label: 'Old Label',
        position: { x: 100, y: 200 },
      })
      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
      expect(useUndoStore.getState().redoStack.length).toBe(1)
    })

    it('should fail to undo updateConcept without previousState', async () => {
      const { result } = renderHook(() => useUndo())

      const command: UpdateConceptCommand = {
        type: 'updateConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        conceptId: 'concept-1',
        updates: { label: 'New Label' },
        // No previousState
      }

      useUndoStore.getState().recordMutation(command)

      await act(async () => {
        const success = await result.current.undo()
        // Should still succeed (operation moved to redo stack) but command reversal failed
        expect(success).toBe(true)
      })

      expect(mockUpdateConcept).not.toHaveBeenCalled()
      // Operation should still be moved to redo stack
      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
    })

    it('should undo createConcept by deleting', async () => {
      const { result } = renderHook(() => useUndo())

      const command: CreateConceptCommand = {
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

      useUndoStore.getState().recordMutation(command)

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(true)
      })

      expect(mockDeleteConcept).toHaveBeenCalledWith('concept-1')
      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
      expect(useUndoStore.getState().redoStack.length).toBe(1)
    })

    it('should fail to undo createConcept without conceptId', async () => {
      const { result } = renderHook(() => useUndo())

      const command: CreateConceptCommand = {
        type: 'createConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        data: {
          mapId: 'map-1',
          label: 'New Concept',
          position: { x: 100, y: 200 },
        },
        conceptId: '', // No conceptId
      }

      useUndoStore.getState().recordMutation(command)

      await act(async () => {
        const success = await result.current.undo()
        // Should still succeed (operation moved to redo stack) but command reversal failed
        expect(success).toBe(true)
      })

      expect(mockDeleteConcept).not.toHaveBeenCalled()
      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
    })

    it('should undo reverseRelationship by reversing again', async () => {
      const { result } = renderHook(() => useUndo())

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

      useUndoStore.getState().recordMutation(command)

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(true)
      })

      expect(mockReverseRelationship).toHaveBeenCalledWith('rel-1', {
        fromConceptId: 'concept-1',
        toConceptId: 'concept-2',
        primaryLabel: 'explains',
        reverseLabel: 'explained by',
      })
    })

    it('should undo linkCommentToConcept by unlinking', async () => {
      const { result } = renderHook(() => useUndo())

      const command: LinkCommentToConceptCommand = {
        type: 'linkCommentToConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        commentId: 'comment-1',
        conceptId: 'concept-1',
      }

      useUndoStore.getState().recordMutation(command)

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(true)
      })

      expect(mockUnlinkCommentFromConcept).toHaveBeenCalledWith('comment-1', 'concept-1')
    })

    it('should undo unlinkCommentFromConcept by linking', async () => {
      const { result } = renderHook(() => useUndo())

      const command: UnlinkCommentFromConceptCommand = {
        type: 'unlinkCommentFromConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        commentId: 'comment-1',
        conceptId: 'concept-1',
      }

      useUndoStore.getState().recordMutation(command)

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(true)
      })

      expect(mockLinkCommentToConcept).toHaveBeenCalledWith('comment-1', 'concept-1')
    })

    it('should undo operation with multiple commands', async () => {
      const { result } = renderHook(() => useUndo())

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
        previousState: { label: 'Original' },
      }

      useUndoStore.getState().recordMutation(cmd1)
      useUndoStore.getState().recordMutation(cmd2)

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(true)
      })

      // Commands should be reversed in reverse order (most recent first)
      // cmd2 (update) should be reversed first, then cmd1 (create)
      expect(mockUpdateConcept).toHaveBeenCalled()
      expect(mockDeleteConcept).toHaveBeenCalled()
      expect(mockUpdateConcept).toHaveBeenCalledWith('concept-1', { label: 'Original' })
      expect(mockDeleteConcept).toHaveBeenCalledWith('concept-1')
      
      // Operation should be moved to redo stack
      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
      expect(useUndoStore.getState().redoStack.length).toBe(2)
    })

    it('should return false when no operations to undo', async () => {
      const { result } = renderHook(() => useUndo())

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(false)
      })

      expect(useUndoStore.getState().mutationHistory.length).toBe(0)
      expect(useUndoStore.getState().redoStack.length).toBe(0)
    })
  })

  describe('undo with deletion history (backward compatibility)', () => {
    it('should undo deletions from deletion history', async () => {
      const { result } = renderHook(() => useUndo())

      useUndoStore.getState().recordDeletion('concept', 'concept-1')
      useUndoStore.getState().recordDeletion('relationship', 'rel-1')

      await act(async () => {
        const success = await result.current.undo()
        expect(success).toBe(true)
      })

      expect(mockUndeleteConcept).toHaveBeenCalledWith('concept-1')
      expect(mockUndeleteRelationship).toHaveBeenCalledWith('rel-1')
      expect(useUndoStore.getState().deletionHistory.length).toBe(0)
    })
  })

  describe('canUndo', () => {
    it('should return false when no mutations exist', () => {
      const { result } = renderHook(() => useUndo())
      expect(result.current.canUndo()).toBe(false)
    })

    it('should return true when mutations exist', () => {
      const command: DeleteConceptCommand = {
        type: 'deleteConcept',
        id: 'cmd-1',
        timestamp: Date.now(),
        operationId: 'op-1',
        conceptId: 'concept-1',
      }

      useUndoStore.getState().recordMutation(command)

      const { result } = renderHook(() => useUndo())
      expect(result.current.canUndo()).toBe(true)
    })
  })
})


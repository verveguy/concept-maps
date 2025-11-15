/**
 * Tests for useCanvasMutations hook.
 * Verifies that mutations are wrapped correctly and recorded for undo.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasMutations } from '../useCanvasMutations'
import { useUndoStore } from '../../stores/undoStore'

// Create mock functions
const mockCreateConcept = vi.fn().mockResolvedValue(undefined)
const mockUpdateConcept = vi.fn().mockResolvedValue(undefined)
const mockDeleteConcept = vi.fn().mockResolvedValue(undefined)
const mockCreateRelationship = vi.fn().mockResolvedValue(undefined)
const mockUpdateRelationship = vi.fn().mockResolvedValue(undefined)
const mockDeleteRelationship = vi.fn().mockResolvedValue(undefined)
const mockCreateComment = vi.fn().mockResolvedValue(undefined)
const mockUpdateComment = vi.fn().mockResolvedValue(undefined)
const mockDeleteComment = vi.fn().mockResolvedValue(undefined)
const mockLinkCommentToConcept = vi.fn().mockResolvedValue(undefined)
const mockUnlinkCommentFromConcept = vi.fn().mockResolvedValue(undefined)

// Mock the action hooks
vi.mock('../useConceptActions', () => ({
  useConceptActions: () => ({
    createConcept: mockCreateConcept,
    updateConcept: mockUpdateConcept,
    deleteConcept: mockDeleteConcept,
  }),
}))

vi.mock('../useRelationshipActions', () => ({
  useRelationshipActions: () => ({
    createRelationship: mockCreateRelationship,
    updateRelationship: mockUpdateRelationship,
    deleteRelationship: mockDeleteRelationship,
  }),
}))

vi.mock('../useCommentActions', () => ({
  useCommentActions: () => ({
    createComment: mockCreateComment,
    updateComment: mockUpdateComment,
    deleteComment: mockDeleteComment,
    linkCommentToConcept: mockLinkCommentToConcept,
    unlinkCommentFromConcept: mockUnlinkCommentFromConcept,
  }),
}))

describe('useCanvasMutations', () => {
  beforeEach(() => {
    // Reset stores
    useUndoStore.getState().clearHistory()
    useUndoStore.getState().clearMutationHistory()
    useUndoStore.getState().endOperation()
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('concept mutations', () => {
    it('should create a concept and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      const conceptData = {
        mapId: 'map-1',
        label: 'Test Concept',
        position: { x: 100, y: 200 },
        notes: 'Test notes',
        metadata: { category: 'test' },
      }

      await act(async () => {
        await result.current.createConcept(conceptData)
      })

      // Verify action was called with data and generated ID
      expect(mockCreateConcept).toHaveBeenCalledWith(
        conceptData,
        expect.any(String) // ID is generated before calling action
      )

      // Verify mutation was recorded with concept ID
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('createConcept')
      expect((mutations[0] as any).data).toEqual(conceptData)
      expect((mutations[0] as any).conceptId).toBeTruthy() // ID should be populated
    })

    it('should update a concept and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      const updates = {
        label: 'Updated Label',
        position: { x: 150, y: 250 },
      }

      await act(async () => {
        await result.current.updateConcept('concept-1', updates)
      })

      // Verify action was called
      expect(mockUpdateConcept).toHaveBeenCalledWith('concept-1', updates)

      // Verify mutation was recorded
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('updateConcept')
      expect((mutations[0] as any).conceptId).toBe('concept-1')
      expect((mutations[0] as any).updates).toEqual(updates)
    })

    it('should delete a concept and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      await act(async () => {
        await result.current.deleteConcept('concept-1')
      })

      // Verify action was called
      expect(mockDeleteConcept).toHaveBeenCalledWith('concept-1')

      // Verify mutation was recorded
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('deleteConcept')
      expect((mutations[0] as any).conceptId).toBe('concept-1')

      // Verify deletion was also recorded in deletion history (backward compatibility)
      const deletions = useUndoStore.getState().deletionHistory
      expect(deletions.length).toBe(1)
      expect(deletions[0].type).toBe('concept')
      expect(deletions[0].id).toBe('concept-1')
    })

    it('should handle create concept errors', async () => {
      const { result } = renderHook(() => useCanvasMutations())
      const error = new Error('Failed to create concept')
      mockCreateConcept.mockRejectedValueOnce(error)

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const conceptData = {
        mapId: 'map-1',
        label: 'Test Concept',
        position: { x: 100, y: 200 },
      }

      await act(async () => {
        await expect(result.current.createConcept(conceptData)).rejects.toThrow('Failed to create concept')
      })

      // Verify mutation was NOT recorded on error
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(0)

      // Restore console.error
      consoleSpy.mockRestore()
    })
  })

  describe('relationship mutations', () => {
    it('should create a relationship and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      const relationshipData = {
        mapId: 'map-1',
        fromConceptId: 'concept-1',
        toConceptId: 'concept-2',
        primaryLabel: 'explains',
        reverseLabel: 'explained by',
      }

      await act(async () => {
        await result.current.createRelationship(relationshipData)
      })

      // Verify action was called with data and generated ID
      expect(mockCreateRelationship).toHaveBeenCalledWith(
        relationshipData,
        expect.any(String) // ID is generated before calling action
      )

      // Verify mutation was recorded with relationship ID
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('createRelationship')
      expect((mutations[0] as any).data).toEqual(relationshipData)
      expect((mutations[0] as any).relationshipId).toBeTruthy() // ID should be populated
    })

    it('should update a relationship and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      const updates = {
        primaryLabel: 'updated label',
        reverseLabel: 'updated reverse',
      }

      await act(async () => {
        await result.current.updateRelationship('rel-1', updates)
      })

      // Verify action was called
      expect(mockUpdateRelationship).toHaveBeenCalledWith('rel-1', updates)

      // Verify mutation was recorded
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('updateRelationship')
      expect((mutations[0] as any).relationshipId).toBe('rel-1')
      expect((mutations[0] as any).updates).toEqual(updates)
    })

    it('should delete a relationship and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      await act(async () => {
        await result.current.deleteRelationship('rel-1')
      })

      // Verify action was called
      expect(mockDeleteRelationship).toHaveBeenCalledWith('rel-1')

      // Verify mutation was recorded
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('deleteRelationship')
      expect((mutations[0] as any).relationshipId).toBe('rel-1')

      // Verify deletion was also recorded
      const deletions = useUndoStore.getState().deletionHistory
      expect(deletions.length).toBe(1)
      expect(deletions[0].type).toBe('relationship')
      expect(deletions[0].id).toBe('rel-1')
    })
  })

  describe('comment mutations', () => {
    it('should create a comment and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      const commentData = {
        mapId: 'map-1',
        text: 'Test comment',
        position: { x: 100, y: 200 },
        conceptIds: ['concept-1'],
      }

      await act(async () => {
        await result.current.createComment(commentData)
      })

      // Verify action was called with data and generated ID
      expect(mockCreateComment).toHaveBeenCalledWith(
        commentData,
        expect.any(String) // ID is generated before calling action
      )

      // Verify mutation was recorded with comment ID
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('createComment')
      expect((mutations[0] as any).data).toEqual(commentData)
      expect((mutations[0] as any).commentId).toBeTruthy() // ID should be populated
    })

    it('should update a comment and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      const updates = {
        text: 'Updated comment',
        position: { x: 150, y: 250 },
      }

      await act(async () => {
        await result.current.updateComment('comment-1', updates)
      })

      // Verify action was called
      expect(mockUpdateComment).toHaveBeenCalledWith('comment-1', updates)

      // Verify mutation was recorded
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('updateComment')
      expect((mutations[0] as any).commentId).toBe('comment-1')
      expect((mutations[0] as any).updates).toEqual(updates)
    })

    it('should delete a comment and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      await act(async () => {
        await result.current.deleteComment('comment-1')
      })

      // Verify action was called
      expect(mockDeleteComment).toHaveBeenCalledWith('comment-1')

      // Verify mutation was recorded
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('deleteComment')
      expect((mutations[0] as any).commentId).toBe('comment-1')

      // Verify deletion was also recorded
      const deletions = useUndoStore.getState().deletionHistory
      expect(deletions.length).toBe(1)
      expect(deletions[0].type).toBe('comment')
      expect(deletions[0].id).toBe('comment-1')
    })

    it('should link comment to concept and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      await act(async () => {
        await result.current.linkCommentToConcept('comment-1', 'concept-1')
      })

      // Verify action was called
      expect(mockLinkCommentToConcept).toHaveBeenCalledWith('comment-1', 'concept-1')

      // Verify mutation was recorded
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('linkCommentToConcept')
      expect((mutations[0] as any).commentId).toBe('comment-1')
      expect((mutations[0] as any).conceptId).toBe('concept-1')
    })

    it('should unlink comment from concept and record mutation', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      await act(async () => {
        await result.current.unlinkCommentFromConcept('comment-1', 'concept-1')
      })

      // Verify action was called
      expect(mockUnlinkCommentFromConcept).toHaveBeenCalledWith('comment-1', 'concept-1')

      // Verify mutation was recorded
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].type).toBe('unlinkCommentFromConcept')
      expect((mutations[0] as any).commentId).toBe('comment-1')
      expect((mutations[0] as any).conceptId).toBe('concept-1')
    })
  })

  describe('operation management', () => {
    it('should provide startOperation and endOperation functions', () => {
      const { result } = renderHook(() => useCanvasMutations())

      expect(typeof result.current.startOperation).toBe('function')
      expect(typeof result.current.endOperation).toBe('function')
    })

    it('should use current operation ID when recording mutations', async () => {
      const { result } = renderHook(() => useCanvasMutations())

      // Start an operation
      await act(async () => {
        result.current.startOperation()
      })
      const operationId = useUndoStore.getState().currentOperationId
      expect(operationId).toBeTruthy()

      // Create a concept
      await act(async () => {
        await result.current.createConcept({
          mapId: 'map-1',
          label: 'Test Concept',
          position: { x: 100, y: 200 },
        })
      })

      // Verify mutation uses the operation ID
      const mutations = useUndoStore.getState().mutationHistory
      expect(mutations.length).toBe(1)
      expect(mutations[0].operationId).toBe(operationId)
    })
  })
})


/**
 * Tests for useCanvasNodeHandlers hook.
 * Verifies node event handling functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasNodeHandlers } from '../useCanvasNodeHandlers'
import { useCanvasMutations } from '../useCanvasMutations'
import { useCanvasStore } from '@/stores/canvasStore'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { useMapPermissions } from '../useMapPermissions'
import { usePresenceCursorSetter } from '../usePresenceCursorSetter'
import type { NodeChange } from 'reactflow'
import type { Concept, Comment, Relationship } from '@/lib/schema'

// Create shared mock functions
const mockGetLastUpdateTime = vi.fn(() => null)
const mockSetLastUpdateTime = vi.fn()

// Mock dependencies
vi.mock('../useCanvasMutations', () => ({
  useCanvasMutations: vi.fn(() => ({
    deleteConcept: vi.fn().mockResolvedValue(undefined),
    deleteComment: vi.fn().mockResolvedValue(undefined),
    deleteRelationship: vi.fn().mockResolvedValue(undefined),
    updateConcept: vi.fn().mockResolvedValue(undefined),
    updateComment: vi.fn().mockResolvedValue(undefined),
    startOperation: vi.fn(),
    endOperation: vi.fn(),
  })),
}))

vi.mock('../useMapPermissions', () => ({
  useMapPermissions: vi.fn(() => ({
    hasWriteAccess: true,
  })),
}))

vi.mock('../usePresenceCursorSetter', () => ({
  usePresenceCursorSetter: vi.fn(() => ({
    setCursor: vi.fn(),
  })),
}))

vi.mock('@/stores/mapStore', () => ({
  useMapStore: vi.fn((selector) => {
    const state = {
      currentMapId: 'map-1',
    }
    return selector(state)
  }),
}))

vi.mock('@/stores/uiStore', () => {
  // These need to be defined inside the factory to be accessible
  const mockSetSelectedConceptId = vi.fn()
  const mockSetSelectedCommentId = vi.fn()
  const mockSetConceptEditorOpen = vi.fn()
  const mockSetTextViewPosition = vi.fn()

  // Create stable state object
  const createState = () => ({
    selectedConceptId: null,
    selectedCommentId: null,
    setSelectedConceptId: mockSetSelectedConceptId,
    setSelectedCommentId: mockSetSelectedCommentId,
    setConceptEditorOpen: mockSetConceptEditorOpen,
    setTextViewPosition: mockSetTextViewPosition,
  })

  const mockUseUIStore = vi.fn((selector) => {
    const state = createState()
    // Store mocks on the function for test access
    if (!(mockUseUIStore as any).__mocks) {
      ;(mockUseUIStore as any).__mocks = {
        setSelectedConceptId: mockSetSelectedConceptId,
        setSelectedCommentId: mockSetSelectedCommentId,
        setConceptEditorOpen: mockSetConceptEditorOpen,
        setTextViewPosition: mockSetTextViewPosition,
      }
    }
    // If no selector, return state object (for destructuring)
    if (!selector) {
      return state
    }
    // If selector provided, call it with state
    return selector(state)
  })

  return {
    useUIStore: mockUseUIStore,
  }
})

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    const state = {
      getLastUpdateTime: mockGetLastUpdateTime,
      setLastUpdateTime: mockSetLastUpdateTime,
    }
    return selector ? selector(state) : state
  }),
}))

describe('useCanvasNodeHandlers', () => {
  const mockConcepts: Concept[] = [
    {
      id: 'concept-1',
      mapId: 'map-1',
      label: 'Concept 1',
      position: { x: 100, y: 200 },
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: 'concept-2',
      mapId: 'map-1',
      label: 'Concept 2',
      position: { x: 300, y: 400 },
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ]

  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      mapId: 'map-1',
      text: 'Comment 1',
      position: { x: 150, y: 250 },
      conceptIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdBy: 'user-1',
      resolved: false,
    },
  ]

  const mockRelationships: Relationship[] = [
    {
      id: 'rel-1',
      mapId: 'map-1',
      fromConceptId: 'concept-1',
      toConceptId: 'concept-2',
      primaryLabel: 'related to',
      reverseLabel: 'related from',
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ]

  const mockNodes = [
    {
      id: 'concept-1',
      type: 'concept',
      position: { x: 100, y: 200 },
      data: { label: 'Concept 1' },
    },
    {
      id: 'concept-2',
      type: 'concept',
      position: { x: 300, y: 400 },
      data: { label: 'Concept 2' },
    },
    {
      id: 'comment-1',
      type: 'comment',
      position: { x: 150, y: 250 },
      data: { text: 'Comment 1' },
    },
  ]

  const mockScreenToFlowPosition = vi.fn((pos) => pos)
  const mockOnNodesChangeBase = vi.fn()

  const defaultOptions = {
    concepts: mockConcepts,
    comments: mockComments,
    relationships: mockRelationships,
    nodes: mockNodes,
    onNodesChangeBase: mockOnNodesChangeBase,
    screenToFlowPosition: mockScreenToFlowPosition,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLastUpdateTime.mockClear()
    mockSetLastUpdateTime.mockClear()
    mockGetLastUpdateTime.mockReturnValue(null)
    
    // Reset all mocks to default state
    vi.mocked(useMapPermissions).mockReturnValue({ hasWriteAccess: true } as any)
    vi.mocked(useMapStore).mockImplementation((selector) => {
      const state = { currentMapId: 'map-1' }
      return selector(state as any)
    })
  })

  describe('onNodesChange', () => {
    it('should filter out remove changes when user lacks write access', () => {
      vi.mocked(useMapPermissions).mockReturnValue({ hasWriteAccess: false } as any)

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const changes: NodeChange[] = [
        { type: 'remove', id: 'concept-1' },
        { type: 'position', id: 'concept-2', position: { x: 350, y: 450 } },
      ]

      act(() => {
        result.current.onNodesChange(changes)
      })

      // Should filter out remove changes
      expect(mockOnNodesChangeBase).toHaveBeenCalledWith([
        { type: 'position', id: 'concept-2', position: { x: 350, y: 450 } },
      ])
    })

    it('should delete concepts and connected relationships', async () => {
      const mockDeleteConcept = vi.fn().mockResolvedValue(undefined)
      const mockDeleteRelationship = vi.fn().mockResolvedValue(undefined)
      const mockStartOperation = vi.fn()
      const mockEndOperation = vi.fn()

      // Set up mocks before rendering hook
      vi.mocked(useCanvasMutations).mockReturnValue({
        deleteConcept: mockDeleteConcept,
        deleteComment: vi.fn().mockResolvedValue(undefined),
        deleteRelationship: mockDeleteRelationship,
        updateConcept: vi.fn(),
        updateComment: vi.fn(),
        startOperation: mockStartOperation,
        endOperation: mockEndOperation,
      } as any)

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const changes: NodeChange[] = [
        { type: 'remove', id: 'concept-1' },
      ]

      await act(async () => {
        result.current.onNodesChange(changes)
        // Wait for async operations to complete
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Should start operation
      expect(mockStartOperation).toHaveBeenCalled()

      // Should delete connected relationship first
      expect(mockDeleteRelationship).toHaveBeenCalledWith('rel-1')

      // Should delete concept
      expect(mockDeleteConcept).toHaveBeenCalledWith('concept-1')

      // Should end operation
      expect(mockEndOperation).toHaveBeenCalled()

      // Should call base handler
      expect(mockOnNodesChangeBase).toHaveBeenCalledWith(changes)
    })

    it('should delete comments', async () => {
      const mockDeleteComment = vi.fn().mockResolvedValue(undefined)
      const mockStartOperation = vi.fn()
      const mockEndOperation = vi.fn()

      vi.mocked(useCanvasMutations).mockReturnValue({
        deleteConcept: vi.fn(),
        deleteComment: mockDeleteComment,
        deleteRelationship: vi.fn(),
        updateConcept: vi.fn(),
        updateComment: vi.fn(),
        startOperation: mockStartOperation,
        endOperation: mockEndOperation,
      } as any)

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const changes: NodeChange[] = [
        { type: 'remove', id: 'comment-1' },
      ]

      await act(async () => {
        result.current.onNodesChange(changes)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(mockDeleteComment).toHaveBeenCalledWith('comment-1')
      expect(mockStartOperation).toHaveBeenCalled()
      expect(mockEndOperation).toHaveBeenCalled()
    })

    it('should clear selection when selected concept is deleted', async () => {
      const mockSetSelectedConceptId = vi.fn()
      const mockSetConceptEditorOpen = vi.fn()

      vi.mocked(useUIStore).mockImplementation((selector) => {
        const state = {
          selectedConceptId: 'concept-1',
          selectedCommentId: null,
          setSelectedConceptId: mockSetSelectedConceptId,
          setSelectedCommentId: vi.fn(),
          setConceptEditorOpen: mockSetConceptEditorOpen,
          setTextViewPosition: vi.fn(),
        }
        return selector ? selector(state as any) : state
      })

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const changes: NodeChange[] = [
        { type: 'remove', id: 'concept-1' },
      ]

      await act(async () => {
        result.current.onNodesChange(changes)
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(mockSetSelectedConceptId).toHaveBeenCalledWith(null)
      expect(mockSetConceptEditorOpen).toHaveBeenCalledWith(false)
    })

    it('should ignore text-view-node deletions', () => {
      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const changes: NodeChange[] = [
        { type: 'remove', id: 'text-view-node' },
        { type: 'position', id: 'concept-1', position: { x: 150, y: 250 } },
      ]

      act(() => {
        result.current.onNodesChange(changes)
      })

      // Should not filter out text-view-node removal, but should not trigger deletion
      expect(mockOnNodesChangeBase).toHaveBeenCalledWith(changes)
    })
  })

  describe('onNodeDrag', () => {
    it('should update cursor position during drag', async () => {
      const mockSetCursor = vi.fn()

      vi.mocked(usePresenceCursorSetter).mockReturnValue({
        setCursor: mockSetCursor,
      } as any)

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const mockEvent = {
        clientX: 200,
        clientY: 300,
      } as React.MouseEvent

      const node = {
        id: 'concept-1',
        type: 'concept',
        position: { x: 150, y: 250 },
        data: { label: 'Concept 1' },
      }

      await act(async () => {
        await result.current.onNodeDrag(mockEvent, node as any)
      })

      expect(mockSetCursor).toHaveBeenCalled()
    })

    it('should throttle position updates', async () => {
      const mockUpdateConcept = vi.fn().mockResolvedValue(undefined)
      const mockGetLastUpdateTime = vi.fn()
        .mockReturnValueOnce(null) // First call - no previous update
        .mockReturnValueOnce(Date.now() - 50) // Second call - recent update (within throttle)
        .mockReturnValueOnce(Date.now() - 150) // Third call - old update (outside throttle)

      vi.mocked(useCanvasMutations).mockReturnValue({
        deleteConcept: vi.fn(),
        deleteComment: vi.fn(),
        deleteRelationship: vi.fn(),
        updateConcept: mockUpdateConcept,
        updateComment: vi.fn(),
        startOperation: vi.fn(),
        endOperation: vi.fn(),
      } as any)

      vi.mocked(useCanvasStore).mockImplementation((selector) => {
        const state = {
          getLastUpdateTime: mockGetLastUpdateTime,
          setLastUpdateTime: vi.fn(),
        }
        return selector ? selector(state as any) : state
      })

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const mockEvent = {
        clientX: 200,
        clientY: 300,
      } as React.MouseEvent

      const node = {
        id: 'concept-1',
        type: 'concept',
        position: { x: 150, y: 250 },
        data: { label: 'Concept 1' },
      }

      // First drag - should update (no previous update)
      await act(async () => {
        await result.current.onNodeDrag(mockEvent, node as any)
      })
      expect(mockUpdateConcept).toHaveBeenCalledTimes(1)

      // Second drag - should NOT update (within throttle window)
      await act(async () => {
        await result.current.onNodeDrag(mockEvent, node as any)
      })
      expect(mockUpdateConcept).toHaveBeenCalledTimes(1) // Still 1

      // Third drag - should update (outside throttle window)
      await act(async () => {
        await result.current.onNodeDrag(mockEvent, node as any)
      })
      expect(mockUpdateConcept).toHaveBeenCalledTimes(2) // Now 2
    })

    it('should handle text-view-node position updates', async () => {
      // Create a spy to track setTextViewPosition calls
      const setTextViewPositionSpy = vi.fn()
      
      // Override the mock to use our spy
      vi.mocked(useUIStore).mockImplementation((selector) => {
        const state = {
          selectedConceptId: null,
          selectedCommentId: null,
          setSelectedConceptId: vi.fn(),
          setSelectedCommentId: vi.fn(),
          setConceptEditorOpen: vi.fn(),
          setTextViewPosition: setTextViewPositionSpy,
        }
        if (!selector) {
          return state
        }
        return selector(state as any)
      })

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const mockEvent = {
        clientX: 200,
        clientY: 300,
      } as React.MouseEvent

      const node = {
        id: 'text-view-node',
        type: 'default',
        position: { x: 150, y: 250 },
        data: {},
      }

      await act(async () => {
        await result.current.onNodeDrag(mockEvent, node as any)
      })

      expect(setTextViewPositionSpy).toHaveBeenCalledWith({ x: 150, y: 250 })
    })

    it('should update comment position', async () => {
      const mockUpdateComment = vi.fn().mockResolvedValue(undefined)

      vi.mocked(useCanvasMutations).mockReturnValue({
        deleteConcept: vi.fn(),
        deleteComment: vi.fn(),
        deleteRelationship: vi.fn(),
        updateConcept: vi.fn(),
        updateComment: mockUpdateComment,
        startOperation: vi.fn(),
        endOperation: vi.fn(),
      } as any)

      // Reset getLastUpdateTime to return null so throttling doesn't prevent update
      mockGetLastUpdateTime.mockReturnValue(null)

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const mockEvent = {
        clientX: 200,
        clientY: 300,
      } as React.MouseEvent

      const node = {
        id: 'comment-1',
        type: 'comment',
        position: { x: 160, y: 260 },
        data: { text: 'Comment 1' },
      }

      await act(async () => {
        await result.current.onNodeDrag(mockEvent, node as any)
      })

      expect(mockUpdateComment).toHaveBeenCalledWith('comment-1', {
        position: { x: 160, y: 260 },
      })
    })
  })

  describe('onNodeDragStop', () => {
    it('should save final position immediately', async () => {
      const mockUpdateConcept = vi.fn().mockResolvedValue(undefined)
      const mockSetLastUpdateTime = vi.fn()

      vi.mocked(useCanvasMutations).mockReturnValue({
        deleteConcept: vi.fn(),
        deleteComment: vi.fn(),
        deleteRelationship: vi.fn(),
        updateConcept: mockUpdateConcept,
        updateComment: vi.fn(),
        startOperation: vi.fn(),
        endOperation: vi.fn(),
      } as any)

      vi.mocked(useCanvasStore).mockImplementation((selector) => {
        const state = {
          getLastUpdateTime: vi.fn(() => null),
          setLastUpdateTime: mockSetLastUpdateTime,
        }
        return selector ? selector(state as any) : state
      })

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const mockEvent = {
        clientX: 200,
        clientY: 300,
      } as React.MouseEvent

      const node = {
        id: 'concept-1',
        type: 'concept',
        position: { x: 150, y: 250 }, // Different from concept position (100, 200)
        data: { label: 'Concept 1' },
      }

      await act(async () => {
        await result.current.onNodeDragStop(mockEvent, node as any)
      })

      expect(mockUpdateConcept).toHaveBeenCalledWith('concept-1', {
        position: { x: 150, y: 250 },
        userPlaced: true,
      })
      expect(mockSetLastUpdateTime).toHaveBeenCalledWith('concept-1', expect.any(Number))
    })

    it('should not update if position unchanged', async () => {
      const mockUpdateConcept = vi.fn().mockResolvedValue(undefined)

      vi.mocked(useCanvasMutations).mockReturnValue({
        deleteConcept: vi.fn(),
        deleteComment: vi.fn(),
        deleteRelationship: vi.fn(),
        updateConcept: mockUpdateConcept,
        updateComment: vi.fn(),
        startOperation: vi.fn(),
        endOperation: vi.fn(),
      } as any)

      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const mockEvent = {
        clientX: 200,
        clientY: 300,
      } as React.MouseEvent

      const node = {
        id: 'concept-1',
        type: 'concept',
        position: { x: 100, y: 200 }, // Same as concept position
        data: { label: 'Concept 1' },
      }

      await act(async () => {
        await result.current.onNodeDragStop(mockEvent, node as any)
      })

      expect(mockUpdateConcept).not.toHaveBeenCalled()
    })
  })

  describe('onNodeClick', () => {
    it('should be a no-op handler', () => {
      const { result } = renderHook(() => useCanvasNodeHandlers(defaultOptions))

      const mockEvent = {} as React.MouseEvent
      const mockNode = {} as any

      // Should not throw
      expect(() => {
        result.current.onNodeClick(mockEvent, mockNode)
      }).not.toThrow()
    })
  })
})


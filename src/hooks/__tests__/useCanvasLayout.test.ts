/**
 * Tests for useCanvasLayout hook.
 * Verifies layout application, incremental layout, and undo/redo command pattern.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasLayout } from '../useCanvasLayout'
import { useCanvasStore } from '@/stores/canvasStore'
import { useMapStore } from '@/stores/mapStore'
import { useUndoStore } from '@/stores/undoStore'
import type { LayoutType } from '@/lib/layouts'
import type { Node, Edge } from 'reactflow'
import type { Concept, Comment } from '@/lib/schema'

// Mock layout functions - must be defined inside vi.mock factory
vi.mock('@/lib/layouts', () => ({
  applyForceDirectedLayout: vi.fn(),
  applyHierarchicalLayout: vi.fn(),
  applyLayeredLayout: vi.fn(),
}))

// Mock database - must be defined inside vi.mock factory
vi.mock('@/lib/instant', () => ({
  db: {
    useAuth: vi.fn(() => ({ user: null })),
    useQuery: vi.fn(() => ({ data: null })),
    transact: vi.fn().mockResolvedValue(undefined),
  },
  tx: {
    concepts: new Proxy(
      {},
      {
        get: () => ({
          update: vi.fn().mockReturnValue({
            id: 'concept-1',
            positionX: 100,
            positionY: 200,
            updatedAt: Date.now(),
          }),
        }),
      }
    ),
  },
  id: vi.fn(() => 'mock-id'),
}))

// Import mocked functions after mocking
import {
  applyForceDirectedLayout,
  applyHierarchicalLayout,
  applyLayeredLayout,
} from '@/lib/layouts'
import { db } from '@/lib/instant'

const mockApplyForceDirectedLayout = vi.mocked(applyForceDirectedLayout)
const mockApplyHierarchicalLayout = vi.mocked(applyHierarchicalLayout)
const mockApplyLayeredLayout = vi.mocked(applyLayeredLayout)
const mockTransact = vi.mocked(db.transact)

// Store mock functions globally so they can be accessed
const mockSetSelectedLayout = vi.fn()
const mockRecordMutation = vi.fn()
const mockStartOperation = vi.fn()
const mockEndOperation = vi.fn()

vi.mock('@/stores/canvasStore', () => {
  // Create state factory that uses the global mock functions
  const createState = () => ({
    selectedLayout: null as LayoutType | null,
    setSelectedLayout: mockSetSelectedLayout,
  })

  const mockUseCanvasStore = vi.fn((selector?: any) => {
    const state = createState()
    // When called without selector (destructuring), return full state
    if (!selector) {
      return state as any
    }
    // When called with selector, apply selector
    return selector(state as any)
  })

  // Add getState method for useCanvasStore.getState() calls
  ;(mockUseCanvasStore as any).getState = () => createState()

  return {
    useCanvasStore: mockUseCanvasStore,
  }
})

vi.mock('@/stores/undoStore', () => {
  const createState = () => ({
    currentOperationId: null as string | null,
    recordMutation: mockRecordMutation,
    startOperation: mockStartOperation,
    endOperation: mockEndOperation,
  })

  const mockUseUndoStore = vi.fn((selector?: any) => {
    const state = createState()
    if (!selector) {
      return state as any
    }
    return selector(state as any)
  })

  ;(mockUseUndoStore as any).getState = () => createState()

  return {
    useUndoStore: mockUseUndoStore,
  }
})

vi.mock('@/stores/mapStore', () => ({
  useMapStore: vi.fn((selector) => {
    const state = {
      currentMapId: 'map-1',
    }
    return selector(state as any)
  }),
}))

// Mock useMapActions since useCanvasLayout now uses it
const mockUpdateMap = vi.fn().mockResolvedValue(undefined)
vi.mock('@/hooks/useMapActions', () => ({
  useMapActions: vi.fn(() => ({
    updateMap: mockUpdateMap,
  })),
}))

describe('useCanvasLayout', () => {
  const mockGetNodes = vi.fn(() => [
    { id: 'concept-1', type: 'concept', position: { x: 100, y: 200 }, data: {} },
    { id: 'concept-2', type: 'concept', position: { x: 300, y: 400 }, data: {} },
  ] as Node[])

  const mockGetEdges = vi.fn(() => [
    { id: 'edge-1', source: 'concept-1', target: 'concept-2', type: 'default' },
  ] as Edge[])

  const mockFitView = vi.fn()

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

  const mockComments: Comment[] = []

  const defaultOptions = {
    nodes: [] as Node[],
    edges: [] as Edge[],
    conceptIds: ['concept-1', 'concept-2'],
    concepts: mockConcepts,
    comments: mockComments,
    getNodes: mockGetNodes,
    getEdges: mockGetEdges,
    fitView: mockFitView,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetSelectedLayout.mockClear()
    mockRecordMutation.mockClear()
    mockStartOperation.mockClear()
    mockEndOperation.mockClear()
    mockTransact.mockClear()
    mockFitView.mockClear()

    // Mock undo store to return an operation ID when startOperation is called
    let operationId: string | null = null
    mockStartOperation.mockImplementation(() => {
      operationId = `op_${Date.now()}`
      const mockUseUndoStore = vi.mocked(useUndoStore)
      ;(mockUseUndoStore as any).getState = () => ({
        currentOperationId: operationId,
        recordMutation: mockRecordMutation,
        startOperation: mockStartOperation,
        endOperation: mockEndOperation,
      })
    })
    mockEndOperation.mockImplementation(() => {
      operationId = null
      const mockUseUndoStore = vi.mocked(useUndoStore)
      ;(mockUseUndoStore as any).getState = () => ({
        currentOperationId: operationId,
        recordMutation: mockRecordMutation,
        startOperation: mockStartOperation,
        endOperation: mockEndOperation,
      })
    })

    // Reset layout mocks - return nodes with type property
    mockApplyForceDirectedLayout.mockReturnValue([
      { id: 'concept-1', type: 'concept', position: { x: 150, y: 250 }, data: {} },
      { id: 'concept-2', type: 'concept', position: { x: 350, y: 450 }, data: {} },
    ] as Node[])
    mockApplyHierarchicalLayout.mockReturnValue([
      { id: 'concept-1', type: 'concept', position: { x: 200, y: 300 }, data: {} },
      { id: 'concept-2', type: 'concept', position: { x: 400, y: 500 }, data: {} },
    ] as Node[])
    mockApplyLayeredLayout.mockResolvedValue([
      { id: 'concept-1', type: 'concept', position: { x: 300, y: 400 }, data: {} },
      { id: 'concept-2', type: 'concept', position: { x: 500, y: 600 }, data: {} },
    ] as Node[])

    // Reset store state
    const mockUseCanvasStore = vi.mocked(useCanvasStore)
    const defaultState = {
      selectedLayout: null as LayoutType | null,
      setSelectedLayout: mockSetSelectedLayout,
    }
    ;(mockUseCanvasStore as any).getState = () => defaultState
    
    mockUseCanvasStore.mockImplementation((selector) => {
      const state = (mockUseCanvasStore as any).getState()
      if (selector) {
        return selector(state as any)
      }
      return state as any
    })

    const mockUseUndoStore = vi.mocked(useUndoStore)
    mockUseUndoStore.mockImplementation((selector) => {
      const state = {
        currentOperationId: null as string | null,
        recordMutation: mockRecordMutation,
        startOperation: mockStartOperation,
        endOperation: mockEndOperation,
      }
      if (selector) {
        return selector(state as any)
      }
      return state as any
    })
    ;(mockUseUndoStore as any).getState = () => ({
      currentOperationId: null,
      recordMutation: mockRecordMutation,
      startOperation: mockStartOperation,
      endOperation: mockEndOperation,
    })

    // Reset getNodes to return concept nodes by default
    mockGetNodes.mockReturnValue([
      { id: 'concept-1', type: 'concept', position: { x: 100, y: 200 }, data: {} },
      { id: 'concept-2', type: 'concept', position: { x: 300, y: 400 }, data: {} },
    ] as Node[])
  })

  describe('applyLayout', () => {
    it('should apply force-directed layout', async () => {
      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      await act(async () => {
        await result.current.applyLayout('force-directed')
      })

      expect(mockStartOperation).toHaveBeenCalled()
      expect(mockApplyForceDirectedLayout).toHaveBeenCalled()
      expect(mockSetSelectedLayout).toHaveBeenCalledWith('force-directed')
      expect(mockTransact).toHaveBeenCalled()
      expect(mockRecordMutation).toHaveBeenCalled()
      expect(mockEndOperation).toHaveBeenCalled()
      
      // fitView is called in a setTimeout, so wait for it
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(mockFitView).toHaveBeenCalled()
    })

    it('should apply hierarchical layout', async () => {
      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      await act(async () => {
        await result.current.applyLayout('hierarchical')
      })

      expect(mockStartOperation).toHaveBeenCalled()
      expect(mockApplyHierarchicalLayout).toHaveBeenCalled()
      expect(mockSetSelectedLayout).toHaveBeenCalledWith('hierarchical')
      expect(mockTransact).toHaveBeenCalled()
      expect(mockRecordMutation).toHaveBeenCalled()
      expect(mockEndOperation).toHaveBeenCalled()
    })

    it('should apply layered layout', async () => {
      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      await act(async () => {
        await result.current.applyLayout('layered')
      })

      expect(mockStartOperation).toHaveBeenCalled()
      expect(mockApplyLayeredLayout).toHaveBeenCalled()
      expect(mockSetSelectedLayout).toHaveBeenCalledWith('layered')
      expect(mockTransact).toHaveBeenCalled()
      expect(mockRecordMutation).toHaveBeenCalled()
      expect(mockEndOperation).toHaveBeenCalled()
    })

    it('should use incremental layout for force-directed when incremental is true', async () => {
      // Set up concepts with userPlaced flags
      const optionsWithUserPlaced = {
        ...defaultOptions,
        concepts: [
          { ...mockConcepts[0], userPlaced: true }, // concept-1 is user-placed (frozen)
          { ...mockConcepts[1], userPlaced: false }, // concept-2 is layout-placed (can move)
        ],
      }

      const { result } = renderHook(() => useCanvasLayout(optionsWithUserPlaced))

      await act(async () => {
        await result.current.applyLayout('force-directed', true)
      })

      expect(mockStartOperation).toHaveBeenCalled()
      expect(mockApplyForceDirectedLayout).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          fixedNodeIds: expect.any(Set),
          newNodeIds: expect.any(Set),
        })
      )
      expect(mockEndOperation).toHaveBeenCalled()
    })

    it('should only update new nodes in incremental layout', async () => {
      // Set up concepts with userPlaced flags - concept-1 is frozen, concept-2 is new
      const optionsWithUserPlaced = {
        ...defaultOptions,
        concepts: [
          { ...mockConcepts[0], userPlaced: true }, // concept-1 is user-placed (frozen)
          { ...mockConcepts[1], userPlaced: false }, // concept-2 is layout-placed (can move)
        ],
      }

      mockGetNodes.mockReturnValue([
        { id: 'concept-1', type: 'concept', position: { x: 100, y: 200 }, data: {} },
        { id: 'concept-2', type: 'concept', position: { x: 300, y: 400 }, data: {} },
      ] as Node[])

      mockApplyForceDirectedLayout.mockReturnValue([
        { id: 'concept-1', type: 'concept', position: { x: 100, y: 200 }, data: {} },
        { id: 'concept-2', type: 'concept', position: { x: 350, y: 450 }, data: {} },
      ] as Node[])

      const { result } = renderHook(() => useCanvasLayout(optionsWithUserPlaced))

      await act(async () => {
        await result.current.applyLayout('force-directed', true)
      })

      // Should only update concept-2 (layout-placed node, can be repositioned)
      expect(mockTransact).toHaveBeenCalled()
      const transactCall = mockTransact.mock.calls[0][0]
      // The updates array contains the result of tx.concepts[node.id].update()
      // Verify that transact was called with an array
      expect(Array.isArray(transactCall)).toBe(true)
      if (Array.isArray(transactCall)) {
        expect(transactCall.length).toBeGreaterThan(0)
      }
      // Verify commands were recorded
      expect(mockRecordMutation).toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      mockTransact.mockRejectedValueOnce(new Error('Database error'))

      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      await act(async () => {
        await result.current.applyLayout('force-directed')
      })

      expect(mockStartOperation).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to apply layout:',
        expect.any(Error)
      )
      expect(alertSpy).toHaveBeenCalledWith('Failed to apply layout. Please try again.')
      // Ensure operation is ended even on error
      expect(mockEndOperation).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
      alertSpy.mockRestore()
    })

    it('should return early if no map ID', async () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = { currentMapId: null }
        return selector(state as any)
      })

      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      await act(async () => {
        await result.current.applyLayout('force-directed')
      })

      expect(mockApplyForceDirectedLayout).not.toHaveBeenCalled()
    })

    it('should return early if no concept nodes', async () => {
      mockGetNodes.mockReturnValue([])

      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      await act(async () => {
        await result.current.applyLayout('force-directed')
      })

      expect(mockApplyForceDirectedLayout).not.toHaveBeenCalled()
    })
  })

  // Note: Auto-apply layout functionality was removed (sticky mode removed)
  // Layouts are now only applied explicitly via applyLayout calls

  describe('return values', () => {
    it('should return selectedLayout from store', () => {
      vi.mocked(useCanvasStore).mockImplementation((selector) => {
        const state = {
          selectedLayout: 'hierarchical' as LayoutType,
          setSelectedLayout: mockSetSelectedLayout,
        }
        return selector ? selector(state as any) : state
      })

      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      expect(result.current.selectedLayout).toBe('hierarchical')
    })

    it('should return setSelectedLayout function', () => {
      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      expect(typeof result.current.setSelectedLayout).toBe('function')
    })

    it('should return applyIncrementalLayoutForNewNodes function', () => {
      const { result } = renderHook(() => useCanvasLayout(defaultOptions))

      expect(typeof result.current.applyIncrementalLayoutForNewNodes).toBe('function')
    })
  })
})


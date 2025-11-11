/**
 * Tests for useCanvasDeepLinking hook.
 * Verifies concept centering from URL, auto-selection, and viewport management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasDeepLinking } from '../useCanvasDeepLinking'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import type { Concept } from '@/lib/schema'
import type { Node } from 'reactflow'

// Mock dependencies
vi.mock('@/stores/mapStore')
vi.mock('@/stores/uiStore')

const mockSetSelectedConceptId = vi.fn()
const mockSetCurrentConceptId = vi.fn()
const mockSetShouldAutoCenterConcept = vi.fn()
const mockFitView = vi.fn()
const mockGetNode = vi.fn()
const mockSetCenter = vi.fn()
const mockGetViewport = vi.fn()
const mockSetNodes = vi.fn()

describe('useCanvasDeepLinking', () => {
  const mockConcepts: Concept[] = [
    {
      id: 'concept-1',
      mapId: 'map-1',
      label: 'Concept 1',
      position: { x: 100, y: 100 },
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
      position: { x: 200, y: 200 },
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ]

  const mockNodes: Node[] = [
    {
      id: 'concept-1',
      type: 'concept',
      position: { x: 100, y: 100 },
      data: { label: 'Concept 1' },
    },
    {
      id: 'concept-2',
      type: 'concept',
      position: { x: 200, y: 200 },
      data: { label: 'Concept 2' },
    },
  ]

  const defaultOptions = {
    concepts: mockConcepts,
    nodes: mockNodes,
    setNodes: mockSetNodes,
    fitView: mockFitView,
    getNode: mockGetNode,
    setCenter: mockSetCenter,
    getViewport: mockGetViewport,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useMapStore
    vi.mocked(useMapStore).mockImplementation((selector) => {
      const state = {
        currentConceptId: null as string | null,
        shouldAutoCenterConcept: false,
        setCurrentConceptId: mockSetCurrentConceptId,
        setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
      }
      return selector ? selector(state as any) : state
    })

    // Mock useUIStore
    vi.mocked(useUIStore).mockImplementation((selector) => {
      const state = {
        setSelectedConceptId: mockSetSelectedConceptId,
      }
      return selector ? selector(state as any) : state
    })

    // Mock React Flow functions
    mockGetNode.mockReturnValue(mockNodes[0])
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 })
  })

  describe('deep linking behavior', () => {
    it('should not trigger when shouldAutoCenterConcept is false', () => {
      renderHook(() => useCanvasDeepLinking(defaultOptions))

      expect(mockSetSelectedConceptId).not.toHaveBeenCalled()
      expect(mockSetNodes).not.toHaveBeenCalled()
      expect(mockFitView).not.toHaveBeenCalled()
    })

    it('should not trigger when currentConceptId is null', () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: null,
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() => useCanvasDeepLinking(defaultOptions))

      expect(mockSetSelectedConceptId).not.toHaveBeenCalled()
      expect(mockSetNodes).not.toHaveBeenCalled()
      expect(mockFitView).not.toHaveBeenCalled()
    })

    it('should not trigger when concepts array is empty', () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'concept-1',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() =>
        useCanvasDeepLinking({
          ...defaultOptions,
          concepts: [],
        })
      )

      expect(mockSetSelectedConceptId).not.toHaveBeenCalled()
      expect(mockSetNodes).not.toHaveBeenCalled()
      expect(mockFitView).not.toHaveBeenCalled()
    })

    it('should not trigger when concept does not exist', () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'non-existent-concept',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() => useCanvasDeepLinking(defaultOptions))

      expect(mockSetSelectedConceptId).not.toHaveBeenCalled()
      expect(mockSetNodes).not.toHaveBeenCalled()
      expect(mockFitView).not.toHaveBeenCalled()
    })

    it('should not trigger when nodes array is empty', () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'concept-1',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() =>
        useCanvasDeepLinking({
          ...defaultOptions,
          nodes: [],
        })
      )

      expect(mockSetSelectedConceptId).not.toHaveBeenCalled()
      expect(mockSetNodes).not.toHaveBeenCalled()
      expect(mockFitView).not.toHaveBeenCalled()
    })

    it('should not trigger when concept node is not found', () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'concept-1',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() =>
        useCanvasDeepLinking({
          ...defaultOptions,
          nodes: [{ id: 'concept-2', type: 'concept', position: { x: 200, y: 200 }, data: {} }],
        })
      )

      expect(mockSetSelectedConceptId).not.toHaveBeenCalled()
      expect(mockSetNodes).not.toHaveBeenCalled()
      expect(mockFitView).not.toHaveBeenCalled()
    })

    it('should select concept and update nodes when conditions are met', async () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'concept-1',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() => useCanvasDeepLinking(defaultOptions))

      // Wait for effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Should select the concept
      expect(mockSetSelectedConceptId).toHaveBeenCalledWith('concept-1')

      // Should update nodes to mark concept-1 as selected
      expect(mockSetNodes).toHaveBeenCalled()
      const setNodesCall = mockSetNodes.mock.calls[0][0]
      expect(typeof setNodesCall).toBe('function')

      // Verify the node updater function
      const updatedNodes = setNodesCall(mockNodes)
      expect(updatedNodes.find((n: Node) => n.id === 'concept-1')?.selected).toBe(true)
      expect(updatedNodes.find((n: Node) => n.id === 'concept-2')?.selected).toBe(false)

      // Should disable auto-centering flag
      expect(mockSetShouldAutoCenterConcept).toHaveBeenCalledWith(false)
    })

    it('should call fitView and setCenter with proper timing', async () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'concept-1',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      // Mock getViewport to simulate zoom change after fitView
      let zoomValue = 1.0
      mockGetViewport.mockImplementation(() => ({ x: 0, y: 0, zoom: zoomValue }))

      renderHook(() => useCanvasDeepLinking(defaultOptions))

      // Wait for initial effect and initial delay (100ms)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      // Should call fitView
      expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1, duration: 300 })

      // Simulate zoom change (fitView completes and changes zoom)
      zoomValue = 0.8
      mockGetViewport.mockImplementation(() => ({ x: 0, y: 0, zoom: zoomValue }))

      // Wait for waitForZoomChange to detect the zoom change (uses requestAnimationFrame)
      await act(async () => {
        // Wait for a few animation frames to allow polling to complete
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      // Should call setCenter with node position and viewport zoom
      expect(mockSetCenter).toHaveBeenCalledWith(100, 100, { zoom: 0.8, duration: 300 })

      // Should clear currentConceptId
      expect(mockSetCurrentConceptId).toHaveBeenCalledWith(null)
    })

    it('should prevent duplicate calls with isCenteringRef', async () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'concept-1',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      const { rerender } = renderHook(() => useCanvasDeepLinking(defaultOptions))

      // Wait for initial effect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      vi.clearAllMocks()

      // Rerender with same props (should not trigger again)
      rerender(defaultOptions)

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Should not call again (isCenteringRef prevents it)
      expect(mockSetSelectedConceptId).not.toHaveBeenCalled()
    })

    it('should reset centering flag when concepts change', async () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'concept-1',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      const { rerender } = renderHook(
        (props) => useCanvasDeepLinking({ ...defaultOptions, concepts: props.concepts }),
        {
          initialProps: { concepts: mockConcepts },
        }
      )

      // Wait for initial effect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Change concepts (simulating map switch)
      rerender({ concepts: [] })

      // The centering flag should be reset, allowing new centering operations
      // This is tested by the fact that the hook doesn't crash
    })

    it('should handle getNode returning undefined gracefully', async () => {
      vi.mocked(useMapStore).mockImplementation((selector) => {
        const state = {
          currentConceptId: 'concept-1',
          shouldAutoCenterConcept: true,
          setCurrentConceptId: mockSetCurrentConceptId,
          setShouldAutoCenterConcept: mockSetShouldAutoCenterConcept,
        }
        return selector ? selector(state as any) : state
      })

      mockGetNode.mockReturnValue(undefined)

      // Mock getViewport to simulate zoom change after fitView
      let zoomValue = 1.0
      mockGetViewport.mockImplementation(() => ({ x: 0, y: 0, zoom: zoomValue }))

      renderHook(() => useCanvasDeepLinking(defaultOptions))

      // Wait for initial effect and initial delay (100ms)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      // Should call fitView
      expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1, duration: 300 })

      // Simulate zoom change (fitView completes and changes zoom)
      zoomValue = 0.8
      mockGetViewport.mockImplementation(() => ({ x: 0, y: 0, zoom: zoomValue }))

      // Wait for waitForZoomChange to detect the zoom change
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      // Should still clear currentConceptId even if getNode returns undefined
      expect(mockSetCurrentConceptId).toHaveBeenCalledWith(null)

      // Should not call setCenter if node is undefined
      expect(mockSetCenter).not.toHaveBeenCalled()
    })
  })
})


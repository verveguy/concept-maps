/**
 * Tests for useCanvasPresence hook.
 * Verifies cursor tracking and editing state updates.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCanvasPresence } from '../useCanvasPresence'
import { usePresenceCursorSetter } from '../usePresenceCursorSetter'
import { usePresenceEditing } from '../usePresenceEditing'
import { useUIStore } from '@/stores/uiStore'

// Mock dependencies
vi.mock('../usePresenceCursorSetter')
vi.mock('../usePresenceEditing')
vi.mock('@/stores/uiStore')

const mockSetCursor = vi.fn()
const mockSetEditingNode = vi.fn()
const mockSetEditingEdge = vi.fn()
const mockScreenToFlowPosition = vi.fn()

describe('useCanvasPresence', () => {
  const defaultOptions = {
    screenToFlowPosition: mockScreenToFlowPosition,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock usePresenceCursorSetter
    vi.mocked(usePresenceCursorSetter).mockReturnValue({
      setCursor: mockSetCursor,
    })

    // Mock usePresenceEditing
    vi.mocked(usePresenceEditing).mockReturnValue({
      setEditingNode: mockSetEditingNode,
      setEditingEdge: mockSetEditingEdge,
    })

    // Mock useUIStore
    vi.mocked(useUIStore).mockImplementation((selector) => {
      const state = {
        selectedConceptId: null as string | null,
        selectedRelationshipId: null as string | null,
      }
      return selector ? selector(state as any) : state
    })

    // Mock screenToFlowPosition
    mockScreenToFlowPosition.mockImplementation((point: { x: number; y: number }) => ({
      x: point.x * 0.5,
      y: point.y * 0.5,
    }))

    // Create a mock React Flow pane element
    const mockPane = document.createElement('div')
    mockPane.className = 'react-flow'
    mockPane.style.width = '1000px'
    mockPane.style.height = '800px'
    // Position the pane at (0, 0) for consistent testing
    mockPane.style.position = 'absolute'
    mockPane.style.left = '0px'
    mockPane.style.top = '0px'
    // Mock getBoundingClientRect to return consistent values
    mockPane.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 800,
      width: 1000,
      height: 800,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect))
    document.body.appendChild(mockPane)
  })

  afterEach(() => {
    // Clean up mock pane
    const pane = document.querySelector('.react-flow')
    if (pane) {
      document.body.removeChild(pane)
    }
  })

  describe('cursor tracking', () => {
    it('should set cursor position when mouse moves within pane', () => {
      renderHook(() => useCanvasPresence(defaultOptions))

      const pane = document.querySelector<HTMLElement>('.react-flow')
      expect(pane).toBeTruthy()

      // Simulate mouse move within pane bounds
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 500,
        clientY: 400,
        bubbles: true,
      })

      pane!.dispatchEvent(mouseEvent)

      // Should convert screen coordinates to flow coordinates
      expect(mockScreenToFlowPosition).toHaveBeenCalledWith({
        x: 500,
        y: 400,
      })

      // Should set cursor with converted position
      expect(mockSetCursor).toHaveBeenCalledWith({ x: 250, y: 200 })
    })

    it('should clear cursor when mouse moves outside pane bounds', () => {
      renderHook(() => useCanvasPresence(defaultOptions))

      const pane = document.querySelector<HTMLElement>('.react-flow')
      expect(pane).toBeTruthy()

      // Simulate mouse move outside pane bounds (to the right)
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 1500, // Outside pane (pane is 1000px wide)
        clientY: 400,
        bubbles: true,
      })

      pane!.dispatchEvent(mouseEvent)

      // Should clear cursor
      expect(mockSetCursor).toHaveBeenCalledWith(null)
    })

    it('should clear cursor when mouse leaves pane', () => {
      renderHook(() => useCanvasPresence(defaultOptions))

      const pane = document.querySelector<HTMLElement>('.react-flow')
      expect(pane).toBeTruthy()

      // Simulate mouse leave event
      const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
      })

      pane!.dispatchEvent(mouseLeaveEvent)

      // Should clear cursor
      expect(mockSetCursor).toHaveBeenCalledWith(null)
    })

    it('should handle mouse move at pane boundaries correctly', () => {
      renderHook(() => useCanvasPresence(defaultOptions))

      const pane = document.querySelector<HTMLElement>('.react-flow')
      expect(pane).toBeTruthy()

      // Get pane bounds
      const paneRect = pane!.getBoundingClientRect()

      // Simulate mouse move at top-left corner (within bounds)
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: paneRect.left,
        clientY: paneRect.top,
        bubbles: true,
      })

      pane!.dispatchEvent(mouseEvent)

      // Should set cursor (within bounds)
      expect(mockSetCursor).toHaveBeenCalled()
      expect(mockSetCursor).not.toHaveBeenCalledWith(null)
    })

    it('should handle when React Flow pane is not found', () => {
      // Remove pane before rendering hook
      const pane = document.querySelector('.react-flow')
      if (pane) {
        document.body.removeChild(pane)
      }

      renderHook(() => useCanvasPresence(defaultOptions))

      // Should not throw error and should not set cursor
      expect(mockSetCursor).not.toHaveBeenCalled()
    })

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useCanvasPresence(defaultOptions))

      const pane = document.querySelector<HTMLElement>('.react-flow')
      expect(pane).toBeTruthy()

      // Clear mocks
      vi.clearAllMocks()

      // Unmount hook
      unmount()

      // Simulate mouse move after unmount
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 500,
        clientY: 400,
        bubbles: true,
      })

      pane!.dispatchEvent(mouseEvent)

      // Should not set cursor (listeners removed)
      expect(mockSetCursor).not.toHaveBeenCalled()
    })
  })

  describe('editing state tracking', () => {
    it('should update editing node when selectedConceptId changes', () => {
      vi.mocked(useUIStore).mockImplementation((selector) => {
        const state = {
          selectedConceptId: 'concept-1',
          selectedRelationshipId: null,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() => useCanvasPresence(defaultOptions))

      // Should set editing node
      expect(mockSetEditingNode).toHaveBeenCalledWith('concept-1')
    })

    it('should clear editing node when selectedConceptId is null', () => {
      vi.mocked(useUIStore).mockImplementation((selector) => {
        const state = {
          selectedConceptId: null,
          selectedRelationshipId: null,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() => useCanvasPresence(defaultOptions))

      // Should clear editing node
      expect(mockSetEditingNode).toHaveBeenCalledWith(null)
    })

    it('should update editing edge when selectedRelationshipId changes', () => {
      vi.mocked(useUIStore).mockImplementation((selector) => {
        const state = {
          selectedConceptId: null,
          selectedRelationshipId: 'relationship-1',
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() => useCanvasPresence(defaultOptions))

      // Should set editing edge
      expect(mockSetEditingEdge).toHaveBeenCalledWith('relationship-1')
    })

    it('should clear editing edge when selectedRelationshipId is null', () => {
      vi.mocked(useUIStore).mockImplementation((selector) => {
        const state = {
          selectedConceptId: null,
          selectedRelationshipId: null,
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() => useCanvasPresence(defaultOptions))

      // Should clear editing edge
      expect(mockSetEditingEdge).toHaveBeenCalledWith(null)
    })

    it('should update both editing node and edge when both are selected', () => {
      vi.mocked(useUIStore).mockImplementation((selector) => {
        const state = {
          selectedConceptId: 'concept-1',
          selectedRelationshipId: 'relationship-1',
        }
        return selector ? selector(state as any) : state
      })

      renderHook(() => useCanvasPresence(defaultOptions))

      // Should set both editing node and edge
      expect(mockSetEditingNode).toHaveBeenCalledWith('concept-1')
      expect(mockSetEditingEdge).toHaveBeenCalledWith('relationship-1')
    })

    it('should update editing state when selection changes', () => {
      const { rerender } = renderHook(
        () => useCanvasPresence(defaultOptions),
        {
          initialProps: {},
        }
      )

      // Initial render with no selection
      expect(mockSetEditingNode).toHaveBeenCalledWith(null)
      expect(mockSetEditingEdge).toHaveBeenCalledWith(null)

      vi.clearAllMocks()

      // Update selection
      vi.mocked(useUIStore).mockImplementation((selector) => {
        const state = {
          selectedConceptId: 'concept-2',
          selectedRelationshipId: 'relationship-2',
        }
        return selector ? selector(state as any) : state
      })

      rerender({})

      // Should update editing state
      expect(mockSetEditingNode).toHaveBeenCalledWith('concept-2')
      expect(mockSetEditingEdge).toHaveBeenCalledWith('relationship-2')
    })
  })
})


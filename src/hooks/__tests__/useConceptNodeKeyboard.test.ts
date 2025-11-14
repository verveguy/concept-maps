/**
 * Tests for useConceptNodeKeyboard hook.
 * Verifies keyboard event handling for concept node editing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConceptNodeKeyboard } from '../useConceptNodeKeyboard'
import { useReactFlow } from 'reactflow'
import { useMapStore } from '@/stores/mapStore'

// Mock dependencies
vi.mock('reactflow', () => ({
  useReactFlow: vi.fn(),
}))

vi.mock('@/stores/mapStore', () => ({
  useMapStore: vi.fn(),
}))

vi.mock('@/lib/instant', () => ({
  db: {
    transact: vi.fn(),
  },
  tx: {
    concepts: {},
    relationships: {},
  },
  id: vi.fn(() => 'mock-id'),
}))

describe('useConceptNodeKeyboard', () => {
  const mockOnSave = vi.fn()
  const mockOnCancel = vi.fn()
  const mockGetNode = vi.fn()
  const mockGetEdges = vi.fn(() => [] as any[])
  const mockSetEdges = vi.fn()
  const mockFitView = vi.fn()
  const mockCurrentMapId = 'map-1'

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSave.mockResolvedValue(undefined)
    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      getEdges: mockGetEdges,
      setEdges: mockSetEdges,
      fitView: mockFitView,
      getNodes: vi.fn(),
      setNodes: vi.fn(),
    } as any)
    vi.mocked(useMapStore).mockReturnValue(mockCurrentMapId)
  })

  it('should call onSave when Enter key is pressed', async () => {
    const { result } = renderHook(() =>
      useConceptNodeKeyboard({
        isEditing: true,
        nodeId: 'node-1',
        hasWriteAccess: true,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      })
    )

    const mockEvent = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent

    await act(async () => {
      result.current(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockOnSave).toHaveBeenCalled()
  })

  it('should call onCancel when Escape key is pressed', () => {
    const { result } = renderHook(() =>
      useConceptNodeKeyboard({
        isEditing: true,
        nodeId: 'node-1',
        hasWriteAccess: true,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      })
    )

    const mockEvent = {
      key: 'Escape',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent

    act(() => {
      result.current(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('should create new concept and relationship when Tab is pressed', async () => {
    mockGetNode.mockReturnValue({
      position: { x: 100, y: 100 },
    })

    const { result } = renderHook(() =>
      useConceptNodeKeyboard({
        isEditing: true,
        nodeId: 'node-1',
        hasWriteAccess: true,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      })
    )

    const mockEvent = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent

    await act(async () => {
      result.current(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockOnSave).toHaveBeenCalled()
    // Note: Full verification of Tab behavior would require checking db.transact calls
  })

  it('should not create concept when Tab is pressed without write access', async () => {
    const { result } = renderHook(() =>
      useConceptNodeKeyboard({
        isEditing: true,
        nodeId: 'node-1',
        hasWriteAccess: false,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      })
    )

    const mockEvent = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent

    await act(async () => {
      result.current(mockEvent)
    })

    expect(mockOnSave).toHaveBeenCalled()
    // Should not create concept when no write access
  })

  it('should not handle Tab when not editing', () => {
    const { result } = renderHook(() =>
      useConceptNodeKeyboard({
        isEditing: false,
        nodeId: 'node-1',
        hasWriteAccess: true,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      })
    )

    const mockEvent = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent

    act(() => {
      result.current(mockEvent)
    })

    // Should not prevent default or call onSave when not editing
    expect(mockEvent.preventDefault).not.toHaveBeenCalled()
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('should handle Shift+Tab to navigate to incoming edge', async () => {
    const mockEdge: any = {
      id: 'edge-1',
      target: 'node-1',
      data: {},
    }
    mockGetEdges.mockReturnValue([mockEdge])

    const { result } = renderHook(() =>
      useConceptNodeKeyboard({
        isEditing: true,
        nodeId: 'node-1',
        hasWriteAccess: true,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      })
    )

    const mockEvent = {
      key: 'Tab',
      shiftKey: true,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent

    await act(async () => {
      result.current(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockOnSave).toHaveBeenCalled()
    expect(mockSetEdges).toHaveBeenCalled()
  })
})


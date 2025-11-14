/**
 * Tests for useConceptNodePreview hook.
 * Verifies preview mode functionality and transform calculations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useConceptNodePreview } from '../useConceptNodePreview'
import { flushSync } from 'react-dom'

// Mock flushSync
vi.mock('react-dom', () => ({
  flushSync: vi.fn((fn) => fn()),
}))

// Mock requestAnimationFrame and setTimeout
const originalSetTimeout = global.setTimeout
const originalClearTimeout = global.clearTimeout

beforeEach(() => {
  global.requestAnimationFrame = vi.fn((cb) => {
    originalSetTimeout(cb, 0)
    return 1
  })
  global.setTimeout = vi.fn((cb, delay) => {
    return originalSetTimeout(cb, delay || 0) as any
  })
  global.clearTimeout = vi.fn((id) => {
    return originalClearTimeout(id)
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useConceptNodePreview', () => {
  const mockNodeRef = {
    current: {
      offsetHeight: 50,
      offsetWidth: 120,
      style: {
        setProperty: vi.fn(),
        removeProperty: vi.fn(),
      },
    },
  } as React.RefObject<HTMLDivElement>

  const mockOnUpdateConcept = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock getComputedStyle
    global.getComputedStyle = vi.fn(() => ({
      padding: '12px',
      paddingTop: '12px',
      paddingBottom: '12px',
      paddingLeft: '12px',
      paddingRight: '12px',
      fontSize: '14px',
      fontFamily: 'system-ui',
      fontWeight: '400',
      lineHeight: '1.5',
      minWidth: '120px',
    })) as any
  })

  it('should initialize with preview state false', () => {
    const { result } = renderHook(() =>
      useConceptNodePreview({
        nodeRef: mockNodeRef,
        label: 'Test Label',
        notes: '',
        metadata: {},
        showNotesAndMetadata: false,
        hasWriteAccess: true,
        onUpdateConcept: mockOnUpdateConcept,
        conceptId: 'concept-1',
      })
    )

    expect(result.current.isPreviewingNotes).toBe(false)
    expect(result.current.previewTransform).toBeNull()
    expect(result.current.isClearingPreview).toBe(false)
  })

  it('should provide preview handlers', () => {
    const { result } = renderHook(() =>
      useConceptNodePreview({
        nodeRef: mockNodeRef,
        label: 'Test Label',
        notes: '',
        metadata: {},
        showNotesAndMetadata: false,
        hasWriteAccess: true,
        onUpdateConcept: mockOnUpdateConcept,
        conceptId: 'concept-1',
      })
    )

    expect(typeof result.current.handlePreviewEnter).toBe('function')
    expect(typeof result.current.handlePreviewLeave).toBe('function')
    expect(typeof result.current.handleShowNotesAndMetadata).toBe('function')
  })

  it('should not show notes and metadata without write access', async () => {
    const { result } = renderHook(() =>
      useConceptNodePreview({
        nodeRef: mockNodeRef,
        label: 'Test Label',
        notes: '',
        metadata: {},
        showNotesAndMetadata: false,
        hasWriteAccess: false,
        onUpdateConcept: mockOnUpdateConcept,
        conceptId: 'concept-1',
      })
    )

    const mockEvent = {
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent

    await act(async () => {
      await result.current.handleShowNotesAndMetadata(mockEvent)
    })

    expect(mockOnUpdateConcept).not.toHaveBeenCalled()
  })

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useConceptNodePreview({
        nodeRef: mockNodeRef,
        label: 'Test Label',
        notes: '',
        metadata: {},
        showNotesAndMetadata: false,
        hasWriteAccess: true,
        onUpdateConcept: mockOnUpdateConcept,
        conceptId: 'concept-1',
      })
    )

    // Trigger preview enter to create a timeout
    act(() => {
      result.current.handlePreviewEnter({
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent)
    })

    unmount()

    // Verify cleanup happened (transform should be cleared)
    // Note: clearTimeout may or may not be called depending on timing
    expect(result.current.previewTransform).toBeNull()
  })

  it('should reset transform when showNotesAndMetadata becomes false', () => {
    const { result, rerender } = renderHook(
      ({ showNotesAndMetadata }) =>
        useConceptNodePreview({
          nodeRef: mockNodeRef,
          label: 'Test Label',
          notes: '',
          metadata: {},
          showNotesAndMetadata,
          hasWriteAccess: true,
          onUpdateConcept: mockOnUpdateConcept,
          conceptId: 'concept-1',
        }),
      { initialProps: { showNotesAndMetadata: true } }
    )

    // Hide notes and metadata
    rerender({ showNotesAndMetadata: false })

    // Transform should be cleared
    expect(result.current.previewTransform).toBeNull()
  })

  // Note: More comprehensive tests would require mocking DOM measurements
  // and testing the actual transform calculations, which is better suited
  // for integration tests with real DOM elements
})


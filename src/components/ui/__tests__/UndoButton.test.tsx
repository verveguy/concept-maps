/**
 * Tests for UndoButton component.
 * Verifies button behavior, keyboard shortcuts, and state management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UndoButton } from '../UndoButton'
import { useUndoStore } from '../../../stores/undoStore'
import type { DeleteConceptCommand } from '../../../stores/undoStore'

// Mock useUndo hook
const mockUndo = vi.fn().mockResolvedValue(true)
const mockCanUndo = vi.fn().mockReturnValue(false)
const mockGetHistory = vi.fn().mockReturnValue([])

vi.mock('../../../hooks/useUndo', () => ({
  useUndo: () => ({
    undo: mockUndo,
    canUndo: mockCanUndo,
    getHistory: mockGetHistory,
  }),
}))

describe('UndoButton', () => {
  beforeEach(() => {
    // Reset stores
    useUndoStore.getState().clearHistory()
    useUndoStore.getState().clearMutationHistory()
    useUndoStore.getState().clearRedoStack()
    
    // Reset mocks
    vi.clearAllMocks()
    mockCanUndo.mockReturnValue(false)
    mockGetHistory.mockReturnValue([])
  })

  it('should render undo button', () => {
    render(<UndoButton />)
    const button = screen.getByRole('button', { name: /undo/i })
    expect(button).toBeInTheDocument()
  })

  it('should be disabled when no history exists', () => {
    render(<UndoButton />)
    const button = screen.getByRole('button', { name: /undo/i })
    expect(button).toBeDisabled()
  })

  it('should be enabled when history exists', () => {
    mockCanUndo.mockReturnValue(true)
    mockGetHistory.mockReturnValue([{ type: 'concept', id: 'concept-1' }])
    
    // Add mutation to store
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().recordMutation(command)

    render(<UndoButton />)
    const button = screen.getByRole('button', { name: /undo/i })
    expect(button).not.toBeDisabled()
  })

  it('should call undo when clicked', async () => {
    mockCanUndo.mockReturnValue(true)
    mockGetHistory.mockReturnValue([{ type: 'concept', id: 'concept-1' }])
    
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().recordMutation(command)

    render(<UndoButton />)
    const button = screen.getByRole('button', { name: /undo/i })
    
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockUndo).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle Cmd+Z keyboard shortcut', async () => {
    mockCanUndo.mockReturnValue(true)
    mockGetHistory.mockReturnValue([{ type: 'concept', id: 'concept-1' }])
    
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().recordMutation(command)

    render(<UndoButton />)
    
    // Simulate Cmd+Z (Mac)
    fireEvent.keyDown(window, {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
    })
    
    await waitFor(() => {
      expect(mockUndo).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle Ctrl+Z keyboard shortcut', async () => {
    mockCanUndo.mockReturnValue(true)
    mockGetHistory.mockReturnValue([{ type: 'concept', id: 'concept-1' }])
    
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().recordMutation(command)

    render(<UndoButton />)
    
    // Simulate Ctrl+Z (Windows/Linux)
    fireEvent.keyDown(window, {
      key: 'z',
      metaKey: false,
      ctrlKey: true,
      shiftKey: false,
    })
    
    await waitFor(() => {
      expect(mockUndo).toHaveBeenCalledTimes(1)
    })
  })

  it('should not trigger undo when typing in input field', () => {
    mockCanUndo.mockReturnValue(true)
    
    render(
      <div>
        <input data-testid="test-input" />
        <UndoButton />
      </div>
    )
    
    const input = screen.getByTestId('test-input')
    input.focus()
    
    fireEvent.keyDown(input, {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
    })
    
    // Should not call undo when typing in input
    expect(mockUndo).not.toHaveBeenCalled()
  })

  it('should not trigger undo when typing in textarea', () => {
    mockCanUndo.mockReturnValue(true)
    
    render(
      <div>
        <textarea data-testid="test-textarea" />
        <UndoButton />
      </div>
    )
    
    const textarea = screen.getByTestId('test-textarea')
    textarea.focus()
    
    fireEvent.keyDown(textarea, {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
    })
    
    // Should not call undo when typing in textarea
    expect(mockUndo).not.toHaveBeenCalled()
  })

  it('should update button state when mutation history changes', () => {
    const { rerender } = render(<UndoButton />)
    
    // Initially disabled
    let button = screen.getByRole('button', { name: /undo/i })
    expect(button).toBeDisabled()
    
    // Add mutation
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().recordMutation(command)
    mockCanUndo.mockReturnValue(true)
    
    // Rerender to pick up store changes
    rerender(<UndoButton />)
    
    button = screen.getByRole('button', { name: /undo/i })
    expect(button).not.toBeDisabled()
  })
})


/**
 * Tests for RedoButton component.
 * Verifies button behavior, keyboard shortcuts, and state management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RedoButton } from '../RedoButton'
import { useUndoStore } from '../../../stores/undoStore'
import type { DeleteConceptCommand } from '../../../stores/undoStore'

// Mock useRedo hook
const mockRedo = vi.fn().mockResolvedValue(true)
const mockCanRedo = vi.fn().mockReturnValue(false)

vi.mock('../../../hooks/useRedo', () => ({
  useRedo: () => ({
    redo: mockRedo,
    canRedo: mockCanRedo,
  }),
}))

describe('RedoButton', () => {
  beforeEach(() => {
    // Reset stores
    useUndoStore.getState().clearHistory()
    useUndoStore.getState().clearMutationHistory()
    useUndoStore.getState().clearRedoStack()
    
    // Reset mocks
    vi.clearAllMocks()
    mockCanRedo.mockReturnValue(false)
  })

  it('should render redo button', () => {
    render(<RedoButton />)
    const button = screen.getByRole('button', { name: /redo/i })
    expect(button).toBeInTheDocument()
  })

  it('should be disabled when redo stack is empty', () => {
    render(<RedoButton />)
    const button = screen.getByRole('button', { name: /redo/i })
    expect(button).toBeDisabled()
  })

  it('should be enabled when redo stack has items', () => {
    mockCanRedo.mockReturnValue(true)
    
    // Add command to redo stack
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().pushToRedoStack([command])

    render(<RedoButton />)
    const button = screen.getByRole('button', { name: /redo/i })
    expect(button).not.toBeDisabled()
  })

  it('should call redo when clicked', async () => {
    mockCanRedo.mockReturnValue(true)
    
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().pushToRedoStack([command])

    render(<RedoButton />)
    const button = screen.getByRole('button', { name: /redo/i })
    
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockRedo).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle Cmd+Shift+Z keyboard shortcut', async () => {
    mockCanRedo.mockReturnValue(true)
    
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().pushToRedoStack([command])

    render(<RedoButton />)
    
    // Simulate Cmd+Shift+Z (Mac)
    fireEvent.keyDown(window, {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      shiftKey: true,
    })
    
    await waitFor(() => {
      expect(mockRedo).toHaveBeenCalledTimes(1)
    })
  })

  it('should handle Ctrl+Shift+Z keyboard shortcut', async () => {
    mockCanRedo.mockReturnValue(true)
    
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().pushToRedoStack([command])

    render(<RedoButton />)
    
    // Simulate Ctrl+Shift+Z (Windows/Linux)
    fireEvent.keyDown(window, {
      key: 'z',
      metaKey: false,
      ctrlKey: true,
      shiftKey: true,
    })
    
    await waitFor(() => {
      expect(mockRedo).toHaveBeenCalledTimes(1)
    })
  })

  it('should not trigger redo when typing in input field', () => {
    mockCanRedo.mockReturnValue(true)
    
    render(
      <div>
        <input data-testid="test-input" />
        <RedoButton />
      </div>
    )
    
    const input = screen.getByTestId('test-input')
    input.focus()
    
    fireEvent.keyDown(input, {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      shiftKey: true,
    })
    
    // Should not call redo when typing in input
    expect(mockRedo).not.toHaveBeenCalled()
  })

  it('should not trigger redo when typing in textarea', () => {
    mockCanRedo.mockReturnValue(true)
    
    render(
      <div>
        <textarea data-testid="test-textarea" />
        <RedoButton />
      </div>
    )
    
    const textarea = screen.getByTestId('test-textarea')
    textarea.focus()
    
    fireEvent.keyDown(textarea, {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      shiftKey: true,
    })
    
    // Should not call redo when typing in textarea
    expect(mockRedo).not.toHaveBeenCalled()
  })

  it('should update button state when redo stack changes', () => {
    const { rerender } = render(<RedoButton />)
    
    // Initially disabled
    let button = screen.getByRole('button', { name: /redo/i })
    expect(button).toBeDisabled()
    
    // Add to redo stack
    const command: DeleteConceptCommand = {
      type: 'deleteConcept',
      id: 'cmd-1',
      timestamp: Date.now(),
      operationId: 'op-1',
      conceptId: 'concept-1',
    }
    useUndoStore.getState().pushToRedoStack([command])
    mockCanRedo.mockReturnValue(true)
    
    // Rerender to pick up store changes
    rerender(<RedoButton />)
    
    button = screen.getByRole('button', { name: /redo/i })
    expect(button).not.toBeDisabled()
  })
})


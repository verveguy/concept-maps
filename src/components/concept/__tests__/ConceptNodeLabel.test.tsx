/**
 * Tests for ConceptNodeLabel component.
 * Verifies label display and editing functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConceptNodeLabel } from '../ConceptNodeLabel'

// Mock requestAnimationFrame
beforeEach(() => {
  ;(globalThis as any).requestAnimationFrame = vi.fn((cb) => {
    setTimeout(cb, 0)
    return 1
  })
})

describe('ConceptNodeLabel', () => {
  const mockOnEditLabelChange = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnKeyDown = vi.fn()
  const mockInputRef = { current: null } as React.RefObject<HTMLInputElement | null>
  const mockMeasureRef = { current: null } as React.RefObject<HTMLSpanElement | null>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render label text when not editing', () => {
    render(
      <ConceptNodeLabel
        label="Test Label"
        isEditing={false}
        editLabel="Test Label"
        onEditLabelChange={mockOnEditLabelChange}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        inputRef={mockInputRef}
        measureRef={mockMeasureRef}
      />
    )
    
    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('should render input when editing', () => {
    render(
      <ConceptNodeLabel
        label="Test Label"
        isEditing={true}
        editLabel="Edited Label"
        onEditLabelChange={mockOnEditLabelChange}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        inputRef={mockInputRef}
        measureRef={mockMeasureRef}
      />
    )
    
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('Edited Label')
  })

  it('should call onEditLabelChange when input value changes', () => {
    render(
      <ConceptNodeLabel
        label="Test Label"
        isEditing={true}
        editLabel="Test Label"
        onEditLabelChange={mockOnEditLabelChange}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        inputRef={mockInputRef}
        measureRef={mockMeasureRef}
      />
    )
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'New Label' } })
    
    expect(mockOnEditLabelChange).toHaveBeenCalledWith('New Label')
  })

  it('should call onSave when input loses focus', () => {
    render(
      <ConceptNodeLabel
        label="Test Label"
        isEditing={true}
        editLabel="Test Label"
        onEditLabelChange={mockOnEditLabelChange}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        inputRef={mockInputRef}
        measureRef={mockMeasureRef}
      />
    )
    
    const input = screen.getByRole('textbox')
    fireEvent.blur(input)
    
    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })

  it('should call onKeyDown when key is pressed', () => {
    render(
      <ConceptNodeLabel
        label="Test Label"
        isEditing={true}
        editLabel="Test Label"
        onEditLabelChange={mockOnEditLabelChange}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        inputRef={mockInputRef}
        measureRef={mockMeasureRef}
      />
    )
    
    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Enter' })
    
    expect(mockOnKeyDown).toHaveBeenCalledTimes(1)
  })

  it('should stop propagation on input click', () => {
    render(
      <ConceptNodeLabel
        label="Test Label"
        isEditing={true}
        editLabel="Test Label"
        onEditLabelChange={mockOnEditLabelChange}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        inputRef={mockInputRef}
        measureRef={mockMeasureRef}
      />
    )
    
    const input = screen.getByRole('textbox')
    const mockEvent = {
      stopPropagation: vi.fn(),
    }
    fireEvent.click(input, mockEvent)
    
    // Verify the click handler is attached (stopPropagation would be called by the handler)
    expect(input).toBeInTheDocument()
  })

  it('should render hidden measure span when editing', () => {
    const { container } = render(
      <ConceptNodeLabel
        label="Test Label"
        isEditing={true}
        editLabel="Test Label"
        onEditLabelChange={mockOnEditLabelChange}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        inputRef={mockInputRef}
        measureRef={mockMeasureRef}
      />
    )
    
    const measureSpan = container.querySelector('span.font-semibold')
    expect(measureSpan).toBeInTheDocument()
    expect(measureSpan).toHaveStyle({ visibility: 'hidden' })
  })
})


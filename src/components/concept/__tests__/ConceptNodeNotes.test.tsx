/**
 * Tests for ConceptNodeNotes component.
 * Verifies notes display and editing functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConceptNodeNotes } from '../ConceptNodeNotes'

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => {
    return <div data-testid="markdown">{String(children)}</div>
  },
}))

vi.mock('remark-gfm', () => ({
  default: {},
}))

vi.mock('remark-breaks', () => ({
  default: {},
}))

describe('ConceptNodeNotes', () => {
  const mockOnEditNotesChange = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnSave = vi.fn()
  const mockOnKeyDown = vi.fn()
  const mockNotesTextareaRef = { current: null } as React.RefObject<HTMLTextAreaElement>
  const mockNotesDisplayRef = { current: null } as React.RefObject<HTMLDivElement>
  const mockNotesMeasureRef = { current: null } as React.RefObject<HTMLSpanElement>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when notes are empty and not editing', () => {
    const { container } = render(
      <ConceptNodeNotes
        notes=""
        isEditing={false}
        editNotes=""
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={true}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={false}
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should render notes when shouldShow is true', () => {
    render(
      <ConceptNodeNotes
        notes="Test notes"
        isEditing={false}
        editNotes="Test notes"
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={true}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={true}
      />
    )
    
    expect(screen.getByTestId('markdown')).toBeInTheDocument()
    expect(screen.getByTestId('markdown')).toHaveTextContent('Test notes')
  })

  it('should render textarea when editing', () => {
    render(
      <ConceptNodeNotes
        notes="Test notes"
        isEditing={true}
        editNotes="Edited notes"
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={true}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={true}
      />
    )
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue('Edited notes')
  })

  it('should call onEditNotesChange when textarea value changes', () => {
    render(
      <ConceptNodeNotes
        notes="Test notes"
        isEditing={true}
        editNotes="Test notes"
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={true}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={true}
      />
    )
    
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'New notes' } })
    
    expect(mockOnEditNotesChange).toHaveBeenCalledWith('New notes')
  })

  it('should call onSave when textarea loses focus', () => {
    render(
      <ConceptNodeNotes
        notes="Test notes"
        isEditing={true}
        editNotes="Test notes"
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={true}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={true}
      />
    )
    
    const textarea = screen.getByRole('textbox')
    fireEvent.blur(textarea)
    
    expect(mockOnSave).toHaveBeenCalledTimes(1)
  })

  it('should call onEdit when display div is clicked and user has write access', () => {
    const { container } = render(
      <ConceptNodeNotes
        notes="Test notes"
        isEditing={false}
        editNotes="Test notes"
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={true}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={true}
      />
    )
    
    // Find the display div (it contains the markdown component)
    const displayDiv = container.querySelector('div[class*="cursor-text"]')
    if (displayDiv) {
      fireEvent.click(displayDiv)
      expect(mockOnEdit).toHaveBeenCalledTimes(1)
    } else {
      // Fallback: click on markdown container
      const markdown = screen.getByTestId('markdown')
      fireEvent.click(markdown.parentElement || markdown)
      expect(mockOnEdit).toHaveBeenCalledTimes(1)
    }
  })

  it('should not call onEdit when display div is clicked without write access', () => {
    const { container } = render(
      <ConceptNodeNotes
        notes="Test notes"
        isEditing={false}
        editNotes="Test notes"
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={false}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={true}
      />
    )
    
    // Find the display div (should not have cursor-text class when no write access)
    const displayDiv = container.querySelector('div')
    if (displayDiv) {
      fireEvent.click(displayDiv)
      expect(mockOnEdit).not.toHaveBeenCalled()
    }
  })

  it('should render placeholder when editing empty notes', () => {
    render(
      <ConceptNodeNotes
        notes=""
        isEditing={true}
        editNotes=""
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={true}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={true}
      />
    )
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('placeholder', 'Add notes (Markdown supported)...')
  })

  it('should disable textarea when user does not have write access', () => {
    render(
      <ConceptNodeNotes
        notes="Test notes"
        isEditing={true}
        editNotes="Test notes"
        onEditNotesChange={mockOnEditNotesChange}
        onEdit={mockOnEdit}
        onSave={mockOnSave}
        onKeyDown={mockOnKeyDown}
        textColor="#000000"
        hasWriteAccess={false}
        notesTextareaRef={mockNotesTextareaRef}
        notesDisplayRef={mockNotesDisplayRef}
        notesMeasureRef={mockNotesMeasureRef}
        notesDisplayHeight={null}
        notesDisplayWidth={null}
        shouldShow={true}
      />
    )
    
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeDisabled()
  })
})


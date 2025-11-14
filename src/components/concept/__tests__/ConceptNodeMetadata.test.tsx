/**
 * Tests for ConceptNodeMetadata component.
 * Verifies metadata display and expansion behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConceptNodeMetadata } from '../ConceptNodeMetadata'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down">Down</div>,
  ChevronUp: () => <div data-testid="chevron-up">Up</div>,
}))

describe('ConceptNodeMetadata', () => {
  const mockOnToggleExpand = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when metadata is empty', () => {
    const { container } = render(
      <ConceptNodeMetadata
        metadata={{}}
        isExpanded={false}
        onToggleExpand={mockOnToggleExpand}
        textColor="#000000"
        borderColor="#cccccc"
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should not render when metadata only contains style attributes', () => {
    const { container } = render(
      <ConceptNodeMetadata
        metadata={{
          fillColor: '#ffffff',
          borderColor: '#000000',
          borderStyle: 'solid',
          textColor: '#333333',
        }}
        isExpanded={false}
        onToggleExpand={mockOnToggleExpand}
        textColor="#000000"
        borderColor="#cccccc"
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should render metadata count when collapsed', () => {
    render(
      <ConceptNodeMetadata
        metadata={{
          category: 'important',
          tags: ['tag1', 'tag2'],
        }}
        isExpanded={false}
        onToggleExpand={mockOnToggleExpand}
        textColor="#000000"
        borderColor="#cccccc"
      />
    )
    
    expect(screen.getByText('2 metadata field(s)')).toBeInTheDocument()
    expect(screen.getByTestId('chevron-down')).toBeInTheDocument()
  })

  it('should render metadata count when expanded', () => {
    render(
      <ConceptNodeMetadata
        metadata={{
          category: 'important',
          tags: ['tag1', 'tag2'],
        }}
        isExpanded={true}
        onToggleExpand={mockOnToggleExpand}
        textColor="#000000"
        borderColor="#cccccc"
      />
    )
    
    expect(screen.getByText('2 metadata field(s)')).toBeInTheDocument()
    expect(screen.getByTestId('chevron-up')).toBeInTheDocument()
  })

  it('should call onToggleExpand when button is clicked', () => {
    render(
      <ConceptNodeMetadata
        metadata={{
          category: 'important',
        }}
        isExpanded={false}
        onToggleExpand={mockOnToggleExpand}
        textColor="#000000"
        borderColor="#cccccc"
      />
    )
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnToggleExpand).toHaveBeenCalledTimes(1)
  })

  it('should render metadata entries when expanded', () => {
    render(
      <ConceptNodeMetadata
        metadata={{
          category: 'important',
          description: 'Test description',
        }}
        isExpanded={true}
        onToggleExpand={mockOnToggleExpand}
        textColor="#000000"
        borderColor="#cccccc"
      />
    )
    
    expect(screen.getByText(/category:/)).toBeInTheDocument()
    expect(screen.getByText(/important/)).toBeInTheDocument()
    expect(screen.getByText(/description:/)).toBeInTheDocument()
    expect(screen.getByText(/Test description/)).toBeInTheDocument()
  })

  it('should stringify object values', () => {
    render(
      <ConceptNodeMetadata
        metadata={{
          tags: ['tag1', 'tag2'],
        }}
        isExpanded={true}
        onToggleExpand={mockOnToggleExpand}
        textColor="#000000"
        borderColor="#cccccc"
      />
    )
    
    expect(screen.getByText(/tags:/)).toBeInTheDocument()
    expect(screen.getByText(/\["tag1","tag2"\]/)).toBeInTheDocument()
  })

  it('should filter out empty keys', () => {
    render(
      <ConceptNodeMetadata
        metadata={{
          category: 'important',
          '': 'empty key value',
        }}
        isExpanded={true}
        onToggleExpand={mockOnToggleExpand}
        textColor="#000000"
        borderColor="#cccccc"
      />
    )
    
    expect(screen.getByText(/category:/)).toBeInTheDocument()
    expect(screen.queryByText(/empty key value/)).not.toBeInTheDocument()
  })
})


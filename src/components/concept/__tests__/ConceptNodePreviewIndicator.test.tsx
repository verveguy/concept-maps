/**
 * Tests for ConceptNodePreviewIndicator component.
 * Verifies preview indicator button rendering and interactions.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConceptNodePreviewIndicator } from '../ConceptNodePreviewIndicator'

// Mock lucide-react Info icon
vi.mock('lucide-react', () => ({
  Info: ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
    <svg data-testid="info-icon" className={className} style={style}>
      Info
    </svg>
  ),
}))

describe('ConceptNodePreviewIndicator', () => {
  const mockOnClick = vi.fn()
  const mockOnMouseEnter = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render info icon', () => {
    render(
      <ConceptNodePreviewIndicator
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
        hasWriteAccess={true}
        textColor="#000000"
      />
    )
    
    expect(screen.getByTestId('info-icon')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    render(
      <ConceptNodePreviewIndicator
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
        hasWriteAccess={true}
        textColor="#000000"
      />
    )
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('should call onMouseEnter when mouse enters', () => {
    render(
      <ConceptNodePreviewIndicator
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
        hasWriteAccess={true}
        textColor="#000000"
      />
    )
    
    const button = screen.getByRole('button')
    fireEvent.mouseEnter(button)
    
    expect(mockOnMouseEnter).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when user does not have write access', () => {
    render(
      <ConceptNodePreviewIndicator
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
        hasWriteAccess={false}
        textColor="#000000"
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('should have correct cursor style based on write access', () => {
    const { rerender } = render(
      <ConceptNodePreviewIndicator
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
        hasWriteAccess={true}
        textColor="#000000"
      />
    )
    
    let button = screen.getByRole('button')
    expect(button).toHaveStyle({ cursor: 'pointer' })
    
    rerender(
      <ConceptNodePreviewIndicator
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
        hasWriteAccess={false}
        textColor="#000000"
      />
    )
    
    button = screen.getByRole('button')
    expect(button).toHaveStyle({ cursor: 'default' })
  })

  it('should have correct title attribute', () => {
    render(
      <ConceptNodePreviewIndicator
        onClick={mockOnClick}
        onMouseEnter={mockOnMouseEnter}
        hasWriteAccess={true}
        textColor="#000000"
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'Hover to preview or click to show notes and metadata')
  })
})


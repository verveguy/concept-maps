/**
 * Tests for ConceptNodeHandles component.
 * Verifies rendering of connection handles.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ConceptNodeHandles } from '../ConceptNodeHandles'

// Mock React Flow Handle component
vi.mock('reactflow', () => ({
  Handle: ({ type, position, style }: { type: string; position: string; style: React.CSSProperties }) => (
    <div
      data-testid={`handle-${type}-${position}`}
      data-style={JSON.stringify(style)}
    >
      Handle {type} {position}
    </div>
  ),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
  },
}))

describe('ConceptNodeHandles', () => {
  it('should render target and source handles', () => {
    const { getByTestId } = render(<ConceptNodeHandles isOptionHovered={false} />)
    
    expect(getByTestId('handle-target-top')).toBeInTheDocument()
    expect(getByTestId('handle-source-bottom')).toBeInTheDocument()
  })

  it('should render collapsed handle style when not hovered', () => {
    const { getByTestId } = render(<ConceptNodeHandles isOptionHovered={false} />)
    
    const handle = getByTestId('handle-target-top')
    const style = JSON.parse(handle.getAttribute('data-style') || '{}')
    
    expect(style.width).toBe('20px')
    expect(style.height).toBe('20px')
    expect(style.borderRadius).toBe('50%')
  })

  it('should render expanded handle style when hovered', () => {
    const { getByTestId } = render(<ConceptNodeHandles isOptionHovered={true} />)
    
    const handle = getByTestId('handle-target-top')
    const style = JSON.parse(handle.getAttribute('data-style') || '{}')
    
    expect(style.width).toBe('100%')
    expect(style.height).toBe('100%')
    expect(style.borderRadius).toBe('8px')
  })

  it('should position handle at center when not hovered', () => {
    const { getByTestId } = render(<ConceptNodeHandles isOptionHovered={false} />)
    
    const handle = getByTestId('handle-target-top')
    const style = JSON.parse(handle.getAttribute('data-style') || '{}')
    
    expect(style.top).toBe('50%')
    expect(style.left).toBe('50%')
  })

  it('should position handle at edges when hovered', () => {
    const { getByTestId } = render(<ConceptNodeHandles isOptionHovered={true} />)
    
    const handle = getByTestId('handle-target-top')
    const style = JSON.parse(handle.getAttribute('data-style') || '{}')
    
    expect(style.top).toBe('0')
    expect(style.left).toBe('0')
  })
})


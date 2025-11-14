/**
 * Tests for useConceptNodeStyle hook.
 * Verifies theme-aware style calculation and memoization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useConceptNodeStyle } from '../useConceptNodeStyle'

const mockContains = vi.fn(() => false)

beforeEach(() => {
  vi.clearAllMocks()
  mockContains.mockReturnValue(false)
  // Set up document.documentElement.classList.contains
  // In jsdom, document.documentElement already exists, we just need to mock classList.contains
  Object.defineProperty(document.documentElement, 'classList', {
    value: {
      contains: mockContains,
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
    },
    writable: true,
    configurable: true,
  })
})

describe('useConceptNodeStyle', () => {
  it('should return light mode defaults when metadata is empty', () => {
    const { result } = renderHook(() => useConceptNodeStyle({}, false))
    
    expect(result.current.fillColor).toBe('hsl(0 0% 100%)')
    expect(result.current.borderColor).toBe('hsl(214.3 31.8% 91.4%)')
    expect(result.current.textColor).toBe('hsl(222.2 84% 4.9%)')
    expect(result.current.borderStyle).toBe('solid')
    expect(result.current.borderThickness).toBe(2)
  })
  
  it('should return dark mode defaults when dark class is present', () => {
    mockContains.mockReturnValue(true)
    const { result } = renderHook(() => useConceptNodeStyle({}, false))
    
    expect(result.current.fillColor).toBe('hsl(222.2 84% 4.9%)')
    expect(result.current.borderColor).toBe('hsl(217.2 32.6% 17.5%)')
    expect(result.current.textColor).toBe('hsl(210 40% 98%)')
  })
  
  it('should use custom metadata values when provided', () => {
    const metadata = {
      fillColor: '#ff0000',
      borderColor: '#00ff00',
      borderStyle: 'dashed',
      textColor: '#0000ff',
      borderThickness: 3,
    }
    const { result } = renderHook(() => useConceptNodeStyle(metadata, false))
    
    expect(result.current.fillColor).toBe('#ff0000')
    expect(result.current.borderColor).toBe('#00ff00')
    expect(result.current.borderStyle).toBe('dashed')
    expect(result.current.textColor).toBe('#0000ff')
    expect(result.current.borderThickness).toBe(3)
  })
  
  it('should override fill color when selected', () => {
    const metadata = {
      fillColor: '#ffffff',
    }
    const { result } = renderHook(() => useConceptNodeStyle(metadata, true))
    
    expect(result.current.fillColor).toBe('hsl(54 96% 88%)') // Selected fill color in light mode
    expect(result.current.borderColor).toBe('hsl(222.2 47.4% 11.2%)') // Selected border color
  })
  
  it('should memoize style calculation', () => {
    const metadata = { fillColor: '#ff0000' }
    const { result, rerender } = renderHook(
      ({ metadata, selected }) => useConceptNodeStyle(metadata, selected),
      { initialProps: { metadata, selected: false } }
    )
    
    const firstResult = result.current
    
    // Rerender with same props
    rerender({ metadata, selected: false })
    
    // Should return same object reference (memoized)
    expect(result.current).toBe(firstResult)
  })
  
  it('should recalculate when metadata changes', () => {
    const { result, rerender } = renderHook(
      ({ metadata, selected }) => useConceptNodeStyle(metadata, selected),
      { initialProps: { metadata: { fillColor: '#ff0000' }, selected: false } }
    )
    
    expect(result.current.fillColor).toBe('#ff0000')
    
    // Change metadata
    rerender({ metadata: { fillColor: '#00ff00' }, selected: false })
    
    expect(result.current.fillColor).toBe('#00ff00')
  })
  
  it('should recalculate when selected state changes', () => {
    const metadata = { fillColor: '#ffffff' }
    const { result, rerender } = renderHook(
      ({ metadata, selected }) => useConceptNodeStyle(metadata, selected),
      { initialProps: { metadata, selected: false } }
    )
    
    expect(result.current.fillColor).toBe('#ffffff')
    
    // Change selected state
    rerender({ metadata, selected: true })
    
    expect(result.current.fillColor).toBe('hsl(54 96% 88%)') // Selected fill color
  })
})


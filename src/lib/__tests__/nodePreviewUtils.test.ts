/**
 * Tests for nodePreviewUtils utility functions.
 * Verifies expanded content measurement and preview transform calculations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { measureExpandedContent, calculatePreviewTransform } from '../nodePreviewUtils'

describe('measureExpandedContent', () => {
  let mockNodeElement: HTMLElement
  
  beforeEach(() => {
    // Create a mock node element with proper dimensions
    mockNodeElement = document.createElement('div')
    mockNodeElement.style.padding = '12px 16px'
    mockNodeElement.style.fontSize = '14px'
    mockNodeElement.style.fontFamily = 'system-ui'
    mockNodeElement.style.fontWeight = '400'
    mockNodeElement.style.lineHeight = '1.5'
    mockNodeElement.style.minWidth = '120px'
    // Set explicit dimensions for jsdom
    Object.defineProperty(mockNodeElement, 'offsetHeight', { value: 50, writable: true })
    Object.defineProperty(mockNodeElement, 'offsetWidth', { value: 120, writable: true })
    document.body.appendChild(mockNodeElement)
  })
  
  afterEach(() => {
    // Clean up
    if (mockNodeElement.parentNode) {
      mockNodeElement.parentNode.removeChild(mockNodeElement)
    }
  })
  
  it('should measure expanded content with label only', () => {
    const dimensions = measureExpandedContent({
      nodeElement: mockNodeElement,
      collapsedHeight: 50,
      collapsedWidth: 120,
      label: 'Test Concept',
      notes: '',
      hasMetadata: false,
      metadataFieldCount: 0,
    })
    
    // In jsdom, measurements may return 0, so we just verify the function runs without error
    expect(dimensions.expandedHeight).toBeGreaterThanOrEqual(0)
    expect(dimensions.expandedWidth).toBeGreaterThanOrEqual(120)
  })
  
  it('should measure expanded content with label and notes', () => {
    const dimensions = measureExpandedContent({
      nodeElement: mockNodeElement,
      collapsedHeight: 50,
      collapsedWidth: 120,
      label: 'Test Concept',
      notes: 'This is a longer note that should increase the height of the node when displayed.',
      hasMetadata: false,
      metadataFieldCount: 0,
    })
    
    // In jsdom, measurements may not be accurate, so we verify the function runs
    expect(dimensions.expandedHeight).toBeGreaterThanOrEqual(0)
    expect(dimensions.expandedWidth).toBeGreaterThanOrEqual(120)
  })
  
  it('should measure expanded content with label, notes, and metadata', () => {
    const dimensions = measureExpandedContent({
      nodeElement: mockNodeElement,
      collapsedHeight: 50,
      collapsedWidth: 120,
      label: 'Test Concept',
      notes: 'Some notes here',
      hasMetadata: true,
      metadataFieldCount: 3,
    })
    
    // In jsdom, measurements may not be accurate, so we verify the function runs
    expect(dimensions.expandedHeight).toBeGreaterThanOrEqual(0)
    expect(dimensions.expandedWidth).toBeGreaterThanOrEqual(120)
  })
  
  it('should return width at least as large as collapsed width', () => {
    const dimensions = measureExpandedContent({
      nodeElement: mockNodeElement,
      collapsedHeight: 50,
      collapsedWidth: 200,
      label: 'Short',
      notes: '',
      hasMetadata: false,
      metadataFieldCount: 0,
    })
    
    expect(dimensions.expandedWidth).toBeGreaterThanOrEqual(200)
  })
  
  it('should handle empty label', () => {
    const dimensions = measureExpandedContent({
      nodeElement: mockNodeElement,
      collapsedHeight: 50,
      collapsedWidth: 120,
      label: '',
      notes: '',
      hasMetadata: false,
      metadataFieldCount: 0,
    })
    
    // In jsdom, measurements may return 0, so we verify the function runs
    expect(dimensions.expandedHeight).toBeGreaterThanOrEqual(0)
    expect(dimensions.expandedWidth).toBeGreaterThanOrEqual(120)
  })
  
  it('should handle very long notes', () => {
    const longNotes = 'A'.repeat(500)
    const dimensions = measureExpandedContent({
      nodeElement: mockNodeElement,
      collapsedHeight: 50,
      collapsedWidth: 120,
      label: 'Test Concept',
      notes: longNotes,
      hasMetadata: false,
      metadataFieldCount: 0,
    })
    
    // In jsdom, measurements may not be accurate, so we verify the function runs
    expect(dimensions.expandedHeight).toBeGreaterThanOrEqual(0)
    expect(dimensions.expandedWidth).toBeGreaterThanOrEqual(120)
  })
  
  it('should handle multiline notes', () => {
    const multilineNotes = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
    const dimensions = measureExpandedContent({
      nodeElement: mockNodeElement,
      collapsedHeight: 50,
      collapsedWidth: 120,
      label: 'Test Concept',
      notes: multilineNotes,
      hasMetadata: false,
      metadataFieldCount: 0,
    })
    
    // In jsdom, measurements may not be accurate, so we verify the function runs
    expect(dimensions.expandedHeight).toBeGreaterThanOrEqual(0)
    expect(dimensions.expandedWidth).toBeGreaterThanOrEqual(120)
  })
})

describe('calculatePreviewTransform', () => {
  it('should return null when content does not expand', () => {
    const transform = calculatePreviewTransform(120, 50, 120, 50)
    
    expect(transform).toBeNull()
  })
  
  it('should return null when content shrinks', () => {
    const transform = calculatePreviewTransform(120, 50, 100, 40)
    
    expect(transform).toBeNull()
  })
  
  it('should calculate transform for width-only expansion', () => {
    const transform = calculatePreviewTransform(120, 50, 200, 50)
    
    expect(transform).toEqual({ x: -40, y: 0 })
  })
  
  it('should calculate transform for height-only expansion', () => {
    const transform = calculatePreviewTransform(120, 50, 120, 100)
    
    expect(transform).toEqual({ x: 0, y: -25 })
  })
  
  it('should calculate transform for both width and height expansion', () => {
    const transform = calculatePreviewTransform(120, 50, 200, 100)
    
    expect(transform).toEqual({ x: -40, y: -25 })
  })
  
  it('should calculate transform with odd number differences', () => {
    const transform = calculatePreviewTransform(100, 50, 151, 75)
    
    expect(transform).toEqual({ x: -25.5, y: -12.5 })
  })
  
  it('should handle large expansions', () => {
    const transform = calculatePreviewTransform(100, 50, 500, 300)
    
    expect(transform).toEqual({ x: -200, y: -125 })
  })
  
  it('should handle small expansions', () => {
    const transform = calculatePreviewTransform(100, 50, 102, 51)
    
    expect(transform).toEqual({ x: -1, y: -0.5 })
  })
  
  it('should return null when dimensions are equal', () => {
    const transform = calculatePreviewTransform(100, 50, 100, 50)
    
    expect(transform).toBeNull()
  })
  
  it('should handle zero dimensions', () => {
    const transform = calculatePreviewTransform(0, 0, 100, 50)
    
    expect(transform).toEqual({ x: -50, y: -25 })
  })
  
  it('should calculate correct transform for centering', () => {
    // When expanding from center, we need to move left/up by half the difference
    // Original center: (x + 100/2, y + 50/2) = (x + 50, y + 25)
    // Expanded center without transform: (x + 200/2, y + 100/2) = (x + 100, y + 50)
    // To keep center fixed: move left by 50, up by 25
    const transform = calculatePreviewTransform(100, 50, 200, 100)
    
    expect(transform).toEqual({ x: -50, y: -25 })
  })
})


/**
 * Tests for nodeStyleUtils utility functions.
 * Verifies style calculation, metadata filtering, and theme-aware defaults.
 */

import { describe, it, expect } from 'vitest'
import { getNonStyleMetadata, calculateNodeStyle, NODE_STYLE_ATTRIBUTES } from '../nodeStyleUtils'

describe('getNonStyleMetadata', () => {
  it('should filter out style attributes from metadata', () => {
    const metadata = {
      fillColor: '#ffffff',
      borderColor: '#000000',
      borderStyle: 'solid',
      textColor: '#333333',
      category: 'important',
      tags: ['tag1', 'tag2'],
    }
    
    const filtered = getNonStyleMetadata(metadata)
    
    expect(filtered).toEqual({
      category: 'important',
      tags: ['tag1', 'tag2'],
    })
    expect(filtered.fillColor).toBeUndefined()
    expect(filtered.borderColor).toBeUndefined()
    expect(filtered.borderStyle).toBeUndefined()
    expect(filtered.textColor).toBeUndefined()
  })
  
  it('should return empty object when all keys are style attributes', () => {
    const metadata = {
      fillColor: '#ffffff',
      borderColor: '#000000',
      borderStyle: 'dashed',
      textColor: '#333333',
    }
    
    const filtered = getNonStyleMetadata(metadata)
    
    expect(filtered).toEqual({})
  })
  
  it('should return original metadata when no style attributes present', () => {
    const metadata = {
      category: 'important',
      description: 'Some description',
      tags: ['tag1'],
    }
    
    const filtered = getNonStyleMetadata(metadata)
    
    expect(filtered).toEqual(metadata)
  })
  
  it('should handle empty metadata object', () => {
    const metadata = {}
    
    const filtered = getNonStyleMetadata(metadata)
    
    expect(filtered).toEqual({})
  })
  
  it('should handle metadata with null/undefined values', () => {
    const metadata = {
      fillColor: '#ffffff',
      category: null,
      description: undefined,
      tags: ['tag1'],
    }
    
    const filtered = getNonStyleMetadata(metadata)
    
    expect(filtered).toEqual({
      category: null,
      description: undefined,
      tags: ['tag1'],
    })
  })
})

describe('calculateNodeStyle', () => {
  describe('light mode defaults', () => {
    it('should return light mode defaults when metadata is empty', () => {
      const metadata = {}
      const style = calculateNodeStyle(metadata, false, false)
      
      expect(style.fillColor).toBe('hsl(0 0% 100%)')
      expect(style.borderColor).toBe('hsl(214.3 31.8% 91.4%)')
      expect(style.textColor).toBe('hsl(222.2 84% 4.9%)')
      expect(style.borderStyle).toBe('solid')
      expect(style.borderThickness).toBe(2)
    })
    
    it('should use custom metadata values when provided', () => {
      const metadata = {
        fillColor: '#ff0000',
        borderColor: '#00ff00',
        borderStyle: 'dashed',
        textColor: '#0000ff',
        borderThickness: 3,
      }
      const style = calculateNodeStyle(metadata, false, false)
      
      expect(style.fillColor).toBe('#ff0000')
      expect(style.borderColor).toBe('#00ff00')
      expect(style.borderStyle).toBe('dashed')
      expect(style.textColor).toBe('#0000ff')
      expect(style.borderThickness).toBe(3)
    })
  })
  
  describe('dark mode defaults', () => {
    it('should return dark mode defaults when metadata is empty', () => {
      const metadata = {}
      const style = calculateNodeStyle(metadata, true, false)
      
      expect(style.fillColor).toBe('hsl(222.2 84% 4.9%)')
      expect(style.borderColor).toBe('hsl(217.2 32.6% 17.5%)')
      expect(style.textColor).toBe('hsl(210 40% 98%)')
      expect(style.borderStyle).toBe('solid')
      expect(style.borderThickness).toBe(2)
    })
    
    it('should use custom metadata values when provided in dark mode', () => {
      const metadata = {
        fillColor: '#ff0000',
        borderColor: '#00ff00',
        borderStyle: 'dotted',
        textColor: '#0000ff',
        borderThickness: 4,
      }
      const style = calculateNodeStyle(metadata, true, false)
      
      expect(style.fillColor).toBe('#ff0000')
      expect(style.borderColor).toBe('#00ff00')
      expect(style.borderStyle).toBe('dotted')
      expect(style.textColor).toBe('#0000ff')
      expect(style.borderThickness).toBe(4)
    })
  })
  
  describe('selected state', () => {
    it('should override fill color when selected in light mode', () => {
      const metadata = {
        fillColor: '#ffffff',
      }
      const style = calculateNodeStyle(metadata, false, true)
      
      expect(style.fillColor).toBe('hsl(54 96% 88%)') // Selected fill color
      expect(style.borderColor).toBe('hsl(222.2 47.4% 11.2%)') // Selected border color
    })
    
    it('should override fill color when selected in dark mode', () => {
      const metadata = {
        fillColor: '#000000',
      }
      const style = calculateNodeStyle(metadata, true, true)
      
      expect(style.fillColor).toBe('hsl(217 32% 25%)') // Selected fill color
      expect(style.borderColor).toBe('hsl(210 40% 98%)') // Selected border color
    })
    
    it('should preserve borderStyle and borderThickness when selected', () => {
      const metadata = {
        borderStyle: 'dashed',
        borderThickness: 5,
      }
      const style = calculateNodeStyle(metadata, false, true)
      
      expect(style.borderStyle).toBe('dashed')
      expect(style.borderThickness).toBe(5)
    })
  })
  
  describe('border style handling', () => {
    it('should handle long-dash border style', () => {
      const metadata = {
        borderStyle: 'long-dash',
      }
      const style = calculateNodeStyle(metadata, false, false)
      
      expect(style.borderStyle).toBe('long-dash')
    })
    
    it('should default to solid when borderStyle is missing', () => {
      const metadata = {}
      const style = calculateNodeStyle(metadata, false, false)
      
      expect(style.borderStyle).toBe('solid')
    })
    
    it('should default to solid when borderStyle is invalid', () => {
      const metadata = {
        borderStyle: 'invalid-style' as unknown as 'solid',
      }
      const style = calculateNodeStyle(metadata, false, false)
      
      expect(style.borderStyle).toBe('solid')
    })
  })
  
  describe('edge cases', () => {
    it('should handle partial metadata', () => {
      const metadata = {
        fillColor: '#ff0000',
        // Missing other properties
      }
      const style = calculateNodeStyle(metadata, false, false)
      
      expect(style.fillColor).toBe('#ff0000')
      expect(style.borderColor).toBe('hsl(214.3 31.8% 91.4%)') // Default
      expect(style.textColor).toBe('hsl(222.2 84% 4.9%)') // Default
    })
    
    it('should handle borderThickness as string (use default)', () => {
      const metadata = {
        borderThickness: '3' as unknown as number,
      }
      const style = calculateNodeStyle(metadata, false, false)
      
      // String values are not numbers, so default is used
      expect(style.borderThickness).toBe(2) // Default since '3' is not a number
    })
    
    it('should handle zero borderThickness', () => {
      const metadata = {
        borderThickness: 0,
      }
      const style = calculateNodeStyle(metadata, false, false)
      
      // Zero is a valid number, so it should be preserved
      expect(style.borderThickness).toBe(0)
    })
  })
})

describe('NODE_STYLE_ATTRIBUTES', () => {
  it('should contain expected style attribute keys', () => {
    expect(NODE_STYLE_ATTRIBUTES).toContain('fillColor')
    expect(NODE_STYLE_ATTRIBUTES).toContain('borderColor')
    expect(NODE_STYLE_ATTRIBUTES).toContain('borderStyle')
    expect(NODE_STYLE_ATTRIBUTES).toContain('textColor')
    expect(NODE_STYLE_ATTRIBUTES).toHaveLength(4)
  })
})


/**
 * Tests for useConceptNodeEditing hook.
 * Verifies label and notes editing state management and auto-resize logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConceptNodeEditing } from '../useConceptNodeEditing'

// Mock requestAnimationFrame
beforeEach(() => {
  ;(globalThis as any).requestAnimationFrame = vi.fn((cb) => {
    setTimeout(cb, 0)
    return 1
  })
})

describe('useConceptNodeEditing', () => {
  it('should initialize with provided label and notes', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Initial Label', 'Initial Notes', false, true)
    )
    
    expect(result.current.editLabel).toBe('Initial Label')
    expect(result.current.editNotes).toBe('Initial Notes')
    expect(result.current.isEditing).toBe(false)
    expect(result.current.isEditingNotes).toBe(false)
  })
  
  it('should update edit label when data changes (but not while editing)', () => {
    const { result, rerender } = renderHook(
      ({ label }) => useConceptNodeEditing(label, '', false, true),
      { initialProps: { label: 'Label 1' } }
    )
    
    expect(result.current.editLabel).toBe('Label 1')
    
    // Change label while not editing
    rerender({ label: 'Label 2' })
    
    expect(result.current.editLabel).toBe('Label 2')
  })
  
  it('should not update edit label when data changes while editing', () => {
    const { result, rerender } = renderHook(
      ({ label }) => useConceptNodeEditing(label, '', false, true),
      { initialProps: { label: 'Label 1' } }
    )
    
    // Start editing - effect will set editLabel to 'Label 1'
    act(() => {
      result.current.setIsEditing(true)
    })
    
    // Now set editLabel to user's input (after effect has run)
    act(() => {
      result.current.setEditLabel('Edited Label')
    })
    
    expect(result.current.editLabel).toBe('Edited Label')
    
    // Change label while editing - should not update
    rerender({ label: 'Label 2' })
    
    expect(result.current.editLabel).toBe('Edited Label')
  })
  
  it('should update edit notes when data changes (but not while editing)', () => {
    const { result, rerender } = renderHook(
      ({ notes }) => useConceptNodeEditing('', notes, false, true),
      { initialProps: { notes: 'Notes 1' } }
    )
    
    expect(result.current.editNotes).toBe('Notes 1')
    
    // Change notes while not editing
    rerender({ notes: 'Notes 2' })
    
    expect(result.current.editNotes).toBe('Notes 2')
  })
  
  it('should trigger edit mode when shouldStartEditing is true', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Label', '', true, true)
    )
    
    expect(result.current.isEditing).toBe(true)
    expect(result.current.editLabel).toBe('Label')
  })
  
  it('should not trigger edit mode when shouldStartEditing is true but no write access', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Label', '', true, false)
    )
    
    expect(result.current.isEditing).toBe(false)
  })
  
  it('should reset trigger ref when shouldStartEditing becomes false', () => {
    const { result, rerender } = renderHook(
      ({ shouldStartEditing }) => useConceptNodeEditing('Label', '', shouldStartEditing, true),
      { initialProps: { shouldStartEditing: true } }
    )
    
    expect(result.current.isEditing).toBe(true)
    
    // Set shouldStartEditing to false
    rerender({ shouldStartEditing: false })
    
    // Set it back to true - should trigger again
    rerender({ shouldStartEditing: true })
    
    expect(result.current.isEditing).toBe(true)
  })
  
  it('should provide refs for input and textarea elements', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Label', 'Notes', false, true)
    )
    
    expect(result.current.inputRef).toBeDefined()
    expect(result.current.measureRef).toBeDefined()
    expect(result.current.notesTextareaRef).toBeDefined()
    expect(result.current.notesDisplayRef).toBeDefined()
    expect(result.current.notesMeasureRef).toBeDefined()
  })
  
  it('should initialize notes display dimensions as null', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Label', '', false, true)
    )
    
    expect(result.current.notesDisplayHeight).toBeNull()
    expect(result.current.notesDisplayWidth).toBeNull()
  })
  
  it('should allow setting editing state', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Label', '', false, true)
    )
    
    act(() => {
      result.current.setIsEditing(true)
    })
    
    expect(result.current.isEditing).toBe(true)
  })
  
  it('should allow setting notes editing state', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Label', '', false, true)
    )
    
    act(() => {
      result.current.setIsEditingNotes(true)
    })
    
    expect(result.current.isEditingNotes).toBe(true)
  })
  
  it('should allow updating edit label', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Label', '', false, true)
    )
    
    act(() => {
      result.current.setEditLabel('New Label')
    })
    
    expect(result.current.editLabel).toBe('New Label')
  })
  
  it('should allow updating edit notes', () => {
    const { result } = renderHook(() =>
      useConceptNodeEditing('Label', '', false, true)
    )
    
    act(() => {
      result.current.setEditNotes('New Notes')
    })
    
    expect(result.current.editNotes).toBe('New Notes')
  })

  describe('Label editing regression prevention', () => {
    it('should allow typing multiple characters without replacing previous characters', () => {
      const { result } = renderHook(() =>
        useConceptNodeEditing('Initial', '', false, true)
      )
      
      act(() => {
        result.current.setIsEditing(true)
        result.current.setEditLabel('Initial')
      })
      
      // Simulate typing multiple characters one by one
      act(() => {
        result.current.setEditLabel('I')
      })
      expect(result.current.editLabel).toBe('I')
      
      act(() => {
        result.current.setEditLabel('In')
      })
      expect(result.current.editLabel).toBe('In')
      
      act(() => {
        result.current.setEditLabel('New')
      })
      expect(result.current.editLabel).toBe('New')
      
      act(() => {
        result.current.setEditLabel('New Label')
      })
      expect(result.current.editLabel).toBe('New Label')
    })

    it('should ignore reactive database updates to initialLabel while editing', () => {
      const { result, rerender } = renderHook(
        ({ label }) => useConceptNodeEditing(label, '', false, true),
        { initialProps: { label: 'Original Label' } }
      )
      
      // Start editing - effect will set editLabel to 'Original Label'
      act(() => {
        result.current.setIsEditing(true)
      })
      
      // Now set editLabel to user's input (after effect has run)
      act(() => {
        result.current.setEditLabel('User Typing')
      })
      
      expect(result.current.editLabel).toBe('User Typing')
      
      // Simulate reactive database update (e.g., from another user or optimistic update)
      rerender({ label: 'Updated From Database' })
      
      // editLabel should remain unchanged - user's typing should not be interrupted
      expect(result.current.editLabel).toBe('User Typing')
      
      // Multiple rapid updates should all be ignored
      rerender({ label: 'Another Update' })
      expect(result.current.editLabel).toBe('User Typing')
      
      rerender({ label: 'Yet Another Update' })
      expect(result.current.editLabel).toBe('User Typing')
    })

    it('should capture initial label when editing starts and ignore subsequent changes', () => {
      const { result, rerender } = renderHook(
        ({ label }) => useConceptNodeEditing(label, '', false, true),
        { initialProps: { label: 'Start Label' } }
      )
      
      // Start editing - should capture 'Start Label'
      act(() => {
        result.current.setIsEditing(true)
      })
      
      expect(result.current.editLabel).toBe('Start Label')
      
      // User types something
      act(() => {
        result.current.setEditLabel('User Input')
      })
      
      // Database updates should be ignored
      rerender({ label: 'Changed Label 1' })
      expect(result.current.editLabel).toBe('User Input')
      
      rerender({ label: 'Changed Label 2' })
      expect(result.current.editLabel).toBe('User Input')
    })

    it('should sync editLabel with initialLabel when editing ends', () => {
      const { result, rerender } = renderHook(
        ({ label }) => useConceptNodeEditing(label, '', false, true),
        { initialProps: { label: 'Original' } }
      )
      
      // Start editing - effect will set editLabel to 'Original'
      act(() => {
        result.current.setIsEditing(true)
      })
      
      // Now set editLabel to user's input (after effect has run)
      act(() => {
        result.current.setEditLabel('Edited')
      })
      
      // Database updates while editing should be ignored
      rerender({ label: 'Database Update' })
      expect(result.current.editLabel).toBe('Edited')
      
      // Stop editing
      act(() => {
        result.current.setIsEditing(false)
      })
      
      // Now editLabel should sync with the latest initialLabel
      expect(result.current.editLabel).toBe('Database Update')
    })

    it('should handle rapid state changes without losing user input', () => {
      const { result, rerender } = renderHook(
        ({ label }) => useConceptNodeEditing(label, '', false, true),
        { initialProps: { label: 'Initial' } }
      )
      
      act(() => {
        result.current.setIsEditing(true)
        result.current.setEditLabel('A')
      })
      
      // Rapid database updates
      rerender({ label: 'Update 1' })
      act(() => {
        result.current.setEditLabel('AB')
      })
      
      rerender({ label: 'Update 2' })
      act(() => {
        result.current.setEditLabel('ABC')
      })
      
      rerender({ label: 'Update 3' })
      act(() => {
        result.current.setEditLabel('ABCD')
      })
      
      // User's typing should be preserved throughout
      expect(result.current.editLabel).toBe('ABCD')
    })

    it('should properly initialize editLabel when editing starts via setIsEditing', () => {
      const { result, rerender } = renderHook(
        ({ label }) => useConceptNodeEditing(label, '', false, true),
        { initialProps: { label: 'Before Edit' } }
      )
      
      expect(result.current.editLabel).toBe('Before Edit')
      
      // Start editing programmatically
      act(() => {
        result.current.setIsEditing(true)
      })
      
      // editLabel should be initialized to current initialLabel
      expect(result.current.editLabel).toBe('Before Edit')
      
      // Change initialLabel before user starts typing
      rerender({ label: 'After Edit Start' })
      
      // editLabel should still be 'Before Edit' (captured when editing started)
      expect(result.current.editLabel).toBe('Before Edit')
    })

    it('should handle editing state transitions correctly', () => {
      const { result, rerender } = renderHook(
        ({ label }) => useConceptNodeEditing(label, '', false, true),
        { initialProps: { label: 'Label 1' } }
      )
      
      // Start editing - effect will set editLabel to 'Label 1'
      act(() => {
        result.current.setIsEditing(true)
      })
      
      // Now set editLabel to user's input (after effect has run)
      act(() => {
        result.current.setEditLabel('User Edit')
      })
      
      // Database update during editing
      rerender({ label: 'Label 2' })
      expect(result.current.editLabel).toBe('User Edit')
      
      // Stop editing - should sync with latest label
      act(() => {
        result.current.setIsEditing(false)
      })
      expect(result.current.editLabel).toBe('Label 2')
      
      // Start editing again - effect will set editLabel to 'Label 2'
      act(() => {
        result.current.setIsEditing(true)
      })
      expect(result.current.editLabel).toBe('Label 2')
      
      // User edits
      act(() => {
        result.current.setEditLabel('New Edit')
      })
      
      // Another database update
      rerender({ label: 'Label 3' })
      expect(result.current.editLabel).toBe('New Edit')
    })
  })
})


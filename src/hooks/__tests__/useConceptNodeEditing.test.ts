/**
 * Tests for useConceptNodeEditing hook.
 * Verifies label and notes editing state management and auto-resize logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useConceptNodeEditing } from '../useConceptNodeEditing'

// Mock requestAnimationFrame
beforeEach(() => {
  global.requestAnimationFrame = vi.fn((cb) => {
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
    
    act(() => {
      result.current.setIsEditing(true)
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
})


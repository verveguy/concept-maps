/**
 * Tests for useConceptNodeHandles hook.
 * Verifies Option key handle expansion behavior.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConceptNodeHandles } from '../useConceptNodeHandles'

// Suppress unused vi warning
vi.mock('vitest', () => vi)

describe('useConceptNodeHandles', () => {
  it('should return false for isOptionHovered initially', () => {
    const { result } = renderHook(() =>
      useConceptNodeHandles(false, true, false)
    )
    
    expect(result.current.isOptionHovered).toBe(false)
  })
  
  it('should expand handle when Option key is pressed and mouse enters', () => {
    const { result } = renderHook(() =>
      useConceptNodeHandles(true, true, false)
    )
    
    act(() => {
      result.current.handleMouseEnter()
    })
    
    expect(result.current.isOptionHovered).toBe(true)
  })
  
  it('should not expand handle when Option key is not pressed', () => {
    const { result } = renderHook(() =>
      useConceptNodeHandles(false, true, false)
    )
    
    act(() => {
      result.current.handleMouseEnter()
    })
    
    expect(result.current.isOptionHovered).toBe(false)
  })
  
  it('should not expand handle when user does not have write access', () => {
    const { result } = renderHook(() =>
      useConceptNodeHandles(true, false, false)
    )
    
    act(() => {
      result.current.handleMouseEnter()
    })
    
    expect(result.current.isOptionHovered).toBe(false)
  })
  
  it('should not expand handle when node is being edited', () => {
    const { result } = renderHook(() =>
      useConceptNodeHandles(true, true, true)
    )
    
    act(() => {
      result.current.handleMouseEnter()
    })
    
    expect(result.current.isOptionHovered).toBe(false)
  })
  
  it('should collapse handle when mouse leaves', () => {
    const { result } = renderHook(() =>
      useConceptNodeHandles(true, true, false)
    )
    
    act(() => {
      result.current.handleMouseEnter()
    })
    
    expect(result.current.isOptionHovered).toBe(true)
    
    act(() => {
      result.current.handleMouseLeave()
    })
    
    expect(result.current.isOptionHovered).toBe(false)
  })
  
  it('should update hover state when Option key state changes while hovering', () => {
    const { result, rerender } = renderHook(
      ({ isOptionKeyPressed, hasWriteAccess, isEditing }) =>
        useConceptNodeHandles(isOptionKeyPressed, hasWriteAccess, isEditing),
      { initialProps: { isOptionKeyPressed: false, hasWriteAccess: true, isEditing: false } }
    )
    
    act(() => {
      result.current.handleMouseEnter()
    })
    
    expect(result.current.isOptionHovered).toBe(false)
    
    // Option key pressed while hovering
    rerender({ isOptionKeyPressed: true, hasWriteAccess: true, isEditing: false })
    
    expect(result.current.isOptionHovered).toBe(true)
  })
  
  it('should handle mouse move events', () => {
    const { result } = renderHook(() =>
      useConceptNodeHandles(false, true, false)
    )
    
    const mockEvent = {
      altKey: true,
    } as React.MouseEvent
    
    act(() => {
      result.current.handleMouseMove(mockEvent)
    })
    
    expect(result.current.isOptionHovered).toBe(true)
  })
  
  it('should collapse handle when Option key is released', () => {
    const { result, rerender } = renderHook(
      ({ isOptionKeyPressed }) =>
        useConceptNodeHandles(isOptionKeyPressed, true, false),
      { initialProps: { isOptionKeyPressed: true } }
    )
    
    act(() => {
      result.current.handleMouseEnter()
    })
    
    expect(result.current.isOptionHovered).toBe(true)
    
    // Release Option key
    rerender({ isOptionKeyPressed: false })
    
    expect(result.current.isOptionHovered).toBe(false)
  })
})


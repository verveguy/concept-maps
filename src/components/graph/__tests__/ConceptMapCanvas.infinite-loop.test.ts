/**
 * Test to isolate infinite loop issue in ConceptMapCanvas
 * 
 * This test helps identify if the issue is with:
 * 1. Store selectors creating new references
 * 2. useEffect dependencies causing loops
 * 3. State updates triggering re-renders
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef, useEffect } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'

describe('ConceptMapCanvas infinite loop isolation', () => {
  beforeEach(() => {
    useCanvasStore.getState().clearCanvasState()
  })

  it('should not cause infinite loops when using store selectors in useEffect', () => {
    let effectRunCount = 0
    let renderCount = 0

    renderHook(() => {
      renderCount++
      
      // Simulate what the component does
      const newlyCreatedRelationshipIdsRef = useRef<Map<string, string>>(new Map())
      const newlyCreatedRelationshipIdsKeyRef = useRef<string>('')
      
      // This is the problematic pattern - selector that creates new array
      const newlyCreatedRelationshipIdsKey = useCanvasStore((state) => 
        Array.from(state.newlyCreatedRelationshipIds.values()).join(',')
      )
      
      // Effect that syncs refs
      useEffect(() => {
        effectRunCount++
        const currentMap = useCanvasStore.getState().newlyCreatedRelationshipIds
        const currentKey = Array.from(currentMap.values()).join(',')
        if (currentKey !== newlyCreatedRelationshipIdsKeyRef.current) {
          newlyCreatedRelationshipIdsKeyRef.current = currentKey
          newlyCreatedRelationshipIdsRef.current = currentMap
        }
      }) // No dependencies - this runs on every render!
      
      return { renderCount, effectRunCount, newlyCreatedRelationshipIdsKey }
    })

    expect(renderCount).toBe(1)
    expect(effectRunCount).toBe(1)

    // Update store - this should trigger re-render
    act(() => {
      useCanvasStore.getState().addNewlyCreatedRelationship('concept1', 'rel1')
    })

    // The problem: if the selector creates a new string on every render,
    // and the effect has no dependencies, it runs on every render
    // If the effect does something that causes a re-render, we get infinite loop
    
    // Check if we have reasonable render/effect counts
    console.log('Render count:', renderCount, 'Effect run count:', effectRunCount)
    expect(renderCount).toBeLessThan(10) // Should be reasonable
    expect(effectRunCount).toBeLessThan(10)
  })

  it('should handle Set size selector without loops', () => {
    let renderCount = 0

    const { result } = renderHook(() => {
      renderCount++
      const size = useCanvasStore((state) => state.laidOutNodeIds.size)
      return size
    })

    expect(renderCount).toBe(1)

    // Update Set
    act(() => {
      useCanvasStore.getState().addLaidOutNodeIds(['node1', 'node2'])
    })

    expect(result.current).toBe(2)
    // Should only re-render when size actually changes
    expect(renderCount).toBeLessThanOrEqual(2)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasStore } from '@/stores/canvasStore'

describe('canvasStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useCanvasStore.getState().clearCanvasState()
  })

  it('should not cause infinite loops when updating Set values', () => {
    const { result } = renderHook(() => {
      const laidOutNodeIdsSize = useCanvasStore((state) => state.laidOutNodeIds.size)
      const addLaidOutNodeIds = useCanvasStore((state) => state.addLaidOutNodeIds)
      const setLaidOutNodeIds = useCanvasStore((state) => state.setLaidOutNodeIds)
      
      return { laidOutNodeIdsSize, addLaidOutNodeIds, setLaidOutNodeIds }
    })

    expect(result.current.laidOutNodeIdsSize).toBe(0)

    // Add some node IDs
    act(() => {
      result.current.addLaidOutNodeIds(['node1', 'node2'])
    })

    expect(result.current.laidOutNodeIdsSize).toBe(2)

    // Set all node IDs (creates new Set)
    act(() => {
      result.current.setLaidOutNodeIds(new Set(['node3', 'node4', 'node5']))
    })

    expect(result.current.laidOutNodeIdsSize).toBe(3)
  })

  it('should not cause infinite loops when updating Map values', () => {
    const { result } = renderHook(() => {
      const addNewlyCreatedRelationship = useCanvasStore((state) => state.addNewlyCreatedRelationship)
      const removeNewlyCreatedRelationship = useCanvasStore((state) => state.removeNewlyCreatedRelationship)
      const getMapSize = () => useCanvasStore.getState().newlyCreatedRelationshipIds.size
      
      return { addNewlyCreatedRelationship, removeNewlyCreatedRelationship, getMapSize }
    })

    expect(result.current.getMapSize()).toBe(0)

    // Add relationships
    act(() => {
      result.current.addNewlyCreatedRelationship('concept1', 'rel1')
      result.current.addNewlyCreatedRelationship('concept2', 'rel2')
    })

    expect(result.current.getMapSize()).toBe(2)

    // Remove relationship
    act(() => {
      result.current.removeNewlyCreatedRelationship('concept1')
    })

    expect(result.current.getMapSize()).toBe(1)
  })

  it('should handle selector that creates arrays without infinite loops', () => {
    let renderCount = 0
    
    const { result } = renderHook(() => {
      renderCount++
      // This selector creates a new array on every call
      const array = Array.from(useCanvasStore.getState().newlyCreatedRelationshipIds.values())
      return array
    })

    expect(renderCount).toBe(1)

    // Update the map
    act(() => {
      useCanvasStore.getState().addNewlyCreatedRelationship('concept1', 'rel1')
    })

    // Should only re-render once when the map actually changes
    expect(renderCount).toBeLessThanOrEqual(2)
    expect(result.current).toEqual(['rel1'])
  })
})

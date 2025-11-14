/**
 * Tests for useConceptNodeTripleEntry hook.
 * Verifies triple parsing and concept/relationship creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useConceptNodeTripleEntry } from '../useConceptNodeTripleEntry'
import { db, tx } from '@/lib/instant'
import { useReactFlow } from 'reactflow'
import { useCanvasMutations } from '@/hooks/useCanvasMutations'
import { useConcepts } from '@/hooks/useConcepts'
import { useMapStore } from '@/stores/mapStore'

// Mock dependencies
vi.mock('reactflow', () => ({
  useReactFlow: vi.fn(),
}))

vi.mock('@/hooks/useCanvasMutations', () => ({
  useCanvasMutations: vi.fn(),
}))

vi.mock('@/hooks/useConcepts', () => ({
  useConcepts: vi.fn(),
}))

vi.mock('@/stores/mapStore', () => ({
  useMapStore: vi.fn(),
}))

vi.mock('@/lib/instant', () => ({
  db: {
    transact: vi.fn(),
  },
  tx: {
    concepts: {},
    relationships: {},
  },
  id: vi.fn(() => 'mock-id'),
}))

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: {
    getState: vi.fn(() => ({
      applyIncrementalLayoutForNewNodes: null,
    })),
  },
}))

describe('useConceptNodeTripleEntry', () => {
  const mockGetNode = vi.fn()
  const mockGetNodes = vi.fn(() => [])
  const mockSetNodes = vi.fn()
  const mockUpdateConcept = vi.fn()
  const mockConcepts = []
  const mockCurrentMapId = 'map-1'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useReactFlow).mockReturnValue({
      getNode: mockGetNode,
      getNodes: mockGetNodes,
      setNodes: mockSetNodes,
      getEdges: vi.fn(),
      setEdges: vi.fn(),
      fitView: vi.fn(),
    } as any)
    vi.mocked(useCanvasMutations).mockReturnValue({
      updateConcept: mockUpdateConcept,
    } as any)
    vi.mocked(useConcepts).mockReturnValue(mockConcepts)
    vi.mocked(useMapStore).mockReturnValue(mockCurrentMapId)
  })

  it('should return a function to process triple entry', () => {
    const { result } = renderHook(() => useConceptNodeTripleEntry())
    
    expect(typeof result.current).toBe('function')
  })

  it('should return success: false for empty label', async () => {
    const { result } = renderHook(() => useConceptNodeTripleEntry())
    
    const processTriple = result.current
    const tripleResult = await processTriple({
      label: '',
      conceptId: 'concept-1',
      nodeId: 'node-1',
      currentLabel: 'Current Label',
    })
    
    expect(tripleResult.success).toBe(false)
    expect(tripleResult.createdNewConcept).toBe(false)
  })

  it('should return success: false for non-triple text', async () => {
    const { result } = renderHook(() => useConceptNodeTripleEntry())
    
    const processTriple = result.current
    const tripleResult = await processTriple({
      label: 'Simple label',
      conceptId: 'concept-1',
      nodeId: 'node-1',
      currentLabel: 'Current Label',
    })
    
    expect(tripleResult.success).toBe(false)
    expect(tripleResult.createdNewConcept).toBe(false)
  })

  it('should handle missing node position gracefully', async () => {
    mockGetNode.mockReturnValue(null)
    
    const { result } = renderHook(() => useConceptNodeTripleEntry())
    
    const processTriple = result.current
    const tripleResult = await processTriple({
      label: 'React is used for UI',
      conceptId: 'concept-1',
      nodeId: 'node-1',
      currentLabel: 'Current Label',
    })
    
    expect(tripleResult.success).toBe(false)
    expect(mockUpdateConcept).toHaveBeenCalled()
  })

  it('should handle missing currentMapId gracefully', async () => {
    vi.mocked(useMapStore).mockReturnValue(null)
    mockGetNode.mockReturnValue({
      position: { x: 100, y: 100 },
    })
    
    const { result } = renderHook(() => useConceptNodeTripleEntry())
    
    const processTriple = result.current
    const tripleResult = await processTriple({
      label: 'React is used for UI',
      conceptId: 'concept-1',
      nodeId: 'node-1',
      currentLabel: 'Current Label',
    })
    
    expect(tripleResult.success).toBe(false)
  })

  // Note: Full integration tests for triple entry would require more complex mocking
  // of InstantDB transactions, which is better suited for integration tests
})


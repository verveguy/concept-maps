/**
 * Tests for useCanvasCreation hook.
 * Verifies pending concept relationship creation (drag-to-create flow).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasCreation } from '../useCanvasCreation'
import { useCanvasMutations } from '../useCanvasMutations'
import { useCanvasStore } from '@/stores/canvasStore'
import { useMapStore } from '@/stores/mapStore'
import type { Concept } from '@/lib/schema'

// Mock dependencies
vi.mock('../useCanvasMutations')
vi.mock('@/stores/canvasStore')
vi.mock('@/stores/mapStore')

const mockCreateRelationship = vi.fn()
const mockSetPendingConcept = vi.fn()

describe('useCanvasCreation', () => {
  const mockConcepts: Concept[] = [
    {
      id: 'concept-1',
      mapId: 'map-1',
      label: 'Source Concept',
      position: { x: 100, y: 100 },
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    {
      id: 'concept-2',
      mapId: 'map-1',
      label: 'New Concept',
      position: { x: 250, y: 250 },
      notes: '',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  ]

  const defaultOptions = {
    concepts: mockConcepts,
    getNodes: vi.fn(() => []),
    setNodes: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useCanvasMutations
    vi.mocked(useCanvasMutations).mockReturnValue({
      createRelationship: mockCreateRelationship,
      createConcept: vi.fn(),
      updateConcept: vi.fn(),
      deleteConcept: vi.fn(),
      updateRelationship: vi.fn(),
      deleteRelationship: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      linkCommentToConcept: vi.fn(),
      unlinkCommentFromConcept: vi.fn(),
      startOperation: vi.fn(),
      endOperation: vi.fn(),
    })

    // Mock useCanvasStore
    vi.mocked(useCanvasStore).mockReturnValue({
      pendingConcept: null,
      setPendingConcept: mockSetPendingConcept,
      connectionStart: null,
      setConnectionStart: vi.fn(),
      connectionMade: false,
      setConnectionMade: vi.fn(),
      contextMenuVisible: false,
      setContextMenuVisible: vi.fn(),
      contextMenuPosition: null,
      setContextMenuPosition: vi.fn(),
      activeLayout: null,
      selectedLayout: null,
      setActiveLayout: vi.fn(),
      setSelectedLayout: vi.fn(),
      laidOutNodeIds: new Set(),
      addLaidOutNodeId: vi.fn(),
      clearLaidOutNodeIds: vi.fn(),
      newlyCreatedRelationshipIds: new Map(),
      addNewlyCreatedRelationship: vi.fn(),
      removeNewlyCreatedRelationship: vi.fn(),
      hasCheckedInitialConceptForMap: vi.fn(() => false),
      markInitialConceptChecked: vi.fn(),
      prevConceptIds: new Set(),
      setPrevConceptIds: vi.fn(),
      lastUpdateTime: 0,
      getLastUpdateTime: vi.fn(() => 0),
      setLastUpdateTime: vi.fn(),
      resetCanvasState: vi.fn(),
    })

    // Mock useMapStore
    vi.mocked(useMapStore).mockReturnValue('map-1')

    // Mock createRelationship to resolve successfully
    mockCreateRelationship.mockResolvedValue(undefined)
  })

  describe('pending concept relationship creation', () => {
    it('should create relationship when pending concept and matching concept exist', async () => {
      // Set up pending concept
      vi.mocked(useCanvasStore).mockReturnValue({
        pendingConcept: {
          sourceId: 'concept-1',
          position: { x: 250, y: 250 },
        },
        setPendingConcept: mockSetPendingConcept,
        connectionStart: null,
        setConnectionStart: vi.fn(),
        connectionMade: false,
        setConnectionMade: vi.fn(),
        contextMenuVisible: false,
        setContextMenuVisible: vi.fn(),
        contextMenuPosition: null,
        setContextMenuPosition: vi.fn(),
        activeLayout: null,
        selectedLayout: null,
        setActiveLayout: vi.fn(),
        setSelectedLayout: vi.fn(),
        laidOutNodeIds: new Set(),
        addLaidOutNodeId: vi.fn(),
        clearLaidOutNodeIds: vi.fn(),
        newlyCreatedRelationshipIds: new Map(),
        addNewlyCreatedRelationship: vi.fn(),
        removeNewlyCreatedRelationship: vi.fn(),
        hasCheckedInitialConceptForMap: vi.fn(() => false),
        markInitialConceptChecked: vi.fn(),
        prevConceptIds: new Set(),
        setPrevConceptIds: vi.fn(),
        lastUpdateTime: 0,
        getLastUpdateTime: vi.fn(() => 0),
        setLastUpdateTime: vi.fn(),
        resetCanvasState: vi.fn(),
      })

      renderHook(() => useCanvasCreation(defaultOptions))

      // Wait for effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Should create relationship between source and new concept
      expect(mockCreateRelationship).toHaveBeenCalledWith({
        mapId: 'map-1',
        fromConceptId: 'concept-1',
        toConceptId: 'concept-2',
        primaryLabel: 'related to',
        reverseLabel: 'related from',
      })

      // Should clear pending concept
      expect(mockSetPendingConcept).toHaveBeenCalledWith(null)
    })

    it('should not create relationship when no pending concept', async () => {
      renderHook(() => useCanvasCreation(defaultOptions))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(mockCreateRelationship).not.toHaveBeenCalled()
      expect(mockSetPendingConcept).not.toHaveBeenCalled()
    })

    it('should not create relationship when no matching concept found', async () => {
      // Set up pending concept with position that doesn't match any concept
      vi.mocked(useCanvasStore).mockReturnValue({
        pendingConcept: {
          sourceId: 'concept-1',
          position: { x: 1000, y: 1000 }, // Far from any concept
        },
        setPendingConcept: mockSetPendingConcept,
        connectionStart: null,
        setConnectionStart: vi.fn(),
        connectionMade: false,
        setConnectionMade: vi.fn(),
        contextMenuVisible: false,
        setContextMenuVisible: vi.fn(),
        contextMenuPosition: null,
        setContextMenuPosition: vi.fn(),
        activeLayout: null,
        selectedLayout: null,
        setActiveLayout: vi.fn(),
        setSelectedLayout: vi.fn(),
        laidOutNodeIds: new Set(),
        addLaidOutNodeId: vi.fn(),
        clearLaidOutNodeIds: vi.fn(),
        newlyCreatedRelationshipIds: new Map(),
        addNewlyCreatedRelationship: vi.fn(),
        removeNewlyCreatedRelationship: vi.fn(),
        hasCheckedInitialConceptForMap: vi.fn(() => false),
        markInitialConceptChecked: vi.fn(),
        prevConceptIds: new Set(),
        setPrevConceptIds: vi.fn(),
        lastUpdateTime: 0,
        getLastUpdateTime: vi.fn(() => 0),
        setLastUpdateTime: vi.fn(),
        resetCanvasState: vi.fn(),
      })

      renderHook(() => useCanvasCreation(defaultOptions))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(mockCreateRelationship).not.toHaveBeenCalled()
      expect(mockSetPendingConcept).not.toHaveBeenCalled()
    })

    it('should not create relationship when concept label does not match', async () => {
      // Set up concepts with different label
      const conceptsWithDifferentLabel: Concept[] = [
        {
          id: 'concept-2',
          mapId: 'map-1',
          label: 'Different Label', // Not "New Concept"
          position: { x: 250, y: 250 },
          notes: '',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ]

      vi.mocked(useCanvasStore).mockReturnValue({
        pendingConcept: {
          sourceId: 'concept-1',
          position: { x: 250, y: 250 },
        },
        setPendingConcept: mockSetPendingConcept,
        connectionStart: null,
        setConnectionStart: vi.fn(),
        connectionMade: false,
        setConnectionMade: vi.fn(),
        contextMenuVisible: false,
        setContextMenuVisible: vi.fn(),
        contextMenuPosition: null,
        setContextMenuPosition: vi.fn(),
        activeLayout: null,
        selectedLayout: null,
        setActiveLayout: vi.fn(),
        setSelectedLayout: vi.fn(),
        laidOutNodeIds: new Set(),
        addLaidOutNodeId: vi.fn(),
        clearLaidOutNodeIds: vi.fn(),
        newlyCreatedRelationshipIds: new Map(),
        addNewlyCreatedRelationship: vi.fn(),
        removeNewlyCreatedRelationship: vi.fn(),
        hasCheckedInitialConceptForMap: vi.fn(() => false),
        markInitialConceptChecked: vi.fn(),
        prevConceptIds: new Set(),
        setPrevConceptIds: vi.fn(),
        lastUpdateTime: 0,
        getLastUpdateTime: vi.fn(() => 0),
        setLastUpdateTime: vi.fn(),
        resetCanvasState: vi.fn(),
      })

      renderHook(() =>
        useCanvasCreation({
          ...defaultOptions,
          concepts: conceptsWithDifferentLabel,
        })
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(mockCreateRelationship).not.toHaveBeenCalled()
      expect(mockSetPendingConcept).not.toHaveBeenCalled()
    })

    it('should handle relationship creation within position tolerance', async () => {
      // Set up pending concept with position slightly off (within 50px tolerance)
      vi.mocked(useCanvasStore).mockReturnValue({
        pendingConcept: {
          sourceId: 'concept-1',
          position: { x: 280, y: 280 }, // Within 50px of concept-2 at (250, 250)
        },
        setPendingConcept: mockSetPendingConcept,
        connectionStart: null,
        setConnectionStart: vi.fn(),
        connectionMade: false,
        setConnectionMade: vi.fn(),
        contextMenuVisible: false,
        setContextMenuVisible: vi.fn(),
        contextMenuPosition: null,
        setContextMenuPosition: vi.fn(),
        activeLayout: null,
        selectedLayout: null,
        setActiveLayout: vi.fn(),
        setSelectedLayout: vi.fn(),
        laidOutNodeIds: new Set(),
        addLaidOutNodeId: vi.fn(),
        clearLaidOutNodeIds: vi.fn(),
        newlyCreatedRelationshipIds: new Map(),
        addNewlyCreatedRelationship: vi.fn(),
        removeNewlyCreatedRelationship: vi.fn(),
        hasCheckedInitialConceptForMap: vi.fn(() => false),
        markInitialConceptChecked: vi.fn(),
        prevConceptIds: new Set(),
        setPrevConceptIds: vi.fn(),
        lastUpdateTime: 0,
        getLastUpdateTime: vi.fn(() => 0),
        setLastUpdateTime: vi.fn(),
        resetCanvasState: vi.fn(),
      })

      renderHook(() => useCanvasCreation(defaultOptions))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Should still create relationship (within tolerance)
      expect(mockCreateRelationship).toHaveBeenCalled()
      expect(mockSetPendingConcept).toHaveBeenCalledWith(null)
    })

    it('should handle relationship creation errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock createRelationship to reject
      mockCreateRelationship.mockRejectedValueOnce(new Error('Database error'))

      vi.mocked(useCanvasStore).mockReturnValue({
        pendingConcept: {
          sourceId: 'concept-1',
          position: { x: 250, y: 250 },
        },
        setPendingConcept: mockSetPendingConcept,
        connectionStart: null,
        setConnectionStart: vi.fn(),
        connectionMade: false,
        setConnectionMade: vi.fn(),
        contextMenuVisible: false,
        setContextMenuVisible: vi.fn(),
        contextMenuPosition: null,
        setContextMenuPosition: vi.fn(),
        activeLayout: null,
        selectedLayout: null,
        setActiveLayout: vi.fn(),
        setSelectedLayout: vi.fn(),
        laidOutNodeIds: new Set(),
        addLaidOutNodeId: vi.fn(),
        clearLaidOutNodeIds: vi.fn(),
        newlyCreatedRelationshipIds: new Map(),
        addNewlyCreatedRelationship: vi.fn(),
        removeNewlyCreatedRelationship: vi.fn(),
        hasCheckedInitialConceptForMap: vi.fn(() => false),
        markInitialConceptChecked: vi.fn(),
        prevConceptIds: new Set(),
        setPrevConceptIds: vi.fn(),
        lastUpdateTime: 0,
        getLastUpdateTime: vi.fn(() => 0),
        setLastUpdateTime: vi.fn(),
        resetCanvasState: vi.fn(),
      })

      renderHook(() => useCanvasCreation(defaultOptions))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      // Should attempt to create relationship
      expect(mockCreateRelationship).toHaveBeenCalled()

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to create relationship:',
        expect.any(Error)
      )

      // Should still clear pending concept (error is caught)
      expect(mockSetPendingConcept).toHaveBeenCalledWith(null)

      consoleErrorSpy.mockRestore()
    })

    it('should not create relationship when currentMapId is missing', async () => {
      vi.mocked(useMapStore).mockReturnValue(null as any)

      vi.mocked(useCanvasStore).mockReturnValue({
        pendingConcept: {
          sourceId: 'concept-1',
          position: { x: 250, y: 250 },
        },
        setPendingConcept: mockSetPendingConcept,
        connectionStart: null,
        setConnectionStart: vi.fn(),
        connectionMade: false,
        setConnectionMade: vi.fn(),
        contextMenuVisible: false,
        setContextMenuVisible: vi.fn(),
        contextMenuPosition: null,
        setContextMenuPosition: vi.fn(),
        activeLayout: null,
        selectedLayout: null,
        setActiveLayout: vi.fn(),
        setSelectedLayout: vi.fn(),
        laidOutNodeIds: new Set(),
        addLaidOutNodeId: vi.fn(),
        clearLaidOutNodeIds: vi.fn(),
        newlyCreatedRelationshipIds: new Map(),
        addNewlyCreatedRelationship: vi.fn(),
        removeNewlyCreatedRelationship: vi.fn(),
        hasCheckedInitialConceptForMap: vi.fn(() => false),
        markInitialConceptChecked: vi.fn(),
        prevConceptIds: new Set(),
        setPrevConceptIds: vi.fn(),
        lastUpdateTime: 0,
        getLastUpdateTime: vi.fn(() => 0),
        setLastUpdateTime: vi.fn(),
        resetCanvasState: vi.fn(),
      })

      renderHook(() => useCanvasCreation(defaultOptions))

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })

      expect(mockCreateRelationship).not.toHaveBeenCalled()
      expect(mockSetPendingConcept).not.toHaveBeenCalled()
    })
  })
})


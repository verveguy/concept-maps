/**
 * Tests for canvas store.
 * Verifies all canvas state management functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from '../canvasStore'

describe('canvasStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCanvasStore.getState().resetCanvasState()
    // Also clear hasCheckedInitialConcept for tests (normally preserved across map switches)
    const state = useCanvasStore.getState()
    state.hasCheckedInitialConcept.forEach((mapId) => {
      state.clearInitialConceptCheck(mapId)
    })
  })

  describe('Connection state', () => {
    it('should initialize with null connection start', () => {
      const state = useCanvasStore.getState()
      expect(state.connectionStart).toBeNull()
    })

    it('should set connection start', () => {
      const connectionStart = {
        sourceId: 'node-1',
        position: { x: 100, y: 200 },
      }
      useCanvasStore.getState().setConnectionStart(connectionStart)
      expect(useCanvasStore.getState().connectionStart).toEqual(connectionStart)
    })

    it('should clear connection start', () => {
      useCanvasStore.getState().setConnectionStart({
        sourceId: 'node-1',
        position: { x: 100, y: 200 },
      })
      useCanvasStore.getState().setConnectionStart(null)
      expect(useCanvasStore.getState().connectionStart).toBeNull()
    })

    it('should initialize connectionMade as false', () => {
      expect(useCanvasStore.getState().connectionMade).toBe(false)
    })

    it('should set connectionMade flag', () => {
      useCanvasStore.getState().setConnectionMade(true)
      expect(useCanvasStore.getState().connectionMade).toBe(true)
    })
  })

  describe('Context menu state', () => {
    it('should initialize context menu as hidden', () => {
      const state = useCanvasStore.getState()
      expect(state.contextMenuVisible).toBe(false)
      expect(state.contextMenuPosition).toBeNull()
    })

    it('should set context menu visibility', () => {
      useCanvasStore.getState().setContextMenuVisible(true)
      expect(useCanvasStore.getState().contextMenuVisible).toBe(true)
    })

    it('should set context menu position', () => {
      const position = { x: 300, y: 400 }
      useCanvasStore.getState().setContextMenuPosition(position)
      expect(useCanvasStore.getState().contextMenuPosition).toEqual(position)
    })

    it('should clear context menu position', () => {
      useCanvasStore.getState().setContextMenuPosition({ x: 300, y: 400 })
      useCanvasStore.getState().setContextMenuPosition(null)
      expect(useCanvasStore.getState().contextMenuPosition).toBeNull()
    })
  })

  describe('Layout state', () => {
    it('should initialize with default selected layout', () => {
      expect(useCanvasStore.getState().selectedLayout).toBe('force-directed')
    })

    it('should set selected layout', () => {
      useCanvasStore.getState().setSelectedLayout('hierarchical')
      expect(useCanvasStore.getState().selectedLayout).toBe('hierarchical')
    })
  })

  describe('Creation tracking', () => {
    it('should initialize with empty newly created relationship IDs map', () => {
      expect(useCanvasStore.getState().newlyCreatedRelationshipIds.size).toBe(0)
    })

    it('should add newly created relationship mapping', () => {
      useCanvasStore
        .getState()
        .addNewlyCreatedRelationship('concept-1', 'relationship-1')
      const map = useCanvasStore.getState().newlyCreatedRelationshipIds
      expect(map.get('concept-1')).toBe('relationship-1')
    })

    it('should remove newly created relationship mapping', () => {
      useCanvasStore
        .getState()
        .addNewlyCreatedRelationship('concept-1', 'relationship-1')
      useCanvasStore.getState().removeNewlyCreatedRelationship('concept-1')
      expect(
        useCanvasStore.getState().newlyCreatedRelationshipIds.has('concept-1')
      ).toBe(false)
    })

    it('should clear all newly created relationship mappings', () => {
      useCanvasStore
        .getState()
        .addNewlyCreatedRelationship('concept-1', 'relationship-1')
      useCanvasStore
        .getState()
        .addNewlyCreatedRelationship('concept-2', 'relationship-2')
      useCanvasStore.getState().clearNewlyCreatedRelationships()
      expect(useCanvasStore.getState().newlyCreatedRelationshipIds.size).toBe(0)
    })

    it('should initialize with empty initial concept check set', () => {
      expect(useCanvasStore.getState().hasCheckedInitialConcept.size).toBe(0)
    })

    it('should mark initial concept as checked for a map', () => {
      useCanvasStore.getState().markInitialConceptChecked('map-1')
      expect(
        useCanvasStore.getState().hasCheckedInitialConcept.has('map-1')
      ).toBe(true)
    })

    it('should check if initial concept has been checked for a map', () => {
      expect(
        useCanvasStore.getState().hasCheckedInitialConceptForMap('map-1')
      ).toBe(false)
      useCanvasStore.getState().markInitialConceptChecked('map-1')
      expect(
        useCanvasStore.getState().hasCheckedInitialConceptForMap('map-1')
      ).toBe(true)
    })

    it('should clear initial concept check for a map', () => {
      useCanvasStore.getState().markInitialConceptChecked('map-1')
      useCanvasStore.getState().clearInitialConceptCheck('map-1')
      expect(
        useCanvasStore.getState().hasCheckedInitialConcept.has('map-1')
      ).toBe(false)
    })
  })

  describe('Throttling state', () => {
    it('should initialize with empty last update time map', () => {
      expect(useCanvasStore.getState().lastUpdateTime.size).toBe(0)
    })

    it('should set last update time for a node', () => {
      const timestamp = Date.now()
      useCanvasStore.getState().setLastUpdateTime('node-1', timestamp)
      expect(useCanvasStore.getState().getLastUpdateTime('node-1')).toBe(
        timestamp
      )
    })

    it('should get last update time for a node', () => {
      const timestamp = Date.now()
      useCanvasStore.getState().setLastUpdateTime('node-1', timestamp)
      expect(useCanvasStore.getState().getLastUpdateTime('node-1')).toBe(
        timestamp
      )
      expect(useCanvasStore.getState().getLastUpdateTime('node-2')).toBeUndefined()
    })

    it('should clear last update time for a node', () => {
      const timestamp = Date.now()
      useCanvasStore.getState().setLastUpdateTime('node-1', timestamp)
      useCanvasStore.getState().clearLastUpdateTime('node-1')
      expect(useCanvasStore.getState().getLastUpdateTime('node-1')).toBeUndefined()
    })

    it('should clear all last update times', () => {
      useCanvasStore.getState().setLastUpdateTime('node-1', Date.now())
      useCanvasStore.getState().setLastUpdateTime('node-2', Date.now())
      useCanvasStore.getState().clearAllLastUpdateTimes()
      expect(useCanvasStore.getState().lastUpdateTime.size).toBe(0)
    })
  })

  describe('Pending concept', () => {
    it('should initialize with null pending concept', () => {
      expect(useCanvasStore.getState().pendingConcept).toBeNull()
    })

    it('should set pending concept', () => {
      const pendingConcept = {
        sourceId: 'node-1',
        position: { x: 100, y: 200 },
      }
      useCanvasStore.getState().setPendingConcept(pendingConcept)
      expect(useCanvasStore.getState().pendingConcept).toEqual(pendingConcept)
    })

    it('should clear pending concept', () => {
      useCanvasStore.getState().setPendingConcept({
        sourceId: 'node-1',
        position: { x: 100, y: 200 },
      })
      useCanvasStore.getState().setPendingConcept(null)
      expect(useCanvasStore.getState().pendingConcept).toBeNull()
    })
  })

  describe('Previous concept IDs', () => {
    it('should initialize with empty previous concept IDs set', () => {
      expect(useCanvasStore.getState().prevConceptIds.size).toBe(0)
    })

    it('should set previous concept IDs', () => {
      const ids = new Set(['concept-1', 'concept-2'])
      useCanvasStore.getState().setPrevConceptIds(ids)
      expect(useCanvasStore.getState().prevConceptIds).toEqual(ids)
    })

    it('should clear previous concept IDs', () => {
      useCanvasStore.getState().setPrevConceptIds(
        new Set(['concept-1', 'concept-2'])
      )
      useCanvasStore.getState().clearPrevConceptIds()
      expect(useCanvasStore.getState().prevConceptIds.size).toBe(0)
    })
  })

  describe('Reset canvas state', () => {
    it('should reset all state except selectedLayout and hasCheckedInitialConcept', () => {
      // Set up various state
      useCanvasStore.getState().setConnectionStart({
        sourceId: 'node-1',
        position: { x: 100, y: 200 },
      })
      useCanvasStore.getState().setConnectionMade(true)
      useCanvasStore.getState().setContextMenuVisible(true)
      useCanvasStore.getState().setContextMenuPosition({ x: 300, y: 400 })
      useCanvasStore.getState().addNewlyCreatedRelationship('concept-1', 'rel-1')
      useCanvasStore.getState().setLastUpdateTime('node-1', Date.now())
      useCanvasStore.getState().setPendingConcept({
        sourceId: 'node-1',
        position: { x: 100, y: 200 },
      })
      useCanvasStore.getState().setPrevConceptIds(new Set(['concept-1']))
      useCanvasStore.getState().setSelectedLayout('layered')
      useCanvasStore.getState().markInitialConceptChecked('map-1')

      // Reset
      useCanvasStore.getState().resetCanvasState()

      // Verify reset state
      expect(useCanvasStore.getState().connectionStart).toBeNull()
      expect(useCanvasStore.getState().connectionMade).toBe(false)
      expect(useCanvasStore.getState().contextMenuVisible).toBe(false)
      expect(useCanvasStore.getState().contextMenuPosition).toBeNull()
      expect(useCanvasStore.getState().newlyCreatedRelationshipIds.size).toBe(0)
      expect(useCanvasStore.getState().lastUpdateTime.size).toBe(0)
      expect(useCanvasStore.getState().pendingConcept).toBeNull()
      expect(useCanvasStore.getState().prevConceptIds.size).toBe(0)

      // Verify preserved state
      expect(useCanvasStore.getState().selectedLayout).toBe('layered')
      expect(
        useCanvasStore.getState().hasCheckedInitialConcept.has('map-1')
      ).toBe(true)
    })
  })
})


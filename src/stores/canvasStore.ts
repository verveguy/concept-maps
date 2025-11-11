/**
 * Canvas store for managing canvas-specific state.
 * Uses Zustand for state management.
 * 
 * This store centralizes canvas-specific state that was previously scattered
 * across the ConceptMapCanvas component, including:
 * - Connection state (drag-to-connect, handle-to-handle)
 * - Context menu state (visibility, position)
 * - Layout state (active layout, selected layout, laid-out nodes)
 * - Creation tracking (newly created relationships, initial concept check)
 * - Throttling state (last update times for position updates)
 * - Refs that can be moved to store (pending concept, previous concept IDs)
 */

import { create } from 'zustand'
import type { LayoutType } from '@/lib/layouts'

/**
 * Connection start information for drag-to-connect functionality.
 */
export interface ConnectionStart {
  /** Source node ID where connection started */
  sourceId: string
  /** Screen position where connection started */
  position: { x: number; y: number }
}

/**
 * Pending concept information for relationship creation.
 */
export interface PendingConcept {
  /** Source node ID that triggered concept creation */
  sourceId: string
  /** Position where concept should be created */
  position: { x: number; y: number }
}

/**
 * State interface for canvas-related state.
 */
export interface CanvasState {
  // Connection state
  /** Current connection start information (null if no connection in progress) */
  connectionStart: ConnectionStart | null
  /** Set connection start information */
  setConnectionStart: (start: ConnectionStart | null) => void
  /** Whether a connection was successfully made (used to prevent duplicate creation) */
  connectionMade: boolean
  /** Set connection made flag */
  setConnectionMade: (made: boolean) => void

  // Context menu state
  /** Whether context menu is visible */
  contextMenuVisible: boolean
  /** Set context menu visibility */
  setContextMenuVisible: (visible: boolean) => void
  /** Context menu position (screen coordinates) */
  contextMenuPosition: { x: number; y: number } | null
  /** Set context menu position */
  setContextMenuPosition: (position: { x: number; y: number } | null) => void

  // Layout state
  /** Currently active layout (null if no layout is active) */
  activeLayout: LayoutType | null
  /** Set active layout */
  setActiveLayout: (layout: LayoutType | null) => void
  /** Selected layout (shown on layout selector button) */
  selectedLayout: LayoutType
  /** Set selected layout */
  setSelectedLayout: (layout: LayoutType) => void
  /** Set of node IDs that have been laid out (for incremental layout) */
  laidOutNodeIds: Set<string>
  /** Add a node ID to laid-out set */
  addLaidOutNodeId: (nodeId: string) => void
  /** Remove a node ID from laid-out set */
  removeLaidOutNodeId: (nodeId: string) => void
  /** Clear all laid-out node IDs */
  clearLaidOutNodeIds: () => void

  // Creation tracking
  /** Map of concept ID to relationship ID for newly created relationships */
  newlyCreatedRelationshipIds: Map<string, string>
  /** Add a newly created relationship mapping */
  addNewlyCreatedRelationship: (conceptId: string, relationshipId: string) => void
  /** Remove a newly created relationship mapping */
  removeNewlyCreatedRelationship: (conceptId: string) => void
  /** Clear all newly created relationship mappings */
  clearNewlyCreatedRelationships: () => void
  /** Set of map IDs for which we've checked initial concept creation */
  hasCheckedInitialConcept: Set<string>
  /** Mark a map as having checked initial concept */
  markInitialConceptChecked: (mapId: string) => void
  /** Check if initial concept has been checked for a map */
  hasCheckedInitialConceptForMap: (mapId: string) => boolean
  /** Clear initial concept check for a map */
  clearInitialConceptCheck: (mapId: string) => void

  // Throttling state
  /** Map of node ID to last update timestamp (for throttling position updates) */
  lastUpdateTime: Map<string, number>
  /** Set last update time for a node */
  setLastUpdateTime: (nodeId: string, time: number) => void
  /** Get last update time for a node */
  getLastUpdateTime: (nodeId: string) => number | undefined
  /** Clear last update time for a node */
  clearLastUpdateTime: (nodeId: string) => void
  /** Clear all last update times */
  clearAllLastUpdateTimes: () => void

  // Pending concept (for relationship creation)
  /** Pending concept information (null if no pending concept) */
  pendingConcept: PendingConcept | null
  /** Set pending concept */
  setPendingConcept: (concept: PendingConcept | null) => void

  // Previous concept IDs (for change detection)
  /** Set of previous concept IDs (for detecting new concepts) */
  prevConceptIds: Set<string>
  /** Set previous concept IDs */
  setPrevConceptIds: (ids: Set<string>) => void
  /** Clear previous concept IDs */
  clearPrevConceptIds: () => void

  // Reset/clear functions
  /** Reset all canvas state (useful when switching maps) */
  resetCanvasState: () => void
}

/**
 * Initial state values for resettable canvas state.
 * These values are reset when switching maps.
 * Note: selectedLayout and hasCheckedInitialConcept are preserved as user preferences.
 */
const INITIAL_RESETTABLE_STATE = {
  connectionStart: null as ConnectionStart | null,
  connectionMade: false,
  contextMenuVisible: false,
  contextMenuPosition: null as { x: number; y: number } | null,
  activeLayout: null as LayoutType | null,
  laidOutNodeIds: new Set<string>(),
  newlyCreatedRelationshipIds: new Map<string, string>(),
  lastUpdateTime: new Map<string, number>(),
  pendingConcept: null as PendingConcept | null,
  prevConceptIds: new Set<string>(),
} as const

/**
 * Zustand store for canvas state management.
 * Provides reactive state for connection, context menu, layout, and creation tracking.
 */
export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Connection state
  connectionStart: INITIAL_RESETTABLE_STATE.connectionStart,
  setConnectionStart: (start) => set({ connectionStart: start }),
  connectionMade: INITIAL_RESETTABLE_STATE.connectionMade,
  setConnectionMade: (made) => set({ connectionMade: made }),

  // Context menu state
  contextMenuVisible: INITIAL_RESETTABLE_STATE.contextMenuVisible,
  setContextMenuVisible: (visible) => set({ contextMenuVisible: visible }),
  contextMenuPosition: INITIAL_RESETTABLE_STATE.contextMenuPosition,
  setContextMenuPosition: (position) => set({ contextMenuPosition: position }),

  // Layout state
  activeLayout: INITIAL_RESETTABLE_STATE.activeLayout,
  setActiveLayout: (layout) => set({ activeLayout: layout }),
  selectedLayout: 'force-directed',
  setSelectedLayout: (layout) => set({ selectedLayout: layout }),
  laidOutNodeIds: INITIAL_RESETTABLE_STATE.laidOutNodeIds,
  addLaidOutNodeId: (nodeId) =>
    set((state) => ({
      laidOutNodeIds: new Set(state.laidOutNodeIds).add(nodeId),
    })),
  removeLaidOutNodeId: (nodeId) =>
    set((state) => {
      const newSet = new Set(state.laidOutNodeIds)
      newSet.delete(nodeId)
      return { laidOutNodeIds: newSet }
    }),
  clearLaidOutNodeIds: () => set({ laidOutNodeIds: INITIAL_RESETTABLE_STATE.laidOutNodeIds }),

  // Creation tracking
  newlyCreatedRelationshipIds: INITIAL_RESETTABLE_STATE.newlyCreatedRelationshipIds,
  addNewlyCreatedRelationship: (conceptId, relationshipId) =>
    set((state) => {
      const newMap = new Map(state.newlyCreatedRelationshipIds)
      newMap.set(conceptId, relationshipId)
      return { newlyCreatedRelationshipIds: newMap }
    }),
  removeNewlyCreatedRelationship: (conceptId) =>
    set((state) => {
      const newMap = new Map(state.newlyCreatedRelationshipIds)
      newMap.delete(conceptId)
      return { newlyCreatedRelationshipIds: newMap }
    }),
  clearNewlyCreatedRelationships: () =>
    set({ newlyCreatedRelationshipIds: INITIAL_RESETTABLE_STATE.newlyCreatedRelationshipIds }),
  hasCheckedInitialConcept: new Set<string>(),
  markInitialConceptChecked: (mapId) =>
    set((state) => ({
      hasCheckedInitialConcept: new Set(state.hasCheckedInitialConcept).add(mapId),
    })),
  hasCheckedInitialConceptForMap: (mapId) => {
    return get().hasCheckedInitialConcept.has(mapId)
  },
  clearInitialConceptCheck: (mapId) =>
    set((state) => {
      const newSet = new Set(state.hasCheckedInitialConcept)
      newSet.delete(mapId)
      return { hasCheckedInitialConcept: newSet }
    }),

  // Throttling state
  lastUpdateTime: INITIAL_RESETTABLE_STATE.lastUpdateTime,
  setLastUpdateTime: (nodeId, time) =>
    set((state) => {
      const newMap = new Map(state.lastUpdateTime)
      newMap.set(nodeId, time)
      return { lastUpdateTime: newMap }
    }),
  getLastUpdateTime: (nodeId) => {
    return get().lastUpdateTime.get(nodeId)
  },
  clearLastUpdateTime: (nodeId) =>
    set((state) => {
      const newMap = new Map(state.lastUpdateTime)
      newMap.delete(nodeId)
      return { lastUpdateTime: newMap }
    }),
  clearAllLastUpdateTimes: () => set({ lastUpdateTime: INITIAL_RESETTABLE_STATE.lastUpdateTime }),

  // Pending concept
  pendingConcept: INITIAL_RESETTABLE_STATE.pendingConcept,
  setPendingConcept: (concept) => set({ pendingConcept: concept }),

  // Previous concept IDs
  prevConceptIds: INITIAL_RESETTABLE_STATE.prevConceptIds,
  setPrevConceptIds: (ids) => set({ prevConceptIds: ids }),
  clearPrevConceptIds: () => set({ prevConceptIds: INITIAL_RESETTABLE_STATE.prevConceptIds }),

  // Reset function - resets all resettable state to initial values
  // Note: selectedLayout and hasCheckedInitialConcept are preserved
  // as they are user preferences and should persist across map switches
  resetCanvasState: () => {
    const currentState = get()
    set({
      connectionStart: INITIAL_RESETTABLE_STATE.connectionStart,
      connectionMade: INITIAL_RESETTABLE_STATE.connectionMade,
      contextMenuVisible: INITIAL_RESETTABLE_STATE.contextMenuVisible,
      contextMenuPosition: INITIAL_RESETTABLE_STATE.contextMenuPosition,
      activeLayout: INITIAL_RESETTABLE_STATE.activeLayout,
      laidOutNodeIds: new Set<string>(),
      newlyCreatedRelationshipIds: new Map<string, string>(),
      lastUpdateTime: new Map<string, number>(),
      pendingConcept: INITIAL_RESETTABLE_STATE.pendingConcept,
      prevConceptIds: new Set<string>(),
      // Preserve user preferences
      selectedLayout: currentState.selectedLayout,
      hasCheckedInitialConcept: currentState.hasCheckedInitialConcept,
    })
  },
}))



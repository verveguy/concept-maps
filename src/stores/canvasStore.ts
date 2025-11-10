/**
 * Canvas store for managing canvas-specific state.
 * Uses Zustand for state management.
 * 
 * This store centralizes state related to:
 * - Connection creation (drag-to-connect)
 * - Context menu visibility and position
 * - Layout management (active, selected, tracking)
 * - Creation tracking (new relationships, initial concepts)
 * - Throttling state for position updates
 */

import { create } from 'zustand'
import type { LayoutType } from '@/lib/layouts'

/**
 * Connection start state for drag-to-connect functionality.
 */
export interface ConnectionStart {
  /** Source node ID */
  sourceId: string
  /** Source node position */
  position: { x: number; y: number }
}

/**
 * Pending concept creation state.
 * Used when creating a concept and relationship together.
 */
export interface PendingConcept {
  /** Source concept ID for the relationship */
  sourceId: string
  /** Position where concept should be created */
  position: { x: number; y: number }
}

/**
 * State interface for canvas-related state.
 */
export interface CanvasState {
  // Connection state
  /** Current connection start state (null if not connecting) */
  connectionStart: ConnectionStart | null
  /** Set connection start state */
  setConnectionStart: (start: ConnectionStart | null) => void
  /** Whether a connection was successfully made to an existing node */
  connectionMade: boolean
  /** Set connection made flag */
  setConnectionMade: (made: boolean) => void

  // Context menu state
  /** Whether context menu is visible */
  contextMenuVisible: boolean
  /** Set context menu visibility */
  setContextMenuVisible: (visible: boolean) => void
  /** Context menu screen position */
  contextMenuPosition: { x: number; y: number } | null
  /** Set context menu position */
  setContextMenuPosition: (position: { x: number; y: number } | null) => void

  // Layout state
  /** Currently active layout (for sticky behavior) */
  activeLayout: LayoutType | null
  /** Set active layout */
  setActiveLayout: (layout: LayoutType | null) => void
  /** Currently selected layout (shown on button) */
  selectedLayout: LayoutType
  /** Set selected layout */
  setSelectedLayout: (layout: LayoutType) => void
  /** Set of node IDs that have been laid out (for incremental layout) */
  laidOutNodeIds: Set<string>
  /** Add node IDs to laid out set */
  addLaidOutNodeIds: (ids: string[]) => void
  /** Clear all laid out node IDs */
  clearLaidOutNodeIds: () => void
  /** Set all laid out node IDs */
  setLaidOutNodeIds: (ids: Set<string>) => void

  // Creation tracking
  /** Map of conceptId -> relationshipId for newly created relationships */
  newlyCreatedRelationshipIds: Map<string, string>
  /** Add a newly created relationship mapping */
  addNewlyCreatedRelationship: (conceptId: string, relationshipId: string) => void
  /** Remove a newly created relationship mapping */
  removeNewlyCreatedRelationship: (conceptId: string) => void
  /** Clear all newly created relationship mappings */
  clearNewlyCreatedRelationships: () => void
  /** Set of map IDs that have been checked for initial concept creation */
  hasCheckedInitialConcept: Set<string>
  /** Mark a map as checked for initial concept */
  markInitialConceptChecked: (mapId: string) => void
  /** Check if a map has been checked for initial concept */
  isInitialConceptChecked: (mapId: string) => boolean
  /** Clear initial concept check for a map */
  clearInitialConceptCheck: (mapId: string) => void

  // Throttling state
  /** Map of node ID -> last update timestamp (for throttling position updates) */
  lastUpdateTime: Map<string, number>
  /** Update last update time for a node */
  updateLastUpdateTime: (nodeId: string, timestamp: number) => void
  /** Get last update time for a node */
  getLastUpdateTime: (nodeId: string) => number
  /** Clear all update times */
  clearUpdateTimes: () => void

  // Centering state
  /** Whether we're currently centering on a concept */
  isCentering: boolean
  /** Set centering flag */
  setIsCentering: (centering: boolean) => void

  // Pending concept creation
  /** Pending concept creation state */
  pendingConcept: PendingConcept | null
  /** Set pending concept */
  setPendingConcept: (pending: PendingConcept | null) => void

  // Clear all state (useful when switching maps)
  /** Clear all canvas state */
  clearCanvasState: () => void
}

/**
 * Zustand store for canvas state management.
 * Provides reactive state for connection, layout, and creation tracking.
 */
export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Connection state
  connectionStart: null,
  setConnectionStart: (start) => set({ connectionStart: start }),
  connectionMade: false,
  setConnectionMade: (made) => set({ connectionMade: made }),

  // Context menu state
  contextMenuVisible: false,
  setContextMenuVisible: (visible) => set({ contextMenuVisible: visible }),
  contextMenuPosition: null,
  setContextMenuPosition: (position) => set({ contextMenuPosition: position }),

  // Layout state
  activeLayout: null,
  setActiveLayout: (layout) => set({ activeLayout: layout }),
  selectedLayout: 'force-directed',
  setSelectedLayout: (layout) => set({ selectedLayout: layout }),
  laidOutNodeIds: new Set<string>(),
  addLaidOutNodeIds: (ids) =>
    set((state) => {
      const newSet = new Set(state.laidOutNodeIds)
      ids.forEach((id) => newSet.add(id))
      return { laidOutNodeIds: newSet }
    }),
  clearLaidOutNodeIds: () => set({ laidOutNodeIds: new Set<string>() }),
  setLaidOutNodeIds: (ids) => set({ laidOutNodeIds: new Set(ids) }),

  // Creation tracking
  newlyCreatedRelationshipIds: new Map<string, string>(),
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
    set({ newlyCreatedRelationshipIds: new Map<string, string>() }),
  hasCheckedInitialConcept: new Set<string>(),
  markInitialConceptChecked: (mapId) =>
    set((state) => {
      const newSet = new Set(state.hasCheckedInitialConcept)
      newSet.add(mapId)
      return { hasCheckedInitialConcept: newSet }
    }),
  isInitialConceptChecked: (mapId) => get().hasCheckedInitialConcept.has(mapId),
  clearInitialConceptCheck: (mapId) =>
    set((state) => {
      const newSet = new Set(state.hasCheckedInitialConcept)
      newSet.delete(mapId)
      return { hasCheckedInitialConcept: newSet }
    }),

  // Throttling state
  lastUpdateTime: new Map<string, number>(),
  updateLastUpdateTime: (nodeId, timestamp) =>
    set((state) => {
      const newMap = new Map(state.lastUpdateTime)
      newMap.set(nodeId, timestamp)
      return { lastUpdateTime: newMap }
    }),
  getLastUpdateTime: (nodeId) => get().lastUpdateTime.get(nodeId) || 0,
  clearUpdateTimes: () => set({ lastUpdateTime: new Map<string, number>() }),

  // Centering state
  isCentering: false,
  setIsCentering: (centering) => set({ isCentering: centering }),

  // Pending concept creation
  pendingConcept: null,
  setPendingConcept: (pending) => set({ pendingConcept: pending }),

  // Clear all state
  clearCanvasState: () =>
    set({
      connectionStart: null,
      connectionMade: false,
      contextMenuVisible: false,
      contextMenuPosition: null,
      activeLayout: null,
      selectedLayout: 'force-directed',
      laidOutNodeIds: new Set<string>(),
      newlyCreatedRelationshipIds: new Map<string, string>(),
      hasCheckedInitialConcept: new Set<string>(),
      lastUpdateTime: new Map<string, number>(),
      isCentering: false,
      pendingConcept: null,
    }),
}))

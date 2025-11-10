/**
 * Map store for managing current map and perspective state.
 * Uses Zustand for state management.
 */

import { create } from 'zustand'

/**
 * State interface for map-related UI and data state.
 */
export interface MapState {
  /** Current active map ID */
  currentMapId: string | null
  /** Current active perspective ID */
  currentPerspectiveId: string | null
  /** Current concept ID from URL (for deep linking) */
  currentConceptId: string | null
  /** Whether to auto-center on the current concept (set when navigating via URL) */
  shouldAutoCenterConcept: boolean
  /** Set the current map ID */
  setCurrentMapId: (id: string | null) => void
  /** Set the current perspective ID */
  setCurrentPerspectiveId: (id: string | null) => void
  /** Set the current concept ID (from URL) */
  setCurrentConceptId: (id: string | null) => void
  /** Set whether to auto-center on the concept */
  setShouldAutoCenterConcept: (should: boolean) => void

  /** Whether perspective selection mode is active */
  perspectiveSelectionMode: boolean
  /** Set perspective selection mode */
  setPerspectiveSelectionMode: (on: boolean) => void
  /** Whether to hide concepts/relationships not in the current perspective */
  hideNonPerspective: boolean
  /** Set whether to hide non-perspective items */
  setHideNonPerspective: (on: boolean) => void
  /** Flag to indicate if we're editing a perspective (show all concepts, grey out non-selected) */
  isEditingPerspective: boolean
  /** Set whether we're editing a perspective */
  setIsEditingPerspective: (on: boolean) => void

  /** Clear all map state when navigating away */
  clearMapState: () => void
}

/**
 * Zustand store for map-related state management.
 * Provides reactive state for current map, perspective, and editing modes.
 */
export const useMapStore = create<MapState>((set) => ({
  currentMapId: null,
  currentPerspectiveId: null,
  currentConceptId: null,
  shouldAutoCenterConcept: false,
  setCurrentMapId: (id) => set({ currentMapId: id }),
  setCurrentPerspectiveId: (id) => set({ currentPerspectiveId: id }),
  setCurrentConceptId: (id) => set({ currentConceptId: id }),
  setShouldAutoCenterConcept: (should) => set({ shouldAutoCenterConcept: should }),
  perspectiveSelectionMode: false,
  setPerspectiveSelectionMode: (on) => set({ perspectiveSelectionMode: on }),
  hideNonPerspective: false,
  setHideNonPerspective: (on) => set({ hideNonPerspective: on }),
  isEditingPerspective: false,
  setIsEditingPerspective: (on) => set({ isEditingPerspective: on }),
  clearMapState: () =>
    set({
      currentMapId: null,
      currentPerspectiveId: null,
      currentConceptId: null,
      shouldAutoCenterConcept: false,
      perspectiveSelectionMode: false,
      hideNonPerspective: false,
      isEditingPerspective: false,
    }),
}))

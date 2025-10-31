import { create } from 'zustand'

interface MapState {
  // Current map and perspective
  currentMapId: string | null
  currentPerspectiveId: string | null
  setCurrentMapId: (id: string | null) => void
  setCurrentPerspectiveId: (id: string | null) => void

  // Perspective editing UI flags
  perspectiveSelectionMode: boolean
  setPerspectiveSelectionMode: (on: boolean) => void
  hideNonPerspective: boolean
  setHideNonPerspective: (on: boolean) => void
  // Flag to indicate if we're editing a perspective (show all concepts, grey out non-selected)
  isEditingPerspective: boolean
  setIsEditingPerspective: (on: boolean) => void

  // Clear state when navigating away
  clearMapState: () => void
}

export const useMapStore = create<MapState>((set) => ({
  currentMapId: null,
  currentPerspectiveId: null,
  setCurrentMapId: (id) => set({ currentMapId: id }),
  setCurrentPerspectiveId: (id) => set({ currentPerspectiveId: id }),
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
      perspectiveSelectionMode: false,
      hideNonPerspective: false,
      isEditingPerspective: false,
    }),
}))

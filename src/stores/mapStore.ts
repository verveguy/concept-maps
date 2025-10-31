import { create } from 'zustand'

interface MapState {
  // Current map and perspective
  currentMapId: string | null
  currentPerspectiveId: string | null
  setCurrentMapId: (id: string | null) => void
  setCurrentPerspectiveId: (id: string | null) => void

  // Clear state when navigating away
  clearMapState: () => void
}

export const useMapStore = create<MapState>((set) => ({
  currentMapId: null,
  currentPerspectiveId: null,
  setCurrentMapId: (id) => set({ currentMapId: id }),
  setCurrentPerspectiveId: (id) => set({ currentPerspectiveId: id }),
  clearMapState: () =>
    set({
      currentMapId: null,
      currentPerspectiveId: null,
    }),
}))

/**
 * UI store for managing application UI state.
 * Uses Zustand for state management.
 */

import { create } from 'zustand'

/**
 * View mode options for displaying the concept map.
 */
export type ViewMode = 'graph' | 'text' | 'both'

/**
 * State interface for UI-related state.
 */
export interface UIState {
  /** Current view mode: 'graph' | 'text' | 'both' */
  viewMode: ViewMode
  /** Set the view mode */
  setViewMode: (mode: ViewMode) => void
  
  /** Text view visibility (for toggling independently) */
  textViewVisible: boolean
  /** Set text view visibility */
  setTextViewVisible: (visible: boolean) => void
  
  /** Text view node position */
  textViewPosition: { x: number; y: number }
  /** Set text view node position */
  setTextViewPosition: (position: { x: number; y: number }) => void

  /** Currently selected concept ID */
  selectedConceptId: string | null
  /** Currently selected relationship ID */
  selectedRelationshipId: string | null
  /** Set the selected concept ID */
  setSelectedConceptId: (id: string | null) => void
  /** Set the selected relationship ID */
  setSelectedRelationshipId: (id: string | null) => void

  /** Whether the sidebar is open */
  sidebarOpen: boolean
  /** Set sidebar open state */
  setSidebarOpen: (open: boolean) => void

  /** Whether the concept editor panel is open */
  conceptEditorOpen: boolean
  /** Whether the relationship editor panel is open */
  relationshipEditorOpen: boolean
  /** Set concept editor open state */
  setConceptEditorOpen: (open: boolean) => void
  /** Set relationship editor open state */
  setRelationshipEditorOpen: (open: boolean) => void
}

/**
 * Zustand store for UI state management.
 * Provides reactive state for view modes, selections, and panel visibility.
 */
export const useUIStore = create<UIState>((set) => ({
  viewMode: 'graph',
  setViewMode: (mode) => {
    if (mode === 'graph') {
      set({ viewMode: mode, textViewVisible: false })
    } else if (mode === 'text') {
      set({ viewMode: mode, textViewVisible: true })
    } else {
      set({ viewMode: mode, textViewVisible: true })
    }
  },
  
  textViewVisible: false,
  setTextViewVisible: (visible) => {
    set((state) => {
      if (visible && !state.textViewVisible) {
        return { textViewVisible: true, viewMode: 'both' }
      } else if (!visible && state.textViewVisible) {
        return { textViewVisible: false, viewMode: 'graph' }
      }
      return { textViewVisible: visible }
    })
  },
  
  textViewPosition: { x: 1000, y: 100 },
  setTextViewPosition: (position) => set({ textViewPosition: position }),

  selectedConceptId: null,
  selectedRelationshipId: null,
  setSelectedConceptId: (id) => set({ selectedConceptId: id }),
  setSelectedRelationshipId: (id) => set({ selectedRelationshipId: id }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  conceptEditorOpen: false,
  relationshipEditorOpen: false,
  setConceptEditorOpen: (open) => set({ conceptEditorOpen: open }),
  setRelationshipEditorOpen: (open) => set({ relationshipEditorOpen: open }),
}))

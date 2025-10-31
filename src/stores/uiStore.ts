import { create } from 'zustand'

interface UIState {
  // View mode: 'graph' | 'text' | 'both'
  viewMode: 'graph' | 'text' | 'both'
  setViewMode: (mode: 'graph' | 'text' | 'both') => void
  
  // Text view visibility (for toggling independently)
  textViewVisible: boolean
  setTextViewVisible: (visible: boolean) => void
  
  // Text view node position
  textViewPosition: { x: number; y: number }
  setTextViewPosition: (position: { x: number; y: number }) => void

  // Selected entities
  selectedConceptId: string | null
  selectedRelationshipId: string | null
  setSelectedConceptId: (id: string | null) => void
  setSelectedRelationshipId: (id: string | null) => void

  // Sidebar state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // UI panels
  conceptEditorOpen: boolean
  relationshipEditorOpen: boolean
  setConceptEditorOpen: (open: boolean) => void
  setRelationshipEditorOpen: (open: boolean) => void
}

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

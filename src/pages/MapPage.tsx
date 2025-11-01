/**
 * Main map page component.
 * Provides the primary interface for viewing and editing concept maps.
 * Includes concept creation, perspective management, and sharing functionality.
 */

import { useState, useCallback, useRef } from 'react'
import { Plus, X, Share2, Eye, Edit } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConceptMapCanvas, type ConceptMapCanvasRef } from '@/components/graph/ConceptMapCanvas'
import { UnifiedEditor } from '@/components/editor/UnifiedEditor'
import { PerspectiveEditor } from '@/components/perspective/PerspectiveEditor'
import { ShareDialog } from '@/components/share/ShareDialog'
import { useMapStore } from '@/stores/mapStore'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useMap } from '@/hooks/useMap'
import { usePerspectives } from '@/hooks/usePerspectives'

/**
 * Main map page component.
 * Renders the concept map canvas and provides UI for creating concepts,
 * managing perspectives, and sharing maps.
 * 
 * @returns The map page JSX
 */
export function MapPage() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const isEditingPerspective = useMapStore((state) => state.isEditingPerspective)
  const setIsEditingPerspective = useMapStore((state) => state.setIsEditingPerspective)
  const map = useMap()
  const perspectives = usePerspectives()
  const currentPerspective = perspectives.find((p) => p.id === currentPerspectiveId)
  const { createConcept } = useConceptActions()
  const [isCreatingConcept, setIsCreatingConcept] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [conceptLabel, setConceptLabel] = useState('')
  const [createPosition, setCreatePosition] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<ConceptMapCanvasRef>(null)

  const handleCreateConcept = useCallback(
    async (position: { x: number; y: number }) => {
      if (!currentMapId || !map) return

      // Show dialog instead of using prompt()
      setCreatePosition(position)
      setShowCreateDialog(true)
      setConceptLabel('')
    },
    [currentMapId, map]
  )

  const handleSubmitConcept = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!currentMapId || !map || !createPosition || !conceptLabel.trim()) return

      setIsCreatingConcept(true)
      try {
        await createConcept({
          mapId: currentMapId,
          label: conceptLabel.trim(),
          position: createPosition,
          notes: '',
          metadata: {},
        })
        setShowCreateDialog(false)
        setConceptLabel('')
        setCreatePosition(null)
      } catch (error) {
        console.error('Failed to create concept:', error)
        alert('Failed to create concept. Please try again.')
      } finally {
        setIsCreatingConcept(false)
      }
    },
    [currentMapId, map, createPosition, conceptLabel, createConcept]
  )

  if (!currentMapId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">No Map Selected</h2>
            <p className="text-muted-foreground">
              Select a map from the sidebar to begin editing
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="h-full w-full flex flex-col">
        {/* Toolbar */}
        <div className="border-b bg-card px-4 py-2 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{map?.name || 'Untitled Map'}</h1>
            {currentPerspective && (
              <>
                <span className="text-muted-foreground">/</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">{currentPerspective.name}</span>
                  {isEditingPerspective && (
                    <span 
                      title="Editing perspective - Shift+Click concepts to toggle inclusion"
                      className="inline-flex items-center"
                    >
                      <Eye className="h-4 w-4 text-primary" />
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex-1" />
          {currentPerspective && !isEditingPerspective && (
            <button
              onClick={() => setIsEditingPerspective(true)}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 flex items-center gap-2"
              title="Edit perspective"
            >
              <Edit className="h-4 w-4" />
              Edit Perspective
            </button>
          )}
          <button
            onClick={() => setShowShareDialog(true)}
            className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 flex items-center gap-2"
            title="Share map"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={() => handleCreateConcept({ x: 250, y: 250 })}
            disabled={isCreatingConcept}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {isCreatingConcept ? 'Creating...' : 'Add Concept'}
          </button>
        </div>

        {/* Create Concept Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Create New Concept</h2>
              <form onSubmit={handleSubmitConcept} className="space-y-4">
                <div>
                  <label htmlFor="concept-label" className="block text-sm font-medium mb-1">
                    Concept Label
                  </label>
                  <input
                    id="concept-label"
                    type="text"
                    value={conceptLabel}
                    onChange={(e) => setConceptLabel(e.target.value)}
                    placeholder="Enter concept label..."
                    className="w-full px-3 py-2 border rounded-md"
                    autoFocus
                    disabled={isCreatingConcept}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDialog(false)
                      setConceptLabel('')
                      setCreatePosition(null)
                    }}
                    disabled={isCreatingConcept}
                    className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingConcept || !conceptLabel.trim()}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {isCreatingConcept ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Share Dialog */}
        {showShareDialog && (
          <ShareDialog mapId={currentMapId} onClose={() => setShowShareDialog(false)} />
        )}

        {/* Canvas or Text View */}
        <div className="flex-1 overflow-hidden relative">
          <ConceptMapCanvas ref={canvasRef} onCreateConcept={handleCreateConcept} />
          {/* Unified Editor - show when no perspective OR when viewing (not editing) a perspective */}
          {(!currentPerspectiveId || !isEditingPerspective) && <UnifiedEditor />}
          {/* Perspective Editor - only show when actively editing a perspective */}
          {currentPerspectiveId && isEditingPerspective && <PerspectiveEditor />}
        </div>
      </div>
    </AppLayout>
  )
}
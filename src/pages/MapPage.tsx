/**
 * Main map page component.
 * Provides the primary interface for viewing and editing concept maps.
 * Includes concept creation, perspective management, and sharing functionality.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Plus, X, Share2, Eye, Edit, PanelLeft, Lock } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ConceptMapCanvas, type ConceptMapCanvasRef } from '@/components/graph/ConceptMapCanvas'
import { ErrorBoundary } from '@/components/graph/ErrorBoundary'
import { UnifiedEditor } from '@/components/editor/UnifiedEditor'
import { PerspectiveEditor } from '@/components/perspective/PerspectiveEditor'
import { ShareDialog } from '@/components/share/ShareDialog'
import { InvitationAcceptScreen } from '@/components/invitation/InvitationAcceptScreen'
import { SearchBox } from '@/components/layout/SearchBox'
import { UndoButton } from '@/components/ui/UndoButton'
import { PresenceHeader } from '@/components/presence/PresenceHeader'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useMap } from '@/hooks/useMap'
import { usePerspectives } from '@/hooks/usePerspectives'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { usePendingInvitation } from '@/hooks/usePendingInvitation'
import { useCanvasMutations } from '@/hooks/useCanvasMutations'
import { navigateToRoot } from '@/utils/navigation'

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
  const sidebarOpen = useUIStore((state) => state.sidebarOpen)
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen)
  const { map, isLoading: isMapLoading } = useMap()
  const perspectives = usePerspectives()
  const currentPerspective = perspectives.find((p) => p.id === currentPerspectiveId)
  const { createConcept } = useConceptActions()
  const { hasWriteAccess, hasReadAccess } = useMapPermissions()
  const { invitation: pendingInvitation, isLoading: isInvitationLoading } = usePendingInvitation(currentMapId)
  const { updateMap } = useCanvasMutations()
  const [isCreatingConcept, setIsCreatingConcept] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [conceptLabel, setConceptLabel] = useState('')
  const [createPosition, setCreatePosition] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<ConceptMapCanvasRef>(null)
  const mapNameRef = useRef<HTMLHeadingElement>(null)
  const previousMapNameRef = useRef<string>('')
  const isEditingRef = useRef(false)

  // Sync contentEditable element with map name when it changes externally
  useEffect(() => {
    if (mapNameRef.current && !isEditingRef.current && map?.name) {
      const currentText = mapNameRef.current.textContent?.trim() || ''
      if (currentText !== map.name) {
        mapNameRef.current.textContent = map.name
      }
    }
  }, [map?.name])

  const handleCreateConcept = useCallback(
    async (position: { x: number; y: number }) => {
      if (!currentMapId || !map || !hasWriteAccess) return

      // Show dialog instead of using prompt()
      setCreatePosition(position)
      setShowCreateDialog(true)
      setConceptLabel('')
    },
    [currentMapId, map, hasWriteAccess]
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

  /**
   * Handle map name editing - save on blur.
   */
  const handleMapNameBlur = useCallback(
    async (e: React.FocusEvent<HTMLHeadingElement>) => {
      isEditingRef.current = false
      if (!currentMapId || !map || !hasWriteAccess) return

      const newName = e.currentTarget.textContent?.trim() || ''
      const previousName = previousMapNameRef.current || map.name || 'Untitled Map'

      // Only update if the name actually changed
      if (newName !== previousName && newName.length > 0) {
        try {
          await updateMap(
            currentMapId,
            { name: newName },
            { name: previousName }
          )
        } catch (error) {
          console.error('Failed to update map name:', error)
          // Revert to previous name on error
          e.currentTarget.textContent = previousName
        }
      } else if (newName.length === 0) {
        // If empty, revert to previous name
        e.currentTarget.textContent = previousName
      }
    },
    [currentMapId, map, hasWriteAccess, updateMap]
  )

  /**
   * Handle map name focus - store previous name for undo.
   */
  const handleMapNameFocus = useCallback(
    (e: React.FocusEvent<HTMLHeadingElement>) => {
      isEditingRef.current = true
      previousMapNameRef.current = e.currentTarget.textContent?.trim() || map?.name || 'Untitled Map'
    },
    [map]
  )

  /**
   * Handle Enter key to blur (save) the map name.
   */
  const handleMapNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLHeadingElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.currentTarget.blur()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.currentTarget.textContent = previousMapNameRef.current || map?.name || 'Untitled Map'
        e.currentTarget.blur()
      }
    },
    [map]
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

  // Show loading state while checking map access
  if (isMapLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Loading map...</h2>
            <p className="text-muted-foreground">Please wait</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Check if user has access to the map
  // If currentMapId is set but map is null and not loading, user doesn't have access
  if (!map) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md space-y-4">
            <div className="flex justify-center">
              <Lock className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to view this map. The map may not exist, or you may need to request access from the map owner.
            </p>
            <button
              onClick={() => navigateToRoot()}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Return to Home
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Check if user has read access but there's a pending or recently accepted invitation
  // This handles the case where the map is visible (due to hasPendingInvitation permission)
  // but the user hasn't accepted the invitation yet, or has accepted but permissions haven't propagated
  const showInvitationScreen = !hasReadAccess && pendingInvitation && !isInvitationLoading

  // If showing invitation screen, render it in the Canvas area but keep the toolbar visible
  if (showInvitationScreen) {
    return (
      <AppLayout>
        <div className="h-full w-full flex flex-col">
          {/* Toolbar */}
          <div className="border-b bg-card px-4 py-2 flex items-center gap-2">
            {/* Sidebar toggle button - only show when sidebar is closed */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors -ml-1"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h1
                ref={mapNameRef}
                contentEditable={hasWriteAccess}
                suppressContentEditableWarning
                onBlur={handleMapNameBlur}
                onFocus={handleMapNameFocus}
                onKeyDown={handleMapNameKeyDown}
                className="text-lg font-semibold outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1 -mx-1"
                style={{ cursor: hasWriteAccess ? 'text' : 'default' }}
              >
                {map?.name || 'Untitled Map'}
              </h1>
            </div>
            <div className="flex-1" />
            {/* Presence Header - shows all users */}
            <PresenceHeader />
            {/* Search Box */}
            <SearchBox />
            {/* Undo Button */}
            <UndoButton />
          </div>

          {/* Invitation Accept Screen - displayed in Canvas area */}
          <div className="flex-1 overflow-hidden relative">
            <InvitationAcceptScreen invitation={pendingInvitation} mapId={currentMapId} />
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
          {/* Sidebar toggle button - only show when sidebar is closed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors -ml-1"
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1
              ref={mapNameRef}
              contentEditable={hasWriteAccess}
              suppressContentEditableWarning
              onBlur={handleMapNameBlur}
              onFocus={handleMapNameFocus}
              onKeyDown={handleMapNameKeyDown}
              className="text-lg font-semibold outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1 -mx-1"
              style={{ cursor: hasWriteAccess ? 'text' : 'default' }}
            >
              {map?.name || 'Untitled Map'}
            </h1>
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
          {/* Presence Header - shows all users */}
          <PresenceHeader />
          {/* Search Box */}
          <SearchBox />
          {/* Undo Button */}
          <UndoButton />
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
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
            <div className="bg-card text-card-foreground rounded-lg p-6 w-full max-w-md mx-4 shadow-xl border">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Create New Concept</h2>
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
                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
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
                    className="px-4 py-2 text-sm border border-input bg-background text-foreground rounded-md hover:bg-accent disabled:opacity-50 flex items-center gap-2"
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
          <ErrorBoundary>
          <ConceptMapCanvas ref={canvasRef} onCreateConcept={handleCreateConcept} />
          </ErrorBoundary>
          {/* Unified Editor - show when no perspective OR when viewing (not editing) a perspective */}
          {(!currentPerspectiveId || !isEditingPerspective) && <UnifiedEditor />}
          {/* Perspective Editor - only show when actively editing a perspective */}
          {currentPerspectiveId && isEditingPerspective && <PerspectiveEditor />}
        </div>
      </div>
    </AppLayout>
  )
}
/**
 * Perspective Editor component.
 * Allows editing which concepts and relationships are included in a perspective.
 */

import { useState, useEffect, useCallback } from 'react'
import { X, Trash2, Eye, Edit } from 'lucide-react'
import { usePerspectiveActions } from '@/hooks/usePerspectiveActions'
import { usePerspectives } from '@/hooks/usePerspectives'
import { useMapStore } from '@/stores/mapStore'
import { useAllRelationships } from '@/hooks/useRelationships'
import { db } from '@/lib/instant'
import { stripLineBreaks } from '@/lib/textRepresentation'

/**
 * Perspective Editor component.
 * 
 * Allows editing which concepts and relationships are included in a perspective.
 * Provides a side panel interface for managing perspective content with checkboxes
 * for concepts and relationships.
 * 
 * **Features:**
 * - Edit perspective name
 * - Toggle concepts in/out of perspective
 * - Toggle relationships in/out of perspective
 * - Delete perspective
 * - View/edit mode toggle
 * 
 * **Edit Mode:**
 * - Shows all concepts and relationships in the map
 * - Concepts/relationships not in perspective are shown greyed out
 * - Checkboxes allow toggling inclusion
 * - Shift+Click on canvas can also toggle concepts
 * 
 * **View Mode:**
 * - Shows only concepts and relationships included in the perspective
 * - Read-only display
 * - Can switch back to edit mode to modify
 * 
 * **Relationship Constraints:**
 * Relationships can only be included if both their source and target concepts
 * are already in the perspective. This ensures perspective consistency.
 * 
 * @returns The perspective editor JSX, or null if no perspective is selected
 * 
 * @example
 * ```tsx
 * import { PerspectiveEditor } from '@/components/perspective/PerspectiveEditor'
 * 
 * function ConceptMap() {
 *   return (
 *     <>
 *       <ConceptMapCanvas />
 *       <PerspectiveEditor />
 *     </>
 *   )
 * }
 * ```
 */
export function PerspectiveEditor() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const setCurrentPerspectiveId = useMapStore((state) => state.setCurrentPerspectiveId)
  const isEditingPerspective = useMapStore((state) => state.isEditingPerspective)
  const setIsEditingPerspective = useMapStore((state) => state.setIsEditingPerspective)
  const perspectives = usePerspectives()
  const allRelationships = useAllRelationships()
  
  // Set editing flag to true when component mounts (default to edit mode)
  useEffect(() => {
    setIsEditingPerspective(true)
    return () => {
      // Don't clear on unmount - let user control via toggle
    }
  }, [setIsEditingPerspective])
  
  // Load ALL concepts and relationships for the current map (ignore perspective filter)
  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            concepts: {
              map: {
                creator: {},
                readPermissions: {},
                writePermissions: {},
              },
            },
            relationships: {
              map: {
                creator: {},
                readPermissions: {},
                writePermissions: {},
              },
              fromConcept: {},
              toConcept: {},
            },
          },
        }
      : null
  )
  const concepts =
    data?.maps?.[0]?.concepts?.map((c: any) => ({
      id: c.id,
      mapId: c.map?.id || currentMapId || '',
      label: c.label,
      position: { x: c.positionX, y: c.positionY },
      notes: c.notes,
      metadata: c.metadata ? JSON.parse(c.metadata) : {},
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    })) || []
  const relationships =
    data?.maps?.[0]?.relationships?.map((r: any) => ({
      id: r.id,
      mapId: r.map?.id || currentMapId || '',
      fromConceptId: r.fromConcept?.id || '',
      toConceptId: r.toConcept?.id || '',
      primaryLabel: r.primaryLabel,
      reverseLabel: r.reverseLabel,
      notes: r.notes,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    })) || []
  const { updatePerspective, deletePerspective, toggleConceptInPerspective, toggleRelationshipInPerspective } = usePerspectiveActions()

  const perspective = perspectives.find((p) => p.id === currentPerspectiveId)

  if (!currentMapId || !currentPerspectiveId || !perspective) {
    return null
  }

  // Read current state directly from InstantDB (via perspectives hook)
  const selectedConceptIds = new Set(perspective.conceptIds)
  const selectedRelationshipIds = new Set(perspective.relationshipIds)
  
  const [name, setName] = useState(perspective.name)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setName(perspective.name)
  }, [perspective.name])

  const handleSaveName = useCallback(async () => {
    if (name.trim() === perspective.name) return // No change
    
    setIsSaving(true)
    try {
      await updatePerspective(currentPerspectiveId, {
        name: name.trim(),
      })
    } catch (error) {
      console.error('Failed to update perspective name:', error)
      alert('Failed to update perspective name. Please try again.')
      setName(perspective.name) // Revert on error
    } finally {
      setIsSaving(false)
    }
  }, [name, perspective.name, currentPerspectiveId, updatePerspective])

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Are you sure you want to delete perspective "${perspective.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deletePerspective(currentPerspectiveId)
      setCurrentPerspectiveId(null) // Clear selection after deletion
      setIsEditingPerspective(false)
    } catch (error) {
      console.error('Failed to delete perspective:', error)
      alert('Failed to delete perspective. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }, [currentPerspectiveId, perspective, deletePerspective, setCurrentPerspectiveId, setIsEditingPerspective])

  const toggleConcept = useCallback(async (conceptId: string) => {
    if (!currentPerspectiveId) return
    
    try {
      await toggleConceptInPerspective(
        currentPerspectiveId,
        conceptId,
        perspective.conceptIds,
        perspective.relationshipIds,
        allRelationships.map((r) => ({
          id: r.id,
          fromConceptId: r.fromConceptId,
          toConceptId: r.toConceptId,
        }))
      )
    } catch (error) {
      console.error('Failed to toggle concept:', error)
      alert('Failed to toggle concept. Please try again.')
    }
  }, [currentPerspectiveId, perspective, toggleConceptInPerspective, allRelationships])

  const toggleRelationship = useCallback(async (relationshipId: string) => {
    if (!currentPerspectiveId) return
    
    const rel = relationships.find((r) => r.id === relationshipId)
    // Only allow adding relationship if both concepts are selected
    if (!rel || !selectedConceptIds.has(rel.fromConceptId) || !selectedConceptIds.has(rel.toConceptId)) {
      return
    }
    
    try {
      await toggleRelationshipInPerspective(
        currentPerspectiveId,
        relationshipId,
        perspective.relationshipIds
      )
    } catch (error) {
      console.error('Failed to toggle relationship:', error)
      alert('Failed to toggle relationship. Please try again.')
    }
  }, [currentPerspectiveId, perspective, relationships, selectedConceptIds, toggleRelationshipInPerspective])

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-card border-l shadow-lg z-30 flex flex-col border">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-card-foreground">
            {isEditingPerspective ? 'Edit Perspective' : 'View Perspective'}
          </h2>
          <div className="flex items-center gap-2">
            {/* Toggle Edit/View Mode */}
            <button
              onClick={() => setIsEditingPerspective(!isEditingPerspective)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted flex items-center gap-1.5"
              title={isEditingPerspective ? 'Switch to view mode (show only selected concepts)' : 'Switch to edit mode (show all concepts)'}
            >
              {isEditingPerspective ? (
                <>
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">View</span>
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4" />
                  <span className="text-xs">Edit</span>
                </>
              )}
            </button>
            {/* Close Button - switches to view mode (keeps perspective active) */}
            <button
              onClick={() => {
                // Switch to view mode (keep perspective active, just stop editing)
                setIsEditingPerspective(false)
              }}
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
              aria-label="Close editor"
              title="Switch to view mode"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isEditingPerspective && (
            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="font-medium mb-1 text-blue-900 dark:text-blue-100">View Mode</p>
              <p className="text-xs text-blue-800 dark:text-blue-200">Only concepts included in this perspective are shown on the canvas. Switch to Edit mode to modify the perspective.</p>
            </div>
          )}
          {isEditingPerspective && (
            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="font-medium mb-1 text-blue-900 dark:text-blue-100">Edit Mode</p>
              <p className="text-xs text-blue-800 dark:text-blue-200">Shift+Click concepts on the canvas to toggle their inclusion in this perspective. Concepts and relationships not included are shown greyed out.</p>
            </div>
          )}
          {/* Name */}
          <div>
            <label htmlFor="perspective-name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="perspective-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md"
              required
              disabled={isDeleting || isSaving || !isEditingPerspective}
            />
          </div>

          {/* Concepts */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Concepts ({selectedConceptIds.size} selected)
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-input rounded-md p-2 bg-background">
              {concepts.length === 0 ? (
                <p className="text-xs text-muted-foreground">No concepts in this map</p>
              ) : (
                concepts.map((concept) => (
                  <label
                    key={concept.id}
                    className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedConceptIds.has(concept.id)}
                      onChange={() => toggleConcept(concept.id)}
                      disabled={!isEditingPerspective}
                      className="rounded"
                    />
                    <span className="text-sm flex-1 text-foreground">{concept.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Relationships */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Relationships ({selectedRelationshipIds.size} selected)
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-input rounded-md p-2 bg-background">
              {relationships.length === 0 ? (
                <p className="text-xs text-muted-foreground">No relationships in this map</p>
              ) : (
                relationships.map((relationship) => {
                  const fromConcept = concepts.find((c) => c.id === relationship.fromConceptId)
                  const toConcept = concepts.find((c) => c.id === relationship.toConceptId)
                  const canSelect =
                    selectedConceptIds.has(relationship.fromConceptId) &&
                    selectedConceptIds.has(relationship.toConceptId)
                  const isSelected = selectedRelationshipIds.has(relationship.id)

                  return (
                    <label
                      key={relationship.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        canSelect ? 'hover:bg-accent' : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRelationship(relationship.id)}
                        disabled={!isEditingPerspective || !canSelect}
                        className="rounded"
                      />
                      <span className="text-xs flex-1 text-foreground">
                        {fromConcept?.label || '?'} {stripLineBreaks(relationship.primaryLabel)}{' '}
                        {toConcept?.label || '?'}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Only relationships between selected concepts can be included
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/50 space-y-2">
          <p className="text-xs text-muted-foreground">
            Changes are saved automatically. Use Shift+Click on canvas to toggle concepts.
          </p>
          <button
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-background border border-red-300 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Perspective'}
          </button>
        </div>
      </div>
    </div>
  )
}


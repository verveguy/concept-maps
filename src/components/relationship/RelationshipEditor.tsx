import { useState, useEffect, useRef } from 'react'
import { Trash2, X } from 'lucide-react'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'
import { useRelationships } from '@/hooks/useRelationships'
import { useUIStore } from '@/stores/uiStore'

/**
 * RelationshipEditor component - Side panel for editing relationship properties
 * Opens when a relationship is selected via relationshipEditorOpen state
 * Auto-saves on field blur
 */
export function RelationshipEditor() {
  const selectedRelationshipId = useUIStore((state) => state.selectedRelationshipId)
  const relationshipEditorOpen = useUIStore((state) => state.relationshipEditorOpen)
  const setRelationshipEditorOpen = useUIStore((state) => state.setRelationshipEditorOpen)
  const relationships = useRelationships()
  const { updateRelationship, deleteRelationship } = useRelationshipActions()

  const relationship = relationships.find((r) => r.id === selectedRelationshipId)

  const [primaryLabel, setPrimaryLabel] = useState('')
  const [reverseLabel, setReverseLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [edgeType, setEdgeType] = useState<'bezier' | 'smoothstep' | 'step' | 'straight'>('bezier')
  const [edgeColor, setEdgeColor] = useState('#94a3b8')
  const [edgeStyle, setEdgeStyle] = useState<'solid' | 'dashed'>('solid')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const previousRelationshipIdRef = useRef<string | null>(null)
  const isEditingRef = useRef(false)

  // Update form when relationship ID changes (not when relationship data changes while editing)
  useEffect(() => {
    if (selectedRelationshipId && relationship) {
      // Only update if the relationship ID actually changed AND we're not currently editing
      if (previousRelationshipIdRef.current !== selectedRelationshipId && !isEditingRef.current) {
        setPrimaryLabel(relationship.primaryLabel)
        setReverseLabel(relationship.reverseLabel)
        setNotes(relationship.notes || '')
        
        // Extract edge style from metadata
        const metadata = relationship.metadata || {}
        setEdgeType((metadata.edgeType as 'bezier' | 'smoothstep' | 'step' | 'straight') || 'bezier')
        setEdgeColor((metadata.edgeColor as string) || '#94a3b8')
        setEdgeStyle((metadata.edgeStyle as 'solid' | 'dashed') || 'solid')
        
        previousRelationshipIdRef.current = selectedRelationshipId
      }
    } else if (!selectedRelationshipId) {
      setPrimaryLabel('')
      setReverseLabel('')
      setNotes('')
      setEdgeType('bezier')
      setEdgeColor('#94a3b8')
      setEdgeStyle('solid')
      previousRelationshipIdRef.current = null
      isEditingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRelationshipId]) // Only depend on ID, not the relationship object

  const handleSavePrimaryLabel = async () => {
    if (!relationship || !primaryLabel.trim() || primaryLabel.trim() === relationship.primaryLabel) return

    setIsSaving(true)
    try {
      await updateRelationship(relationship.id, {
        primaryLabel: primaryLabel.trim(),
      })
    } catch (error) {
      console.error('Failed to update relationship label:', error)
      alert('Failed to update relationship label. Please try again.')
      setPrimaryLabel(relationship.primaryLabel) // Revert on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveReverseLabel = async () => {
    if (!relationship || reverseLabel === relationship.reverseLabel) return

    setIsSaving(true)
    try {
      await updateRelationship(relationship.id, {
        reverseLabel: reverseLabel.trim() || primaryLabel.trim(),
      })
    } catch (error) {
      console.error('Failed to update relationship reverse label:', error)
      alert('Failed to update relationship reverse label. Please try again.')
      setReverseLabel(relationship.reverseLabel) // Revert on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!relationship || notes === (relationship.notes || '')) return

    setIsSaving(true)
    try {
      await updateRelationship(relationship.id, {
        notes: notes.trim(),
      })
    } catch (error) {
      console.error('Failed to update relationship notes:', error)
      alert('Failed to update relationship notes. Please try again.')
      setNotes(relationship.notes || '') // Revert on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEdgeStyle = async (overrideValues?: {
    edgeType?: 'bezier' | 'smoothstep' | 'step' | 'straight'
    edgeColor?: string
    edgeStyle?: 'solid' | 'dashed'
  }) => {
    if (!relationship) return
    
    isEditingRef.current = false
    
    const currentEdgeType = overrideValues?.edgeType ?? edgeType
    const currentEdgeColor = overrideValues?.edgeColor ?? edgeColor
    const currentEdgeStyle = overrideValues?.edgeStyle ?? edgeStyle
    
    const metadata = relationship.metadata || {}
    const updatedMetadata = {
      ...metadata,
      edgeType: currentEdgeType,
      edgeColor: currentEdgeColor,
      edgeStyle: currentEdgeStyle,
    }
    
    // Only update if metadata actually changed
    const currentMetadataStr = JSON.stringify(metadata)
    const newMetadataStr = JSON.stringify(updatedMetadata)
    if (currentMetadataStr === newMetadataStr) return

    setIsSaving(true)
    try {
      await updateRelationship(relationship.id, {
        metadata: updatedMetadata,
      })
    } catch (error) {
      console.error('Failed to update edge style:', error)
      alert('Failed to update edge style. Please try again.')
      // Revert on error
      const metadata = relationship.metadata || {}
      setEdgeType((metadata.edgeType as 'bezier' | 'smoothstep' | 'step' | 'straight') || 'bezier')
      setEdgeColor((metadata.edgeColor as string) || '#94a3b8')
      setEdgeStyle((metadata.edgeStyle as 'solid' | 'dashed') || 'solid')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!relationship || !confirm('Are you sure you want to delete this relationship?')) return

    setIsDeleting(true)
    try {
      await deleteRelationship(relationship.id)
      setRelationshipEditorOpen(false)
    } catch (error) {
      console.error('Failed to delete relationship:', error)
      alert('Failed to delete relationship. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!relationshipEditorOpen || !relationship) {
    return null
  }

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white border-l shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Relationship</h2>
          <button
            onClick={() => setRelationshipEditorOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
            aria-label="Close editor"
            tabIndex={1}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label htmlFor="relationship-primary-label" className="block text-sm font-medium mb-1">
              Primary Label (Forward Direction)
            </label>
            <input
              id="relationship-primary-label"
              type="text"
              value={primaryLabel}
              onChange={(e) => setPrimaryLabel(e.target.value)}
              onBlur={handleSavePrimaryLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="w-full px-3 py-2 border rounded-md"
              required
              disabled={isDeleting || isSaving}
              placeholder="e.g., 'related to'"
              tabIndex={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Label when viewing from source to target concept
            </p>
          </div>

          <div>
            <label htmlFor="relationship-reverse-label" className="block text-sm font-medium mb-1">
              Reverse Label (Backward Direction)
            </label>
            <input
              id="relationship-reverse-label"
              type="text"
              value={reverseLabel}
              onChange={(e) => setReverseLabel(e.target.value)}
              onBlur={handleSaveReverseLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="w-full px-3 py-2 border rounded-md"
              disabled={isDeleting || isSaving}
              placeholder="e.g., 'related from'"
              tabIndex={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Label when viewing from target to source concept
            </p>
          </div>

          <div>
            <label htmlFor="relationship-notes" className="block text-sm font-medium mb-1">
              Notes (Markdown)
            </label>
            <textarea
              id="relationship-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              rows={8}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm"
              placeholder="Add notes about this relationship..."
              disabled={isDeleting || isSaving}
              tabIndex={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Markdown formatting supported
            </p>
          </div>

          {/* Edge Style section */}
          <div>
            <label className="block text-sm font-medium mb-2">Edge Style</label>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="edge-type" className="block text-xs font-medium mb-1">
                  Edge Type
                </label>
                <select
                  id="edge-type"
                  value={edgeType}
                  onChange={(e) => {
                    const newType = e.target.value as 'bezier' | 'smoothstep' | 'step' | 'straight'
                    isEditingRef.current = true
                    setEdgeType(newType)
                    // Save immediately for dropdowns with the new value
                    handleSaveEdgeStyle({ edgeType: newType })
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md"
                  disabled={isDeleting || isSaving}
                  tabIndex={5}
                >
                  <option value="bezier">Bezier (Curved)</option>
                  <option value="smoothstep">Smooth Step</option>
                  <option value="step">Step</option>
                  <option value="straight">Straight</option>
                </select>
              </div>

              <div>
                <label htmlFor="edge-color" className="block text-xs font-medium mb-1">
                  Edge Color
                </label>
                <div className="flex gap-2">
                  <input
                    id="edge-color"
                    type="color"
                    value={edgeColor}
                    onChange={(e) => {
                      const newColor = e.target.value
                      isEditingRef.current = true
                      setEdgeColor(newColor)
                      // Save immediately for color picker with the new value
                      handleSaveEdgeStyle({ edgeColor: newColor })
                    }}
                    className="w-16 h-10 border rounded cursor-pointer"
                    disabled={isDeleting || isSaving}
                    tabIndex={6}
                  />
                  <input
                    type="text"
                    value={edgeColor}
                    onChange={(e) => {
                      isEditingRef.current = true
                      setEdgeColor(e.target.value)
                    }}
                    onFocus={() => {
                      isEditingRef.current = true
                    }}
                    onBlur={handleSaveEdgeStyle}
                    placeholder="#94a3b8"
                    className="flex-1 px-3 py-2 text-sm border rounded-md font-mono"
                    disabled={isDeleting || isSaving}
                    tabIndex={7}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edge-style" className="block text-xs font-medium mb-1">
                  Line Style
                </label>
                <select
                  id="edge-style"
                  value={edgeStyle}
                  onChange={(e) => {
                    const newStyle = e.target.value as 'solid' | 'dashed'
                    isEditingRef.current = true
                    setEdgeStyle(newStyle)
                    // Save immediately for dropdowns with the new value
                    handleSaveEdgeStyle({ edgeStyle: newStyle })
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md"
                  disabled={isDeleting || isSaving}
                  tabIndex={8}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Edge style changes are saved immediately. Color text input saves on blur.
            </p>
          </div>

          {/* Metadata section - placeholder for future */}
          <div>
            <label className="block text-sm font-medium mb-1">Metadata</label>
            <p className="text-xs text-muted-foreground">
              Metadata editing coming soon...
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="w-full px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2"
              tabIndex={9}
            >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Relationship'}
          </button>
        </div>
      </div>
    </div>
  )
}

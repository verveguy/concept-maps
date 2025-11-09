import { useState, useEffect, useRef } from 'react'
import { Trash2, X, Plus } from 'lucide-react'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'
import { useUndo } from '@/hooks/useUndo'
import { useConcepts } from '@/hooks/useConcepts'
import { useRelationships } from '@/hooks/useRelationships'
import { useUIStore } from '@/stores/uiStore'
import { MarkdownEditor } from '@/components/notes/MarkdownEditor'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { stripLineBreaks } from '@/lib/textRepresentation'

/**
 * Style attribute keys that should be treated as built-in attributes, not metadata
 */
const NODE_STYLE_ATTRIBUTES = ['fillColor', 'borderColor', 'borderStyle', 'textColor']
const EDGE_STYLE_ATTRIBUTES = ['edgeType', 'edgeColor', 'edgeStyle']

/**
 * Filter out style attributes from metadata
 */
function getNonStyleMetadata(metadata: Record<string, unknown>, styleAttributes: string[]): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}
  Object.entries(metadata).forEach(([key, value]) => {
    if (!styleAttributes.includes(key)) {
      filtered[key] = value
    }
  })
  return filtered
}

/**
 * Unified Editor component that switches between Concept and Relationship editing.
 * 
 * Shows the editor for the most recently selected item (concept or relationship).
 * Only one editor is displayed at a time - selecting a new item closes the previous
 * editor and opens the new one.
 * 
 * **Editor Priority:**
 * - Concept editor takes priority if both a concept and relationship are selected
 * - Relationship editor shows only if no concept is selected
 * - Editors close when their respective item is deselected
 * 
 * **Features:**
 * - Auto-saves on field blur
 * - Supports markdown notes
 * - Metadata editing
 * - Style customization (colors, borders, edge types)
 * - Delete functionality with undo support
 * - Read-only mode for users without write access
 * 
 * **Deletion Handling:**
 * Deletions are tracked in the undo store for undo functionality. When a concept
 * or relationship is deleted, it's recorded as part of a deletion operation.
 * 
 * @returns The unified editor JSX (ConceptEditor or RelationshipEditor), or null if nothing is selected
 * 
 * @example
 * ```tsx
 * import { UnifiedEditor } from '@/components/editor/UnifiedEditor'
 * 
 * function ConceptMap() {
 *   return (
 *     <>
 *       <ConceptMapCanvas />
 *       <UnifiedEditor />
 *     </>
 *   )
 * }
 * ```
 */
export function UnifiedEditor() {
  const selectedConceptId = useUIStore((state) => state.selectedConceptId)
  const selectedRelationshipId = useUIStore((state) => state.selectedRelationshipId)
  const conceptEditorOpen = useUIStore((state) => state.conceptEditorOpen)
  const relationshipEditorOpen = useUIStore((state) => state.relationshipEditorOpen)
  const setConceptEditorOpen = useUIStore((state) => state.setConceptEditorOpen)
  const setRelationshipEditorOpen = useUIStore((state) => state.setRelationshipEditorOpen)
  
  const concepts = useConcepts()
  const relationships = useRelationships()
  const { updateConcept, deleteConcept } = useConceptActions()
  const { updateRelationship, deleteRelationship } = useRelationshipActions()
  const { recordDeletion, startOperation, endOperation } = useUndo()

  // Wrapper functions to record deletions for undo
  const handleDeleteConcept = async (conceptId: string) => {
    try {
      startOperation()
      recordDeletion('concept', conceptId)
      await deleteConcept(conceptId)
      endOperation()
    } catch (error) {
      endOperation()
      throw error
    }
  }

  const handleDeleteRelationship = async (relationshipId: string) => {
    try {
      startOperation()
      recordDeletion('relationship', relationshipId)
      await deleteRelationship(relationshipId)
      endOperation()
    } catch (error) {
      endOperation()
      throw error
    }
  }

  const concept = concepts.find((c) => c.id === selectedConceptId)
  const relationship = relationships.find((r) => r.id === selectedRelationshipId)

  // Track which was selected most recently
  const lastSelectedRef = useRef<'concept' | 'relationship' | null>(null)
  
  useEffect(() => {
    if (selectedConceptId) {
      lastSelectedRef.current = 'concept'
    } else if (selectedRelationshipId) {
      lastSelectedRef.current = 'relationship'
    }
  }, [selectedConceptId, selectedRelationshipId])

  // Determine which editor to show - prioritize the most recently selected item
  // Since we now close the other editor when switching, only one should be open at a time
  const shouldShowConceptEditor = 
    conceptEditorOpen && 
    concept && 
    selectedConceptId
  
  const shouldShowRelationshipEditor = 
    relationshipEditorOpen && 
    relationship && 
    selectedRelationshipId &&
    !shouldShowConceptEditor // Only show if concept editor is not showing

  // Only show one editor at a time
  if (shouldShowConceptEditor) {
    return (
      <ConceptEditorContent
        concept={concept}
        onClose={() => setConceptEditorOpen(false)}
        onUpdate={updateConcept}
        onDelete={handleDeleteConcept}
      />
    )
  }

  if (shouldShowRelationshipEditor) {
    return (
      <RelationshipEditorContent
        relationship={relationship}
        onClose={() => setRelationshipEditorOpen(false)}
        onUpdate={updateRelationship}
        onDelete={handleDeleteRelationship}
      />
    )
  }

  return null
}

/**
 * Concept Editor Content Component
 */
function ConceptEditorContent({
  concept,
  onClose,
  onUpdate,
  onDelete,
}: {
  concept: { id: string; label: string; notes: string; metadata: Record<string, unknown> }
  onClose: () => void
  onUpdate: (id: string, updates: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const { hasWriteAccess } = useMapPermissions()
  const [label, setLabel] = useState(concept.label)
  const [notes, setNotes] = useState(concept.notes || '')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [fillColor, setFillColor] = useState('#ffffff')
  const [borderColor, setBorderColor] = useState('#d1d5db')
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [textColor, setTextColor] = useState('#111827')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isEditingRef = useRef(false)

  // Update form when concept changes
  useEffect(() => {
    if (!isEditingRef.current) {
      setLabel(concept.label)
      setNotes(concept.notes || '')
      // Only include non-style metadata in the editable metadata fields
      const nonStyleMetadata = getNonStyleMetadata(concept.metadata || {}, NODE_STYLE_ATTRIBUTES)
      const metadataStrings: Record<string, string> = {}
      Object.entries(nonStyleMetadata).forEach(([key, value]) => {
        metadataStrings[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
      })
      setMetadata(metadataStrings)
      const conceptMetadata = concept.metadata || {}
      setFillColor((conceptMetadata.fillColor as string) || '#ffffff')
      setBorderColor((conceptMetadata.borderColor as string) || '#d1d5db')
      setBorderStyle((conceptMetadata.borderStyle as 'solid' | 'dashed' | 'dotted') || 'solid')
      setTextColor((conceptMetadata.textColor as string) || '#111827')
    }
  }, [concept])

  const handleSaveLabel = async () => {
    if (!hasWriteAccess || !label.trim() || label.trim() === concept.label) return
    setIsSaving(true)
    isEditingRef.current = false
    try {
      await onUpdate(concept.id, { label: label.trim() })
    } catch (error) {
      console.error('Failed to update concept label:', error)
      alert('Failed to update concept label. Please try again.')
      setLabel(concept.label)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!hasWriteAccess || notes === (concept.notes || '')) return
    setIsSaving(true)
    isEditingRef.current = false
    try {
      await onUpdate(concept.id, { notes: notes.trim() })
    } catch (error) {
      console.error('Failed to update concept notes:', error)
      alert('Failed to update concept notes. Please try again.')
      setNotes(concept.notes || '')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveMetadata = async () => {
    if (!hasWriteAccess) return
    
    // Set editing flag to false BEFORE starting save to prevent useEffect from resetting fields
    isEditingRef.current = false
    
    // Check if metadata actually changed before saving
    const metadataObj: Record<string, unknown> = {}
    Object.entries(metadata).forEach(([key, value]) => {
      if (key.trim() && value.trim()) {
        try {
          metadataObj[key] = JSON.parse(value)
        } catch {
          metadataObj[key] = value
        }
      }
    })
    // Preserve style attributes when saving metadata
    const currentMetadata = concept.metadata || {}
    const newMetadata = {
      ...currentMetadata,
      ...metadataObj,
      // Ensure style attributes are preserved
      fillColor: currentMetadata.fillColor,
      borderColor: currentMetadata.borderColor,
      borderStyle: currentMetadata.borderStyle,
      textColor: currentMetadata.textColor,
    }
    
    // Only save if metadata actually changed
    const currentMetadataStr = JSON.stringify(currentMetadata)
    const newMetadataStr = JSON.stringify(newMetadata)
    if (currentMetadataStr === newMetadataStr) return
    
    setIsSaving(true)
    try {
      await onUpdate(concept.id, { metadata: newMetadata })
    } catch (error) {
      console.error('Failed to update concept metadata:', error)
      alert('Failed to update concept metadata. Please try again.')
      // Revert editing flag on error so form can be reset
      isEditingRef.current = true
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNodeStyle = async (overrideValues?: {
    fillColor?: string
    borderColor?: string
    borderStyle?: 'solid' | 'dashed' | 'dotted'
    textColor?: string
  }) => {
    if (!hasWriteAccess) return
    const currentMetadata = concept.metadata || {}
    const newMetadata = {
      ...currentMetadata,
      fillColor: overrideValues?.fillColor ?? fillColor,
      borderColor: overrideValues?.borderColor ?? borderColor,
      borderStyle: overrideValues?.borderStyle ?? borderStyle,
      textColor: overrideValues?.textColor ?? textColor,
    }
    try {
      await onUpdate(concept.id, { metadata: newMetadata })
    } catch (error) {
      console.error('Failed to update node style:', error)
      alert('Failed to update node style. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!hasWriteAccess || !confirm(`Are you sure you want to delete "${concept.label}"?`)) return
    setIsDeleting(true)
    try {
      await onDelete(concept.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete concept:', error)
      alert('Failed to delete concept. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddMetadata = () => {
    if (!hasWriteAccess) return
    const newKey = `key${Object.keys(metadata).length + 1}`
    setMetadata({ ...metadata, [newKey]: '' })
    isEditingRef.current = true
  }

  const handleUpdateMetadataKey = (oldKey: string, newKey: string) => {
    if (!hasWriteAccess || newKey === oldKey) return
    const newMetadata = { ...metadata }
    delete newMetadata[oldKey]
    if (newKey.trim()) {
      newMetadata[newKey] = metadata[oldKey] || ''
    }
    setMetadata(newMetadata)
    isEditingRef.current = true
  }

  const handleUpdateMetadataValue = (key: string, value: string) => {
    if (!hasWriteAccess) return
    setMetadata({ ...metadata, [key]: value })
    isEditingRef.current = true
  }

  const handleRemoveMetadata = (key: string) => {
    if (!hasWriteAccess) return
    const newMetadata = { ...metadata }
    delete newMetadata[key]
    setMetadata(newMetadata)
    isEditingRef.current = true
  }

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white border-l shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {hasWriteAccess ? 'Edit Concept' : 'View Concept'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
            aria-label="Close editor"
            tabIndex={1}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {!hasWriteAccess && (
          <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-xs font-medium text-amber-800">
              Read-only mode: You have read-only access to this map
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Label */}
          <div>
            <label htmlFor="concept-label" className="block text-sm font-medium mb-1">
              Label
            </label>
            <input
              id="concept-label"
              type="text"
              value={label}
              onChange={(e) => {
                if (hasWriteAccess) {
                  setLabel(e.target.value)
                  isEditingRef.current = true
                }
              }}
              onBlur={handleSaveLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="w-full px-3 py-2 border rounded-md"
              required
              disabled={isDeleting || isSaving || !hasWriteAccess}
              tabIndex={2}
            />
          </div>

          {/* Notes */}
          <div>
            <MarkdownEditor
              value={notes}
              onChange={(value) => {
                if (hasWriteAccess) {
                  setNotes(value)
                  isEditingRef.current = true
                }
              }}
              onBlur={handleSaveNotes}
              placeholder="Add notes about this concept..."
              disabled={isDeleting || isSaving || !hasWriteAccess}
            />
          </div>

          {/* Node Style */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Node Style</h3>
            
            {/* Fill Color */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Fill Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => {
                    if (hasWriteAccess) {
                      setFillColor(e.target.value)
                      handleSaveNodeStyle({ fillColor: e.target.value })
                    }
                  }}
                  className="w-12 h-8 border rounded cursor-pointer"
                  disabled={!hasWriteAccess}
                  tabIndex={10}
                />
                <input
                  type="text"
                  value={fillColor}
                  onChange={(e) => {
                    if (hasWriteAccess) {
                      setFillColor(e.target.value)
                      isEditingRef.current = true
                    }
                  }}
                  onBlur={() => handleSaveNodeStyle({ fillColor })}
                  className="flex-1 px-2 py-1 text-xs border rounded"
                  placeholder="#ffffff"
                  disabled={!hasWriteAccess}
                  tabIndex={11}
                />
              </div>
            </div>

            {/* Border Color */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Border Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => {
                    if (hasWriteAccess) {
                      setBorderColor(e.target.value)
                      handleSaveNodeStyle({ borderColor: e.target.value })
                    }
                  }}
                  className="w-12 h-8 border rounded cursor-pointer"
                  disabled={!hasWriteAccess}
                  tabIndex={12}
                />
                <input
                  type="text"
                  value={borderColor}
                  onChange={(e) => {
                    if (hasWriteAccess) {
                      setBorderColor(e.target.value)
                      isEditingRef.current = true
                    }
                  }}
                  onBlur={() => handleSaveNodeStyle({ borderColor })}
                  className="flex-1 px-2 py-1 text-xs border rounded"
                  placeholder="#d1d5db"
                  disabled={!hasWriteAccess}
                  tabIndex={13}
                />
              </div>
            </div>

            {/* Border Style */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Border Style</label>
              <select
                value={borderStyle}
                onChange={(e) => {
                  if (hasWriteAccess) {
                    const style = e.target.value as 'solid' | 'dashed' | 'dotted'
                    setBorderStyle(style)
                    handleSaveNodeStyle({ borderStyle: style })
                  }
                }}
                className="w-full px-2 py-1 text-xs border rounded"
                disabled={!hasWriteAccess}
                tabIndex={14}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>

            {/* Text Color */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    if (hasWriteAccess) {
                      setTextColor(e.target.value)
                      handleSaveNodeStyle({ textColor: e.target.value })
                    }
                  }}
                  className="w-12 h-8 border rounded cursor-pointer"
                  disabled={!hasWriteAccess}
                  tabIndex={15}
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => {
                    if (hasWriteAccess) {
                      setTextColor(e.target.value)
                      isEditingRef.current = true
                    }
                  }}
                  onBlur={() => handleSaveNodeStyle({ textColor })}
                  className="flex-1 px-2 py-1 text-xs border rounded"
                  placeholder="#111827"
                  disabled={!hasWriteAccess}
                  tabIndex={16}
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Metadata</h3>
              <button
                onClick={handleAddMetadata}
                className="p-1 text-primary hover:bg-primary/10 rounded"
                disabled={isDeleting || isSaving || !hasWriteAccess}
                tabIndex={17}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(metadata).map(([key, value], index) => (
                <div key={`metadata-${key}-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => handleUpdateMetadataKey(key, e.target.value)}
                    onFocus={() => {
                      isEditingRef.current = true
                    }}
                    onBlur={handleSaveMetadata}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                    placeholder="Key"
                    disabled={!hasWriteAccess}
                    tabIndex={18 + index * 2}
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleUpdateMetadataValue(key, e.target.value)}
                    onFocus={() => {
                      isEditingRef.current = true
                    }}
                    onBlur={handleSaveMetadata}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                    placeholder="Value"
                    disabled={!hasWriteAccess}
                    tabIndex={19 + index * 2}
                  />
                  <button
                    onClick={() => {
                      handleRemoveMetadata(key)
                      handleSaveMetadata()
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    disabled={!hasWriteAccess}
                    tabIndex={20 + index * 2}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {Object.keys(metadata).length === 0 && (
                <p className="text-xs text-muted-foreground">No metadata fields</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleDelete}
            disabled={isDeleting || isSaving || !hasWriteAccess}
            className="w-full px-4 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
            tabIndex={100}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Concept'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Relationship Editor Content Component
 */
function RelationshipEditorContent({
  relationship,
  onClose,
  onUpdate,
  onDelete,
}: {
  relationship: {
    id: string
    primaryLabel: string
    reverseLabel: string
    notes: string
    metadata: Record<string, unknown>
  }
  onClose: () => void
  onUpdate: (id: string, updates: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const { hasWriteAccess } = useMapPermissions()
  const [primaryLabel, setPrimaryLabel] = useState(relationship.primaryLabel)
  const [reverseLabel, setReverseLabel] = useState(relationship.reverseLabel)
  const [notes, setNotes] = useState(relationship.notes || '')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [edgeType, setEdgeType] = useState<'bezier' | 'smoothstep' | 'step' | 'straight'>('bezier')
  const [edgeColor, setEdgeColor] = useState('#6366f1')
  const [edgeStyle, setEdgeStyle] = useState<'solid' | 'dashed'>('solid')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const isEditingRef = useRef(false)

  // Update form when relationship changes
  useEffect(() => {
    if (!isEditingRef.current) {
      // Strip line breaks when loading labels for text panel editing
      setPrimaryLabel(stripLineBreaks(relationship.primaryLabel))
      setReverseLabel(stripLineBreaks(relationship.reverseLabel))
      setNotes(relationship.notes || '')
      // Only include non-style metadata in the editable metadata fields
      const nonStyleMetadata = getNonStyleMetadata(relationship.metadata || {}, EDGE_STYLE_ATTRIBUTES)
      const metadataStrings: Record<string, string> = {}
      Object.entries(nonStyleMetadata).forEach(([key, value]) => {
        metadataStrings[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
      })
      setMetadata(metadataStrings)
      const relationshipMetadata = relationship.metadata || {}
      setEdgeType((relationshipMetadata.edgeType as 'bezier' | 'smoothstep' | 'step' | 'straight') || 'bezier')
      setEdgeColor((relationshipMetadata.edgeColor as string) || '#6366f1')
      setEdgeStyle((relationshipMetadata.edgeStyle as 'solid' | 'dashed') || 'solid')
    }
  }, [relationship])

  const handleSavePrimaryLabel = async () => {
    if (!hasWriteAccess || !primaryLabel.trim()) return
    // Strip line breaks before saving - line breaks are only for diagram display
    const cleanedLabel = stripLineBreaks(primaryLabel)
    if (cleanedLabel === stripLineBreaks(relationship.primaryLabel)) return
    setIsSaving(true)
    isEditingRef.current = false
    try {
      await onUpdate(relationship.id, { primaryLabel: cleanedLabel })
    } catch (error) {
      console.error('Failed to update relationship label:', error)
      alert('Failed to update relationship label. Please try again.')
      setPrimaryLabel(stripLineBreaks(relationship.primaryLabel))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveReverseLabel = async () => {
    if (!hasWriteAccess || !reverseLabel.trim()) return
    // Strip line breaks before saving - line breaks are only for diagram display
    const cleanedLabel = stripLineBreaks(reverseLabel)
    if (cleanedLabel === stripLineBreaks(relationship.reverseLabel)) return
    setIsSaving(true)
    isEditingRef.current = false
    try {
      await onUpdate(relationship.id, { reverseLabel: cleanedLabel })
    } catch (error) {
      console.error('Failed to update reverse label:', error)
      alert('Failed to update reverse label. Please try again.')
      setReverseLabel(stripLineBreaks(relationship.reverseLabel))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!hasWriteAccess || notes === (relationship.notes || '')) return
    setIsSaving(true)
    isEditingRef.current = false
    try {
      await onUpdate(relationship.id, { notes: notes.trim() })
    } catch (error) {
      console.error('Failed to update relationship notes:', error)
      alert('Failed to update relationship notes. Please try again.')
      setNotes(relationship.notes || '')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEdgeStyle = async (overrideValues?: {
    edgeType?: 'bezier' | 'smoothstep' | 'step' | 'straight'
    edgeColor?: string
    edgeStyle?: 'solid' | 'dashed'
  }) => {
    if (!hasWriteAccess) return
    const currentMetadata = relationship.metadata || {}
    const newMetadata = {
      ...currentMetadata,
      edgeType: overrideValues?.edgeType ?? edgeType,
      edgeColor: overrideValues?.edgeColor ?? edgeColor,
      edgeStyle: overrideValues?.edgeStyle ?? edgeStyle,
    }
    try {
      await onUpdate(relationship.id, { metadata: newMetadata })
    } catch (error) {
      console.error('Failed to update edge style:', error)
      alert('Failed to update edge style. Please try again.')
    }
  }

  const handleSaveMetadata = async () => {
    if (!hasWriteAccess) return
    
    // Set editing flag to false BEFORE starting save to prevent useEffect from resetting fields
    isEditingRef.current = false
    
    // Check if metadata actually changed before saving
    const metadataObj: Record<string, unknown> = {}
    Object.entries(metadata).forEach(([key, value]) => {
      if (key.trim() && value.trim()) {
        try {
          metadataObj[key] = JSON.parse(value)
        } catch {
          metadataObj[key] = value
        }
      }
    })
    // Preserve style attributes when saving metadata
    const currentMetadata = relationship.metadata || {}
    const newMetadata = {
      ...currentMetadata,
      ...metadataObj,
      // Ensure style attributes are preserved
      edgeType: currentMetadata.edgeType,
      edgeColor: currentMetadata.edgeColor,
      edgeStyle: currentMetadata.edgeStyle,
    }
    
    // Only save if metadata actually changed
    const currentMetadataStr = JSON.stringify(currentMetadata)
    const newMetadataStr = JSON.stringify(newMetadata)
    if (currentMetadataStr === newMetadataStr) return
    
    setIsSaving(true)
    try {
      await onUpdate(relationship.id, { metadata: newMetadata })
    } catch (error) {
      console.error('Failed to update relationship metadata:', error)
      alert('Failed to update relationship metadata. Please try again.')
      // Revert editing flag on error so form can be reset
      isEditingRef.current = true
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMetadata = () => {
    if (!hasWriteAccess) return
    const newKey = `key${Object.keys(metadata).length + 1}`
    setMetadata({ ...metadata, [newKey]: '' })
    isEditingRef.current = true
  }

  const handleUpdateMetadataKey = (oldKey: string, newKey: string) => {
    if (!hasWriteAccess || newKey === oldKey) return
    const newMetadata = { ...metadata }
    delete newMetadata[oldKey]
    if (newKey.trim()) {
      newMetadata[newKey] = metadata[oldKey] || ''
    }
    setMetadata(newMetadata)
    isEditingRef.current = true
  }

  const handleUpdateMetadataValue = (key: string, value: string) => {
    if (!hasWriteAccess) return
    setMetadata({ ...metadata, [key]: value })
    isEditingRef.current = true
  }

  const handleRemoveMetadata = (key: string) => {
    if (!hasWriteAccess) return
    const newMetadata = { ...metadata }
    delete newMetadata[key]
    setMetadata(newMetadata)
    isEditingRef.current = true
  }

  const handleDelete = async () => {
    if (!hasWriteAccess || !confirm(`Are you sure you want to delete this relationship?`)) return
    setIsDeleting(true)
    try {
      await onDelete(relationship.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete relationship:', error)
      alert('Failed to delete relationship. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white border-l shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {hasWriteAccess ? 'Edit Relationship' : 'View Relationship'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
            aria-label="Close editor"
            tabIndex={1}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {!hasWriteAccess && (
          <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-xs font-medium text-amber-800">
              Read-only mode: You have read-only access to this map
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Primary Label */}
          <div>
            <label htmlFor="relationship-primary-label" className="block text-sm font-medium mb-1">
              Primary Label (Forward Direction)
            </label>
            <input
              id="relationship-primary-label"
              type="text"
              value={primaryLabel}
              onChange={(e) => {
                if (hasWriteAccess) {
                  setPrimaryLabel(e.target.value)
                  isEditingRef.current = true
                }
              }}
              onBlur={handleSavePrimaryLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="w-full px-3 py-2 border rounded-md"
              required
              disabled={isDeleting || isSaving || !hasWriteAccess}
              placeholder="e.g., 'related to'"
              tabIndex={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Label when viewing from source to target concept
            </p>
          </div>

          {/* Reverse Label */}
          <div>
            <label
              htmlFor="relationship-reverse-label"
              className="block text-sm font-medium mb-1"
            >
              Reverse Label (Backward Direction)
            </label>
            <input
              id="relationship-reverse-label"
              type="text"
              value={reverseLabel}
              onChange={(e) => {
                if (hasWriteAccess) {
                  setReverseLabel(e.target.value)
                  isEditingRef.current = true
                }
              }}
              onBlur={handleSaveReverseLabel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="w-full px-3 py-2 border rounded-md"
              required
              disabled={isDeleting || isSaving || !hasWriteAccess}
              placeholder="e.g., 'related from'"
              tabIndex={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Label when viewing from target to source concept
            </p>
          </div>

          {/* Notes */}
          <div>
            <MarkdownEditor
              value={notes}
              onChange={(value) => {
                if (hasWriteAccess) {
                  setNotes(value)
                  isEditingRef.current = true
                }
              }}
              onBlur={handleSaveNotes}
              placeholder="Add notes about this relationship..."
              disabled={isDeleting || isSaving || !hasWriteAccess}
            />
          </div>

          {/* Edge Style */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Edge Style</h3>
            
            {/* Edge Type */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Edge Type</label>
              <select
                value={edgeType}
                onChange={(e) => {
                  if (hasWriteAccess) {
                    const type = e.target.value as 'bezier' | 'smoothstep' | 'step' | 'straight'
                    setEdgeType(type)
                    handleSaveEdgeStyle({ edgeType: type })
                  }
                }}
                className="w-full px-2 py-1 text-xs border rounded"
                disabled={!hasWriteAccess}
                tabIndex={5}
              >
                <option value="bezier">Bezier</option>
                <option value="smoothstep">Smooth Step</option>
                <option value="step">Step</option>
                <option value="straight">Straight</option>
              </select>
            </div>

            {/* Edge Color */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Edge Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={edgeColor}
                  onChange={(e) => {
                    if (hasWriteAccess) {
                      setEdgeColor(e.target.value)
                      handleSaveEdgeStyle({ edgeColor: e.target.value })
                    }
                  }}
                  className="w-12 h-8 border rounded cursor-pointer"
                  disabled={!hasWriteAccess}
                  tabIndex={6}
                />
                <input
                  type="text"
                  value={edgeColor}
                  onChange={(e) => {
                    if (hasWriteAccess) {
                      setEdgeColor(e.target.value)
                      isEditingRef.current = true
                    }
                  }}
                  onBlur={() => handleSaveEdgeStyle({ edgeColor })}
                  className="flex-1 px-2 py-1 text-xs border rounded"
                  placeholder="#6366f1"
                  disabled={!hasWriteAccess}
                  tabIndex={7}
                />
              </div>
            </div>

            {/* Line Style */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1">Line Style</label>
              <select
                value={edgeStyle}
                onChange={(e) => {
                  if (hasWriteAccess) {
                    const style = e.target.value as 'solid' | 'dashed'
                    setEdgeStyle(style)
                    handleSaveEdgeStyle({ edgeStyle: style })
                  }
                }}
                className="w-full px-2 py-1 text-xs border rounded"
                disabled={!hasWriteAccess}
                tabIndex={8}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
              </select>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Metadata</h3>
              <button
                onClick={handleAddMetadata}
                className="p-1 text-primary hover:bg-primary/10 rounded"
                disabled={isDeleting || isSaving || !hasWriteAccess}
                tabIndex={9}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {Object.entries(metadata).map(([key, value], index) => (
                <div key={`metadata-${key}-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => handleUpdateMetadataKey(key, e.target.value)}
                    onFocus={() => {
                      isEditingRef.current = true
                    }}
                    onBlur={handleSaveMetadata}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                    placeholder="Key"
                    disabled={!hasWriteAccess}
                    tabIndex={10 + index * 2}
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleUpdateMetadataValue(key, e.target.value)}
                    onFocus={() => {
                      isEditingRef.current = true
                    }}
                    onBlur={handleSaveMetadata}
                    className="flex-1 px-2 py-1 text-xs border rounded"
                    placeholder="Value"
                    disabled={!hasWriteAccess}
                    tabIndex={11 + index * 2}
                  />
                  <button
                    onClick={() => {
                      handleRemoveMetadata(key)
                      handleSaveMetadata()
                    }}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    disabled={!hasWriteAccess}
                    tabIndex={12 + index * 2}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {Object.keys(metadata).length === 0 && (
                <p className="text-xs text-muted-foreground">No metadata fields</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleDelete}
            disabled={isDeleting || isSaving || !hasWriteAccess}
            className="w-full px-4 py-2 text-sm text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
            tabIndex={100}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Relationship'}
          </button>
        </div>
      </div>
    </div>
  )
}


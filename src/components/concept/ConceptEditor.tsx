/**
 * ConceptEditor component - Side panel for editing concept properties.
 * Opens when a concept is selected via conceptEditorOpen state.
 * Auto-saves on field blur.
 */

import { useState, useEffect, useRef } from 'react'
import { Trash2, X, Plus } from 'lucide-react'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useConcepts } from '@/hooks/useConcepts'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { useUIStore } from '@/stores/uiStore'

/**
 * ConceptEditor component - Side panel for editing concept properties.
 * Opens when a concept is selected via conceptEditorOpen state.
 * Auto-saves on field blur.
 * 
 * @returns The concept editor JSX
 */
export function ConceptEditor() {
  const selectedConceptId = useUIStore((state) => state.selectedConceptId)
  const conceptEditorOpen = useUIStore((state) => state.conceptEditorOpen)
  const setConceptEditorOpen = useUIStore((state) => state.setConceptEditorOpen)
  const concepts = useConcepts()
  const { updateConcept, deleteConcept } = useConceptActions()
  const { hasWriteAccess } = useMapPermissions()

  const concept = concepts.find((c) => c.id === selectedConceptId)

  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [metadata, setMetadata] = useState<Record<string, string>>({})
  const [fillColor, setFillColor] = useState('#ffffff')
  const [borderColor, setBorderColor] = useState('#d1d5db')
  const [borderStyle, setBorderStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid')
  const [textColor, setTextColor] = useState('#111827')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const previousConceptIdRef = useRef<string | null>(null)
  const isEditingRef = useRef(false) // Track if user is actively editing

  // Update form when concept ID changes (not when concept data changes while editing)
  useEffect(() => {
    if (selectedConceptId && concept) {
      // Only update if the concept ID actually changed AND we're not currently editing
      if (previousConceptIdRef.current !== selectedConceptId && !isEditingRef.current) {
        setLabel(concept.label)
        setNotes(concept.notes || '')
        // Convert metadata to string format for editing (all values as strings)
        const metadataStrings: Record<string, string> = {}
        Object.entries(concept.metadata || {}).forEach(([key, value]) => {
          metadataStrings[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
        })
        setMetadata(metadataStrings)
        // Extract node style from concept metadata
        const conceptMetadata = concept.metadata || {}
        setFillColor((conceptMetadata.fillColor as string) || '#ffffff')
        setBorderColor((conceptMetadata.borderColor as string) || '#d1d5db')
        setBorderStyle((conceptMetadata.borderStyle as 'solid' | 'dashed' | 'dotted') || 'solid')
        setTextColor((conceptMetadata.textColor as string) || '#111827')
        previousConceptIdRef.current = selectedConceptId
      }
    } else if (!selectedConceptId) {
      setLabel('')
      setNotes('')
      setMetadata({})
      setFillColor('#ffffff')
      setBorderColor('#d1d5db')
      setBorderStyle('solid')
      setTextColor('#111827')
      previousConceptIdRef.current = null
      isEditingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConceptId]) // Only depend on ID, not the concept object

  const handleSaveLabel = async () => {
    if (!concept || !label.trim() || label.trim() === concept.label || !hasWriteAccess) return

    setIsSaving(true)
    try {
      await updateConcept(concept.id, {
        label: label.trim(),
      })
    } catch (error) {
      console.error('Failed to update concept label:', error)
      alert('Failed to update concept label. Please try again.')
      setLabel(concept.label) // Revert on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!concept || notes === (concept.notes || '')) return

    setIsSaving(true)
    try {
      await updateConcept(concept.id, {
        notes: notes.trim(),
      })
    } catch (error) {
      console.error('Failed to update concept notes:', error)
      alert('Failed to update concept notes. Please try again.')
      setNotes(concept.notes || '') // Revert on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveMetadata = async () => {
    if (!concept || !hasWriteAccess) return
    
    isEditingRef.current = false // Mark editing as complete

    // Convert metadata strings back to proper types (try to parse JSON, otherwise keep as string)
    const metadataParsed: Record<string, unknown> = {}
    Object.entries(metadata).forEach(([key, value]) => {
      if (value.trim() === '') return // Skip empty values
      try {
        // Try to parse as JSON
        metadataParsed[key] = JSON.parse(value)
      } catch {
        // If not valid JSON, keep as string
        metadataParsed[key] = value
      }
    })

    // Only update if metadata actually changed
    const currentMetadataStr = JSON.stringify(concept.metadata || {})
    const newMetadataStr = JSON.stringify(metadataParsed)
    if (currentMetadataStr === newMetadataStr) return

    setIsSaving(true)
    try {
      await updateConcept(concept.id, {
        metadata: metadataParsed,
      })
    } catch (error) {
      console.error('Failed to update concept metadata:', error)
      alert('Failed to update concept metadata. Please try again.')
      // Revert on error
      const metadataStrings: Record<string, string> = {}
      Object.entries(concept.metadata || {}).forEach(([key, value]) => {
        metadataStrings[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
      })
      setMetadata(metadataStrings)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMetadataField = () => {
    setMetadata({ ...metadata, '': '' })
  }

  const handleUpdateMetadataKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return
    const newMetadata = { ...metadata }
    delete newMetadata[oldKey]
    if (newKey.trim()) {
      newMetadata[newKey] = metadata[oldKey]
    }
    setMetadata(newMetadata)
    // Don't save here - wait for blur
  }

  const handleUpdateMetadataValue = (key: string, value: string) => {
    setMetadata({ ...metadata, [key]: value })
    // Don't save here - wait for blur
  }

  const handleSaveNodeStyle = async (overrideValues?: {
    fillColor?: string
    borderColor?: string
    borderStyle?: 'solid' | 'dashed' | 'dotted'
    textColor?: string
  }) => {
    if (!concept || !hasWriteAccess) return
    
    isEditingRef.current = false
    
    const currentFillColor = overrideValues?.fillColor ?? fillColor
    const currentBorderColor = overrideValues?.borderColor ?? borderColor
    const currentBorderStyle = overrideValues?.borderStyle ?? borderStyle
    const currentTextColor = overrideValues?.textColor ?? textColor
    
    const metadata = concept.metadata || {}
    const updatedMetadata = {
      ...metadata,
      fillColor: currentFillColor,
      borderColor: currentBorderColor,
      borderStyle: currentBorderStyle,
      textColor: currentTextColor,
    }
    
    // Only update if metadata actually changed
    const currentMetadataStr = JSON.stringify(metadata)
    const newMetadataStr = JSON.stringify(updatedMetadata)
    if (currentMetadataStr === newMetadataStr) return

    setIsSaving(true)
    try {
      await updateConcept(concept.id, {
        metadata: updatedMetadata,
      })
    } catch (error) {
      console.error('Failed to update node style:', error)
      alert('Failed to update node style. Please try again.')
      // Revert on error
      const metadata = concept.metadata || {}
      setFillColor((metadata.fillColor as string) || '#ffffff')
      setBorderColor((metadata.borderColor as string) || '#d1d5db')
      setBorderStyle((metadata.borderStyle as 'solid' | 'dashed' | 'dotted') || 'solid')
      setTextColor((metadata.textColor as string) || '#111827')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMetadataField = async (key: string) => {
    if (!concept || !hasWriteAccess) return
    const newMetadata = { ...metadata }
    delete newMetadata[key]
    setMetadata(newMetadata)
    // Save immediately for delete since it's a button click, not typing
    // Use a temporary metadata state for the save
    const tempMetadata = newMetadata
    // Convert to proper format and save
    const metadataParsed: Record<string, unknown> = {}
    Object.entries(tempMetadata).forEach(([k, v]) => {
      if (v.trim() === '') return
      try {
        metadataParsed[k] = JSON.parse(v)
      } catch {
        metadataParsed[k] = v
      }
    })
    
    if (!concept) return
    
    setIsSaving(true)
    try {
      await updateConcept(concept.id, {
        metadata: metadataParsed,
      })
    } catch (error) {
      console.error('Failed to delete metadata field:', error)
      alert('Failed to delete metadata field. Please try again.')
      // Revert on error
      setMetadata(metadata) // Restore previous state
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!concept || !confirm('Are you sure you want to delete this concept?')) return

    setIsDeleting(true)
    try {
      await deleteConcept(concept.id)
      setConceptEditorOpen(false)
    } catch (error) {
      console.error('Failed to delete concept:', error)
      alert('Failed to delete concept. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!conceptEditorOpen || !concept) {
    return null
  }

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-white border-l shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Concept</h2>
          <button
            onClick={() => setConceptEditorOpen(false)}
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
            <label htmlFor="concept-label" className="block text-sm font-medium mb-1">
              Label
            </label>
            <input
              id="concept-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
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

          <div>
            <label htmlFor="concept-notes" className="block text-sm font-medium mb-1">
              Notes (Markdown)
            </label>
            <textarea
              id="concept-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              rows={8}
              className="w-full px-3 py-2 border rounded-md font-mono text-sm"
              placeholder="Add notes about this concept..."
              disabled={isDeleting || isSaving || !hasWriteAccess}
              tabIndex={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Markdown formatting supported
            </p>
          </div>

          {/* Node Style section */}
          <div>
            <label className="block text-sm font-medium mb-2">Node Style</label>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="fill-color" className="block text-xs font-medium mb-1">
                  Fill Color
                </label>
                <div className="flex gap-2">
                  <input
                    id="fill-color"
                    type="color"
                    value={fillColor}
                    onChange={(e) => {
                      const newColor = e.target.value
                      isEditingRef.current = true
                      setFillColor(newColor)
                      // Save immediately for color picker
                      handleSaveNodeStyle({ fillColor: newColor })
                    }}
                    className="w-12 h-10 border rounded cursor-pointer"
                    disabled={isDeleting || isSaving || !hasWriteAccess}
                    tabIndex={4}
                  />
                  <input
                    type="text"
                    value={fillColor}
                    onChange={(e) => {
                      isEditingRef.current = true
                      setFillColor(e.target.value)
                    }}
                    onBlur={() => handleSaveNodeStyle()}
                    className="flex-1 px-3 py-2 text-sm border rounded-md font-mono"
                    placeholder="#ffffff"
                    disabled={isDeleting || isSaving || !hasWriteAccess}
                    tabIndex={5}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="border-color" className="block text-xs font-medium mb-1">
                  Border Color
                </label>
                <div className="flex gap-2">
                  <input
                    id="border-color"
                    type="color"
                    value={borderColor}
                    onChange={(e) => {
                      const newColor = e.target.value
                      isEditingRef.current = true
                      setBorderColor(newColor)
                      // Save immediately for color picker
                      handleSaveNodeStyle({ borderColor: newColor })
                    }}
                    className="w-12 h-10 border rounded cursor-pointer"
                    disabled={isDeleting || isSaving || !hasWriteAccess}
                    tabIndex={6}
                  />
                  <input
                    type="text"
                    value={borderColor}
                    onChange={(e) => {
                      isEditingRef.current = true
                      setBorderColor(e.target.value)
                    }}
                    onBlur={() => handleSaveNodeStyle()}
                    className="flex-1 px-3 py-2 text-sm border rounded-md font-mono"
                    placeholder="#d1d5db"
                    disabled={isDeleting || isSaving || !hasWriteAccess}
                    tabIndex={7}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="border-style" className="block text-xs font-medium mb-1">
                  Border Style
                </label>
                <select
                  id="border-style"
                  value={borderStyle}
                  onChange={(e) => {
                    const newStyle = e.target.value as 'solid' | 'dashed' | 'dotted'
                    isEditingRef.current = true
                    setBorderStyle(newStyle)
                    // Save immediately for dropdowns
                    handleSaveNodeStyle({ borderStyle: newStyle })
                  }}
                  className="w-full px-3 py-2 text-sm border rounded-md"
                  disabled={isDeleting || isSaving || !hasWriteAccess}
                  tabIndex={8}
                >
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>

              <div>
                <label htmlFor="text-color" className="block text-xs font-medium mb-1">
                  Text Color
                </label>
                <div className="flex gap-2">
                  <input
                    id="text-color"
                    type="color"
                    value={textColor}
                    onChange={(e) => {
                      const newColor = e.target.value
                      isEditingRef.current = true
                      setTextColor(newColor)
                      // Save immediately for color picker
                      handleSaveNodeStyle({ textColor: newColor })
                    }}
                    className="w-12 h-10 border rounded cursor-pointer"
                    disabled={isDeleting || isSaving || !hasWriteAccess}
                    tabIndex={9}
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => {
                      isEditingRef.current = true
                      setTextColor(e.target.value)
                    }}
                    onBlur={() => handleSaveNodeStyle()}
                    className="flex-1 px-3 py-2 text-sm border rounded-md font-mono"
                    placeholder="#111827"
                    disabled={isDeleting || isSaving || !hasWriteAccess}
                    tabIndex={10}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Metadata section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Metadata</label>
              <button
                type="button"
                onClick={handleAddMetadataField}
                disabled={isDeleting || isSaving}
                className="text-xs text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1"
                tabIndex={11}
              >
                <Plus className="h-3 w-3" />
                Add Field
              </button>
            </div>
            {Object.keys(metadata).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No metadata fields. Click "Add Field" to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {Object.entries(metadata).map(([key, value], index) => (
                  <div key={`metadata-${index}`} className="flex gap-2">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => {
                        isEditingRef.current = true
                        handleUpdateMetadataKey(key, e.target.value)
                      }}
                      onFocus={() => {
                        isEditingRef.current = true
                      }}
                      onBlur={() => {
                        handleSaveMetadata()
                      }}
                      placeholder="Key"
                      className="flex-1 px-2 py-1 text-xs border rounded-md"
                      disabled={isDeleting || isSaving || !hasWriteAccess}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        isEditingRef.current = true
                        handleUpdateMetadataValue(key, e.target.value)
                      }}
                      onFocus={() => {
                        isEditingRef.current = true
                      }}
                      onBlur={() => {
                        handleSaveMetadata()
                      }}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 text-xs border rounded-md"
                      disabled={isDeleting || isSaving || !hasWriteAccess}
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteMetadataField(key)}
                      disabled={isDeleting || isSaving || !hasWriteAccess}
                      className="px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded disabled:opacity-50"
                      tabIndex={12}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Values are auto-saved. Use JSON format for complex values (e.g., {"{"}"name": "value"{"}"}).
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving || !hasWriteAccess}
              className="w-full px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2"
              tabIndex={13}
            >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete Concept'}
          </button>
        </div>
      </div>
    </div>
  )
}

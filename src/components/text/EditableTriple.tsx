import { useState, useCallback, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'
import { useUIStore } from '@/stores/uiStore'
import { parseTripleText, formatTriple, type TextTriple } from '@/lib/textRepresentation'

/**
 * EditableTriple component - Individual triple editor in text view
 * Uses a single text field with Noun <verb phrase> Noun format
 */
interface EditableTripleProps {
  triple: TextTriple
  onUpdate: () => void
}

export function EditableTriple({ triple, onUpdate }: EditableTripleProps) {
  const { updateConcept } = useConceptActions()
  const { updateRelationship, deleteRelationship } = useRelationshipActions()
  const { setSelectedConceptId, setSelectedRelationshipId, setConceptEditorOpen, setRelationshipEditorOpen } = useUIStore()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(formatTriple(triple))
  const inputRef = useRef<HTMLInputElement>(null)

  // Update local state when triple changes
  useEffect(() => {
    setEditText(formatTriple(triple))
  }, [triple])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = useCallback(async () => {
    const parsed = parseTripleText(editText.trim())
    
    if (!parsed) {
      alert('Invalid format. Expected: "Noun verb phrase Noun" (e.g., "Diagrams explain Architecture")')
      setEditText(formatTriple(triple)) // Revert to original
      setIsEditing(false)
      return
    }

    try {
      // Update from concept label if changed
      if (parsed.from !== triple.fromConceptLabel) {
        await updateConcept(triple.fromConceptId, {
          label: parsed.from,
        })
      }

      // Update to concept label if changed
      if (parsed.to !== triple.toConceptLabel) {
        await updateConcept(triple.toConceptId, {
          label: parsed.to,
        })
      }

      // Update relationship label if changed
      if (parsed.verb !== triple.relationshipLabel) {
        await updateRelationship(triple.relationshipId, {
          primaryLabel: parsed.verb,
        })
      }

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to update triple:', error)
      alert('Failed to update triple. Please try again.')
      setEditText(formatTriple(triple)) // Revert on error
      setIsEditing(false)
    }
  }, [editText, triple, updateConcept, updateRelationship, onUpdate])

  const handleCancel = useCallback(() => {
    setEditText(formatTriple(triple))
    setIsEditing(false)
  }, [triple])

  const handleDelete = useCallback(async () => {
    if (!confirm('Are you sure you want to delete this relationship?')) return

    try {
      await deleteRelationship(triple.relationshipId)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete relationship:', error)
      alert('Failed to delete relationship. Please try again.')
    }
  }, [triple.relationshipId, deleteRelationship, onUpdate])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Open editor panel with relationship selected
    setSelectedRelationshipId(triple.relationshipId)
    setRelationshipEditorOpen(true)
  }, [triple.relationshipId, setSelectedRelationshipId, setRelationshipEditorOpen])

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md group">
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSave()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              handleCancel()
            }
          }}
          className="flex-1 px-2 py-1 text-sm border border-primary rounded bg-background"
          onClick={(e) => e.stopPropagation()}
          placeholder="Noun verb phrase Noun"
        />
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleDelete()
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive transition-opacity"
          aria-label="Delete triple"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 hover:bg-muted rounded-md group">
      <button
        onClick={handleClick}
        onDoubleClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsEditing(true)
        }}
        className="text-left flex-1 hover:text-primary cursor-pointer hover:underline"
      >
        {formatTriple(triple)}
      </button>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleDelete()
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive transition-opacity"
        aria-label="Delete triple"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
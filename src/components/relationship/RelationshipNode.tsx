import { memo, useState, useRef, useEffect, useCallback } from 'react'
import type { NodeProps } from 'reactflow'
import type { RelationshipNodeData } from '@/lib/reactFlowTypes'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { useCanvasMutations } from '@/hooks/useCanvasMutations'
import { usePerspectiveActions } from '@/hooks/usePerspectiveActions'
import { usePresence } from '@/hooks/usePresence'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { usePerspectives } from '@/hooks/usePerspectives'
import { getNonStyleMetadata } from '@/lib/nodeStyleUtils'
import { useConceptNodeEditing } from '@/hooks/useConceptNodeEditing'
import { useConceptNodePreview } from '@/hooks/useConceptNodePreview'
import { useConceptNodeKeyboard } from '@/hooks/useConceptNodeKeyboard'
import { useConceptNodeHandles } from '@/hooks/useConceptNodeHandles'
import { useConceptNodeCollaboration } from '@/hooks/useConceptNodeCollaboration'
import { ConceptNodeLabel } from '@/components/concept/ConceptNodeLabel'
import { ConceptNodeNotes } from '@/components/concept/ConceptNodeNotes'
import { ConceptNodeMetadata } from '@/components/concept/ConceptNodeMetadata'
import { ConceptNodeHandles } from '@/components/concept/ConceptNodeHandles'
import { ConceptNodeCollaboration } from '@/components/concept/ConceptNodeCollaboration'
import { ConceptNodePreviewIndicator } from '@/components/concept/ConceptNodePreviewIndicator'
import { useCanvasStore } from '@/stores/canvasStore'

/**
 * Custom React Flow node component for Relationship nodes.
 * 
 * Renders a relationship as a draggable node on the canvas with inline editing capabilities.
 * Supports double-click to edit, handles for connections, and visual feedback for
 * collaborative editing.
 * 
 * **Features:**
 * - Inline label editing (double-click to edit)
 * - Drag-and-drop positioning
 * - Connection handles (top/bottom for multiple edges)
 * - Markdown notes preview (expandable)
 * - Metadata display (expandable)
 * - Style customization (fill color, border color, border style, text color)
 * - Perspective editing (Shift+Click to toggle inclusion)
 * - Collaborative editing indicators (avatars for users editing this node)
 * - Permission-based editing (read-only for users without write access)
 * - Groups multiple relationships with same label from same concept
 * 
 * @param props - Node props from React Flow
 * @param props.data - Node data containing relationship entity and perspective state
 * @param props.selected - Whether the node is currently selected
 * @param props.id - Node ID (relationship group ID)
 * @returns The relationship node JSX
 */
export const RelationshipNode = memo(({ data, id: nodeId }: NodeProps<RelationshipNodeData>) => {
  const setSelectedConceptId = useUIStore((state) => state.setSelectedConceptId)
  const setSelectedRelationshipId = useUIStore((state) => state.setSelectedRelationshipId)
  const setSelectedCommentId = useUIStore((state) => state.setSelectedCommentId)
  const { updateRelationship } = useCanvasMutations()
  const { toggleRelationshipInPerspective } = usePerspectiveActions()
  const { otherUsersPresence } = usePresence()
  const { hasWriteAccess } = useMapPermissions()
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const isEditingPerspective = data.isEditingPerspective ?? false
  const isInPerspective = data.isInPerspective ?? true
  const perspectives = usePerspectives()
  const isOptionKeyPressed = useCanvasStore((state) => state.isOptionKeyPressed)
  const nodeRef = useRef<HTMLDivElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false)
  const editingUsers = useConceptNodeCollaboration(otherUsersPresence, data.relationshipIds[0])
  const {
    isEditing,
    setIsEditing,
    editLabel,
    setEditLabel,
    isEditingNotes,
    setIsEditingNotes,
    editNotes,
    setEditNotes,
    inputRef,
    measureRef,
    notesTextareaRef,
    notesDisplayRef,
    notesMeasureRef,
    notesDisplayHeight,
    notesDisplayWidth,
  } = useConceptNodeEditing(
    data.label,
    data.relationship.notes || '',
    data.shouldStartEditing ?? false,
    hasWriteAccess
  )
  
  // Track if save is in progress to prevent duplicate saves
  const isSavingRef = useRef(false)
  
  // Define save handlers before preview hook (which needs them)
  const handleSave = useCallback(async () => {
    // Prevent duplicate saves
    if (isSavingRef.current) {
      return Promise.resolve()
    }
    
    // Ensure we're actually in editing mode
    if (!isEditing) {
      return Promise.resolve()
    }
    
    if (!hasWriteAccess) {
      setIsEditing(false)
      return Promise.resolve()
    }
    
    isSavingRef.current = true
    
    try {
      const trimmedLabel = editLabel.trim()
      if (!trimmedLabel) {
        setEditLabel(data.label) // Revert if empty
        setIsEditing(false)
        return Promise.resolve()
      }

      // Update all relationships in the group with the new label
      if (trimmedLabel !== data.label) {
        try {
          // Update all relationships in the group
          await Promise.all(
            data.relationshipIds.map((relationshipId: string) =>
              updateRelationship(relationshipId, {
                primaryLabel: trimmedLabel,
              })
            )
          )
        } catch (error) {
          console.error('Failed to update relationship label:', error)
          setEditLabel(data.label) // Revert on error
        }
      } else {
        setEditLabel(data.label) // Revert if unchanged
      }
      
      setIsEditing(false)
    } finally {
      // Reset save flag after a short delay to allow save to complete
      setTimeout(() => {
        isSavingRef.current = false
      }, 100)
    }
    
    return Promise.resolve() // Return promise for await in handleKeyDown
  }, [hasWriteAccess, editLabel, data.label, data.relationshipIds, updateRelationship, setIsEditing, setEditLabel, isEditing])

  const handleSaveNotes = useCallback(async () => {
    if (!hasWriteAccess) {
      setIsEditingNotes(false)
      return
    }

    const trimmedNotes = editNotes.trim()
    const currentNotes = data.relationship.notes || ''
    
    // Only update if notes actually changed
    if (trimmedNotes !== currentNotes) {
      try {
        // Update all relationships in the group with the new notes
        await Promise.all(
          data.relationshipIds.map((relationshipId: string) =>
            updateRelationship(relationshipId, {
              notes: trimmedNotes,
            })
          )
        )
      } catch (error) {
        console.error('Failed to update relationship notes:', error)
        // Revert on error
        setEditNotes(currentNotes)
      }
    }
    
    setIsEditingNotes(false)
  }, [hasWriteAccess, editNotes, data.relationship.notes, data.relationshipIds, updateRelationship, setIsEditingNotes, setEditNotes])
  
  const {
    isPreviewingNotes,
    previewTransform,
    isClearingPreview,
    handlePreviewEnter,
    handleShowNotesAndMetadata,
  } = useConceptNodePreview({
    nodeRef,
    label: data.label,
    notes: data.relationship.notes || '',
    metadata: data.relationship.metadata || {},
    showNotesAndMetadata: true, // Always show for relationships
    hasWriteAccess,
    onUpdateConcept: async (_id, updates) => {
      // For relationships, showNotesAndMetadata is always true, so this is a no-op
      // But we keep the hook for preview transform functionality
      if (updates.showNotesAndMetadata !== undefined) {
        // Relationships don't have showNotesAndMetadata field, so ignore
        return Promise.resolve()
      }
      return Promise.resolve()
    },
    conceptId: data.relationshipIds[0],
    onSaveLabel: handleSave,
    onSaveNotes: handleSaveNotes,
    isEditing,
    isEditingNotes,
  })

  const { isOptionHovered, handleMouseEnter, handleMouseLeave, handleMouseMove } = useConceptNodeHandles(
    isOptionKeyPressed,
    hasWriteAccess,
    isEditing
  )

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
      }
    }
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    // If editing perspective and Shift+Click, toggle relationship inclusion
    if (isEditingPerspective && e.shiftKey && currentPerspectiveId) {
      e.stopPropagation()
      // Cancel any pending click handler
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      
      const currentPerspective = perspectives.find((p) => p.id === currentPerspectiveId)
      if (currentPerspective) {
        // Toggle all relationships in the group
        Promise.all(
          data.relationshipIds.map((relationshipId: string) =>
            toggleRelationshipInPerspective(
              currentPerspectiveId,
              relationshipId,
              currentPerspective.relationshipIds
            )
          )
        ).catch((error) => {
          console.error('Failed to toggle relationship in perspective:', error)
        })
      }
      return
    }
    
    // Clear any pending timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    // Set selection (toolbar will appear, editor only opens via toolbar)
    if (!isEditing) {
      // Clear other selections
      setSelectedConceptId(null)
      setSelectedCommentId(null)
      // Set first relationship as selected
      setSelectedRelationshipId(data.relationshipIds[0])
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Disable inline editing if user doesn't have write access
    if (!hasWriteAccess) return
    
    // Cancel any pending click handler
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }

    setIsEditing(true)
    setEditLabel(data.label)
  }

  const handleCancel = () => {
    setEditLabel(data.label)
    setIsEditing(false)
  }

  /**
   * Handle canceling notes editing
   */
  const handleCancelNotes = () => {
    setEditNotes(data.relationship.notes || '')
    setIsEditingNotes(false)
  }

  /**
   * Handle keyboard events for notes editing
   */
  const handleNotesKeyDown = async (e: React.KeyboardEvent) => {
    // Save on Ctrl/Cmd+Enter, cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelNotes()
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      await handleSaveNotes()
    }
  }

  const handleKeyDown = useConceptNodeKeyboard({
    isEditing,
    nodeId,
    hasWriteAccess,
    onSave: handleSave,
    onCancel: handleCancel,
  })

  // Apply greyed-out styling when editing perspective and relationship is not included
  const isGreyedOut = isEditingPerspective && !isInPerspective
  const nodeOpacity = isGreyedOut ? 0.3 : 1
  const nodeFilter = isGreyedOut ? 'grayscale(0.5)' : 'none'
  
  // Determine if node should be non-draggable (only when editing label or notes)
  const shouldPreventDrag = isEditing || isEditingNotes

  // Check if notes/metadata are hidden and there's content to show
  const showNotesAndMetadata = true // Always show for relationships
  const hasNotes = data.relationship.notes && data.relationship.notes.trim().length > 0
  const hasMetadata = Object.keys(getNonStyleMetadata(data.relationship.metadata || {})).length > 0
  // Don't show indicator if we're in temporary preview mode (isPreviewingNotes)
  const shouldShowIndicator = !showNotesAndMetadata && !isPreviewingNotes && (hasNotes || hasMetadata)
  
  // Determine if notes/metadata should be visible (either saved state or preview mode)
  const shouldShowNotesAndMetadata = showNotesAndMetadata || isPreviewingNotes

  return (
    <>
      <div
        ref={nodeRef}
        className={`px-2 py-1 cursor-pointer transition-all relative ${shouldPreventDrag ? 'nodrag' : ''}`}
        style={{
          backgroundColor: '#3b82f6', // Blue background to distinguish from edge labels
          border: 'none',
          boxShadow: 'none',
          borderRadius: '4px',
          opacity: nodeOpacity,
          filter: nodeFilter,
          transform: previewTransform
            ? `translate(${previewTransform.x}px, ${previewTransform.y}px)`
            : undefined,
          // Disable transition when preview transform is active or clearing to prevent animation
          transition: previewTransform || isClearingPreview ? 'none' : undefined,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        tabIndex={0}
      >
        {/* Collaboration indicators */}
        <ConceptNodeCollaboration editingUsers={editingUsers} nodeId={data.relationshipIds[0]} />
        
        {/* Preview indicator */}
        {shouldShowIndicator && (
          <ConceptNodePreviewIndicator
            onClick={handleShowNotesAndMetadata}
            onMouseEnter={handlePreviewEnter}
            hasWriteAccess={hasWriteAccess}
            textColor="#ffffff"
          />
        )}

        {/* Label editing */}
        <ConceptNodeLabel
          label={data.label}
          isEditing={isEditing}
          editLabel={editLabel}
          onEditLabelChange={setEditLabel}
          onSave={handleSave}
          onKeyDown={handleKeyDown}
          textColor="#ffffff" // White text for readability on blue background
          inputRef={inputRef}
          measureRef={measureRef}
        />

        {/* Notes and metadata */}
        {shouldShowNotesAndMetadata && (
          <>
            <ConceptNodeNotes
              notes={data.relationship.notes || ''}
              isEditing={isEditingNotes}
              editNotes={editNotes}
              onEditNotesChange={setEditNotes}
              onEdit={() => setIsEditingNotes(true)}
              onSave={handleSaveNotes}
              onKeyDown={handleNotesKeyDown}
              textColor="#ffffff"
              hasWriteAccess={hasWriteAccess}
              notesTextareaRef={notesTextareaRef}
              notesDisplayRef={notesDisplayRef}
              notesMeasureRef={notesMeasureRef}
              notesDisplayHeight={notesDisplayHeight}
              notesDisplayWidth={notesDisplayWidth}
              shouldShow={shouldShowNotesAndMetadata}
            />
            <ConceptNodeMetadata
              metadata={data.relationship.metadata || {}}
              isExpanded={isMetadataExpanded}
              onToggleExpand={() => setIsMetadataExpanded(!isMetadataExpanded)}
              textColor="#ffffff"
              borderColor="#ffffff"
            />
          </>
        )}

        {/* Connection handles */}
        <ConceptNodeHandles
          isOptionHovered={isOptionHovered}
        />
      </div>
      {/* Note: NodeToolbar currently only supports 'concept' and 'comment' types, not 'relationship' */}
      {/* Relationship editing is handled via the relationship editor that opens when selected */}
    </>
  )
})

RelationshipNode.displayName = 'RelationshipNode'


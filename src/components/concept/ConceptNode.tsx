import { memo, useState, useRef, useEffect, useCallback } from 'react'
import type { NodeProps } from 'reactflow'
import type { ConceptNodeData } from '@/lib/reactFlowTypes'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useCanvasMutations } from '@/hooks/useCanvasMutations'
import { usePerspectiveMutations } from '@/hooks/usePerspectiveMutations'
import { usePresence } from '@/hooks/usePresence'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { usePerspectives } from '@/hooks/usePerspectives'
import { useAllRelationships } from '@/hooks/useRelationships'
import { getNonStyleMetadata } from '@/lib/nodeStyleUtils'
import { NodeToolbar } from '@/components/toolbar/NodeToolbar'
import { useConceptNodeStyle } from '@/hooks/useConceptNodeStyle'
import { useConceptNodeEditing } from '@/hooks/useConceptNodeEditing'
import { useConceptNodePreview } from '@/hooks/useConceptNodePreview'
import { useConceptNodeTripleEntry } from '@/hooks/useConceptNodeTripleEntry'
import { useConceptNodeKeyboard } from '@/hooks/useConceptNodeKeyboard'
import { useConceptNodeHandles } from '@/hooks/useConceptNodeHandles'
import { useConceptNodeCollaboration } from '@/hooks/useConceptNodeCollaboration'
import { ConceptNodeLabel } from './ConceptNodeLabel'
import { ConceptNodeNotes } from './ConceptNodeNotes'
import { ConceptNodeMetadata } from './ConceptNodeMetadata'
import { ConceptNodeHandles } from './ConceptNodeHandles'
import { ConceptNodeCollaboration } from './ConceptNodeCollaboration'
import { ConceptNodePreviewIndicator } from './ConceptNodePreviewIndicator'

/**
 * Custom React Flow node component for Concept nodes.
 * 
 * Renders a concept as a draggable node on the canvas with inline editing capabilities.
 * Supports double-click to edit, handles for connections, and visual feedback for
 * collaborative editing.
 * 
 * **Features:**
 * - Inline label editing (double-click to edit)
 * - Triple entry mode: Enter text in format "Noun verb phrase Noun" to automatically create a relationship and second concept
 * - Drag-and-drop positioning
 * - Connection handles (top/bottom for multiple edges)
 * - Markdown notes preview (expandable)
 * - Metadata display (expandable)
 * - Style customization (fill color, border color, border style, text color)
 * - Perspective editing (Shift+Click to toggle inclusion)
 * - Collaborative editing indicators (avatars for users editing this node)
 * - Permission-based editing (read-only for users without write access)
 * 
 * @param props - Node props from React Flow
 * @param props.data - Node data containing concept entity and perspective state
 * @param props.selected - Whether the node is currently selected
 * @param props.id - Node ID (concept ID)
 * @returns The concept node JSX
 */
export const ConceptNode = memo(({ data, selected, id: nodeId }: NodeProps<ConceptNodeData>) => {
  const setSelectedConceptId = useUIStore((state) => state.setSelectedConceptId)
  const setSelectedRelationshipId = useUIStore((state) => state.setSelectedRelationshipId)
  const setSelectedCommentId = useUIStore((state) => state.setSelectedCommentId)
  const selectedConceptId = useUIStore((state) => state.selectedConceptId)
  const conceptEditorOpen = useUIStore((state) => state.conceptEditorOpen)
  const setConceptEditorOpen = useUIStore((state) => state.setConceptEditorOpen)
  const { updateConcept } = useCanvasMutations()
  const { toggleConceptInPerspective } = usePerspectiveMutations()
  const { otherUsersPresence } = usePresence()
  const { hasWriteAccess } = useMapPermissions()
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const isEditingPerspective = data.isEditingPerspective ?? false
  const isInPerspective = data.isInPerspective ?? true
  const perspectives = usePerspectives()
  const allRelationships = useAllRelationships()
  const isOptionKeyPressed = useCanvasStore((state) => state.isOptionKeyPressed)
  const nodeRef = useRef<HTMLDivElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false)

  // Extract hooks
  const nodeStyle = useConceptNodeStyle(data.concept?.metadata || {}, selected)
  const editingUsers = useConceptNodeCollaboration(otherUsersPresence, data.concept.id)
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
    data.concept.notes || '',
    data.shouldStartEditing ?? false,
    hasWriteAccess
  )
  
  const processTripleEntry = useConceptNodeTripleEntry()
  
  // Define save handlers before preview hook (which needs them)
  const handleSave = useCallback(async () => {
    if (!hasWriteAccess) {
      setIsEditing(false)
      return
    }
    
    const trimmedLabel = editLabel.trim()
    if (!trimmedLabel) {
      setEditLabel(data.label) // Revert if empty
      setIsEditing(false)
      return Promise.resolve()
    }

    // Try triple entry first
    const tripleResult = await processTripleEntry({
      label: trimmedLabel,
      conceptId: data.concept.id,
      nodeId,
      currentLabel: data.label,
    })

    if (!tripleResult.success) {
      // Not a triple pattern, just update the concept label
      if (trimmedLabel !== data.label) {
        try {
          await updateConcept(data.concept.id, {
            label: trimmedLabel,
          })
        } catch (error) {
          console.error('Failed to update concept label:', error)
          setEditLabel(data.label) // Revert on error
        }
      } else {
        setEditLabel(data.label) // Revert if unchanged
      }
    }
    
    setIsEditing(false)
    return Promise.resolve() // Return promise for await in handleKeyDown
  }, [hasWriteAccess, editLabel, data.label, data.concept.id, nodeId, processTripleEntry, updateConcept, setIsEditing, setEditLabel])

  const handleSaveNotes = useCallback(async () => {
    if (!hasWriteAccess) {
      setIsEditingNotes(false)
      return
    }

    const trimmedNotes = editNotes.trim()
    const currentNotes = data.concept.notes || ''
    
    // Only update if notes actually changed
    if (trimmedNotes !== currentNotes) {
      try {
        await updateConcept(data.concept.id, {
          notes: trimmedNotes,
        })
      } catch (error) {
        console.error('Failed to update concept notes:', error)
        // Revert on error
        setEditNotes(currentNotes)
      }
    }
    
    setIsEditingNotes(false)
  }, [hasWriteAccess, editNotes, data.concept.notes, data.concept.id, updateConcept, setIsEditingNotes, setEditNotes])
  
  const {
    isPreviewingNotes,
    previewTransform,
    isClearingPreview,
    handlePreviewEnter,
    handlePreviewLeave,
    handleShowNotesAndMetadata,
  } = useConceptNodePreview({
    nodeRef,
    label: data.label,
    notes: data.concept.notes || '',
    metadata: data.concept.metadata || {},
    showNotesAndMetadata: data.concept.showNotesAndMetadata ?? true,
    hasWriteAccess,
    onUpdateConcept: updateConcept,
    conceptId: data.concept.id,
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
    // If editing perspective and Shift+Click, toggle concept inclusion
    if (isEditingPerspective && e.shiftKey && currentPerspectiveId) {
      e.stopPropagation()
      // Cancel any pending click handler
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      
      const currentPerspective = perspectives.find((p) => p.id === currentPerspectiveId)
      if (currentPerspective) {
        toggleConceptInPerspective(
          currentPerspectiveId,
          data.concept.id,
          currentPerspective.conceptIds,
          currentPerspective.relationshipIds,
          allRelationships.map((r) => ({
            id: r.id,
            fromConceptId: r.fromConceptId,
            toConceptId: r.toConceptId,
          }))
        ).catch((error) => {
          console.error('Failed to toggle concept in perspective:', error)
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
      setSelectedRelationshipId(null)
      setSelectedCommentId(null)
      // Set this concept as selected
      setSelectedConceptId(data.concept.id)
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
    setEditNotes(data.concept.notes || '')
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

  // Apply greyed-out styling when editing perspective and concept is not included
  const isGreyedOut = isEditingPerspective && !isInPerspective
  const nodeOpacity = isGreyedOut ? 0.3 : 1
  const nodeFilter = isGreyedOut ? 'grayscale(0.5)' : 'none'
  
  // Determine if node should be non-draggable (only when editing label or notes)
  const shouldPreventDrag = isEditing || isEditingNotes

  // Check if notes/metadata are hidden and there's content to show
  const showNotesAndMetadata = data.concept.showNotesAndMetadata ?? true
  const hasNotes = data.concept.notes && data.concept.notes.trim().length > 0
  const hasMetadata = Object.keys(getNonStyleMetadata(data.concept.metadata || {})).length > 0
  // Don't show indicator if we're in temporary preview mode (isPreviewingNotes)
  const shouldShowIndicator = !showNotesAndMetadata && !isPreviewingNotes && (hasNotes || hasMetadata)
  
  // Determine if notes/metadata should be visible (either saved state or preview mode)
  const shouldShowNotesAndMetadata = showNotesAndMetadata || isPreviewingNotes

  return (
    <>
      <div
        ref={nodeRef}
        className={`px-4 py-3 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg min-w-[120px] relative ${shouldPreventDrag ? 'nodrag' : ''}`}
        style={{
          backgroundColor: nodeStyle.fillColor,
          borderWidth: `${nodeStyle.borderThickness}px`,
          borderStyle: nodeStyle.borderStyle === 'long-dash' ? 'dashed' : nodeStyle.borderStyle,
          borderColor: nodeStyle.borderColor,
          boxShadow: selected ? (document.documentElement.classList.contains('dark') ? '0 0 0 2px rgba(210, 250, 255, 0.2)' : '0 0 0 2px rgba(99, 102, 241, 0.2)') : undefined,
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => {
          handleMouseLeave()
          handlePreviewLeave() // Also exit preview mode when leaving node
        }}
        onMouseMove={handleMouseMove}
      >
        <ConceptNodeCollaboration editingUsers={editingUsers} nodeId={data.concept.id} />
        
        <ConceptNodeHandles isOptionHovered={isOptionHovered} />
        
        <ConceptNodeLabel
          label={data.label}
          isEditing={isEditing}
          editLabel={editLabel}
          onEditLabelChange={setEditLabel}
          onSave={handleSave}
          onKeyDown={handleKeyDown}
          textColor={nodeStyle.textColor}
          inputRef={inputRef}
          measureRef={measureRef}
        />
        
        <ConceptNodeNotes
          notes={data.concept.notes || ''}
          isEditing={isEditingNotes}
          editNotes={editNotes}
          onEditNotesChange={setEditNotes}
          onEdit={() => setIsEditingNotes(true)}
          onSave={handleSaveNotes}
          onKeyDown={handleNotesKeyDown}
          textColor={nodeStyle.textColor}
          hasWriteAccess={hasWriteAccess}
          notesTextareaRef={notesTextareaRef}
          notesDisplayRef={notesDisplayRef}
          notesMeasureRef={notesMeasureRef}
          notesDisplayHeight={notesDisplayHeight}
          notesDisplayWidth={notesDisplayWidth}
          shouldShow={shouldShowNotesAndMetadata}
        />
        
        {shouldShowNotesAndMetadata && (
          <ConceptNodeMetadata
            metadata={data.concept.metadata || {}}
            isExpanded={isMetadataExpanded}
            onToggleExpand={() => setIsMetadataExpanded(!isMetadataExpanded)}
            textColor={nodeStyle.textColor}
            borderColor={nodeStyle.borderColor}
          />
        )}
        
        {shouldShowIndicator && (
          <ConceptNodePreviewIndicator
            onClick={handleShowNotesAndMetadata}
            onMouseEnter={handlePreviewEnter}
            hasWriteAccess={hasWriteAccess}
            textColor={nodeStyle.textColor}
          />
        )}
      </div>
      {selectedConceptId === data.concept.id && !conceptEditorOpen && (
        <NodeToolbar
          nodeRef={nodeRef as React.RefObject<HTMLDivElement>}
          visible={true}
          type="concept"
          concept={data.concept}
          onEdit={() => {
            setConceptEditorOpen(true)
            // Keep selectedConceptId so UnifiedEditor knows which concept to edit
          }}
        />
      )}
    </>
  )
})

ConceptNode.displayName = 'ConceptNode'


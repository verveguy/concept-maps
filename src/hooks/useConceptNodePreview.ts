/**
 * Hook for managing preview mode for concept node notes/metadata.
 * 
 * Handles both temporary preview (on hover with delay) and permanent expansion
 * (on click). Calculates CSS transforms to keep the node centered during expansion.
 * 
 * **Preview Modes:**
 * - **Temporary Preview**: Hover over indicator → wait 1 second → show preview → hide on mouse leave
 * - **Permanent Expansion**: Click indicator → show permanently → save to database
 * 
 * **Transform Calculation:**
 * When expanding, calculates CSS transform to keep node centered by offsetting
 * by half the size difference in each dimension.
 * 
 * @param nodeRef - Ref to the node DOM element
 * @param label - Node label text
 * @param notes - Node notes text
 * @param metadata - Node metadata object
 * @param showNotesAndMetadata - Whether notes/metadata are currently shown (from database)
 * @param hasWriteAccess - Whether user has write access
 * @param onUpdateConcept - Function to update concept in database
 * @param onSaveLabel - Callback to save label if editing
 * @param onSaveNotes - Callback to save notes if editing
 * @param isEditing - Whether label is being edited
 * @param isEditingNotes - Whether notes are being edited
 * @returns Preview state and handlers
 * 
 * @example
 * ```tsx
 * import { useConceptNodePreview } from '@/hooks/useConceptNodePreview'
 * 
 * function ConceptNode({ concept, nodeRef }) {
 *   const { updateConcept } = useCanvasMutations()
 *   const {
 *     isPreviewingNotes,
 *     previewTransform,
 *     isClearingPreview,
 *     handlePreviewEnter,
 *     handlePreviewLeave,
 *     handleShowNotesAndMetadata,
 *   } = useConceptNodePreview(
 *     nodeRef,
 *     concept.label,
 *     concept.notes || '',
 *     concept.metadata,
 *     concept.showNotesAndMetadata ?? true,
 *     hasWriteAccess,
 *     updateConcept,
 *     handleSaveLabel,
 *     handleSaveNotes,
 *     isEditing,
 *     isEditingNotes
 *   )
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { measureExpandedContent, calculatePreviewTransform } from '@/lib/nodePreviewUtils'
import { getNonStyleMetadata } from '@/lib/nodeStyleUtils'

/**
 * Return type for useConceptNodePreview hook
 */
export interface UseConceptNodePreviewReturn {
  /** Whether preview mode is active */
  isPreviewingNotes: boolean
  /** CSS transform to apply to node (for centering) */
  previewTransform: { x: number; y: number } | null
  /** Whether preview is being cleared (to disable transitions) */
  isClearingPreview: boolean
  /** Handler for mouse enter on preview indicator */
  handlePreviewEnter: (e: React.MouseEvent) => void
  /** Handler for mouse leave from node */
  handlePreviewLeave: () => Promise<void>
  /** Handler for clicking preview indicator (permanent expansion) */
  handleShowNotesAndMetadata: (e: React.MouseEvent) => Promise<void>
}

/**
 * Parameters for preview hook
 */
export interface UseConceptNodePreviewParams {
  /** Ref to the node DOM element */
  nodeRef: React.RefObject<HTMLDivElement | null>
  /** Node label text */
  label: string
  /** Node notes text */
  notes: string
  /** Node metadata object */
  metadata: Record<string, unknown>
  /** Whether notes/metadata are currently shown (from database) */
  showNotesAndMetadata: boolean
  /** Whether user has write access */
  hasWriteAccess: boolean
  /** Function to update concept in database */
  onUpdateConcept: (conceptId: string, updates: { showNotesAndMetadata?: boolean }) => Promise<void>
  /** Concept ID */
  conceptId: string
  /** Callback to save label if editing */
  onSaveLabel?: () => Promise<void> | void
  /** Callback to save notes if editing */
  onSaveNotes?: () => Promise<void> | void
  /** Whether label is being edited */
  isEditing?: boolean
  /** Whether notes are being edited */
  isEditingNotes?: boolean
}

/**
 * Hook to manage preview mode for notes/metadata.
 * 
 * @param params - Preview hook parameters
 * @returns Preview state and handlers
 */
export function useConceptNodePreview(params: UseConceptNodePreviewParams): UseConceptNodePreviewReturn {
  const {
    nodeRef,
    label,
    notes,
    metadata,
    showNotesAndMetadata,
    hasWriteAccess,
    onUpdateConcept,
    conceptId,
    onSaveLabel,
    onSaveNotes,
    isEditing = false,
    isEditingNotes = false,
  } = params

  const [isPreviewingNotes, setIsPreviewingNotes] = useState(false)
  const [previewTransform, setPreviewTransform] = useState<{ x: number; y: number } | null>(null)
  const [isClearingPreview, setIsClearingPreview] = useState(false)
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPermanentExpansionRef = useRef(false)
  const collapsedHeightRef = useRef<number | null>(null)
  const collapsedWidthRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  // Handler to toggle notes/metadata visibility (persistent)
  const handleShowNotesAndMetadata = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent node click events
    if (!hasWriteAccess) return
    
    // Measure collapsed dimensions before expansion if not already measured
    if (nodeRef.current) {
      if (!collapsedHeightRef.current) {
        collapsedHeightRef.current = nodeRef.current.offsetHeight
      }
      if (!collapsedWidthRef.current) {
        collapsedWidthRef.current = nodeRef.current.offsetWidth
      }
    }
    
    // Measure expanded content BEFORE updating database
    // This allows us to apply transform before React renders expanded content
    let translateX = 0
    let translateY = 0
    
    if (nodeRef.current && collapsedHeightRef.current !== null && collapsedWidthRef.current !== null) {
      const hasMetadata = Object.keys(getNonStyleMetadata(metadata || {})).length > 0
      const metadataFieldCount = Object.keys(getNonStyleMetadata(metadata || {})).length
      
      const dimensions = measureExpandedContent({
        nodeElement: nodeRef.current,
        collapsedHeight: collapsedHeightRef.current,
        collapsedWidth: collapsedWidthRef.current,
        label,
        notes: notes || '',
        hasMetadata,
        metadataFieldCount,
      })
      
      const transform = calculatePreviewTransform(
        collapsedWidthRef.current,
        collapsedHeightRef.current,
        dimensions.expandedWidth,
        dimensions.expandedHeight
      )
      
      if (transform) {
        translateX = transform.x
        translateY = transform.y
      }
    }
    
    // Apply transform BEFORE updating database (so it's in place when React renders)
    if (translateX !== 0 || translateY !== 0) {
      // Disable transition and apply transform directly to DOM
      if (nodeRef.current) {
        nodeRef.current.style.setProperty('transition', 'none', 'important')
        nodeRef.current.style.setProperty('transform', `translate(${translateX}px, ${translateY}px)`, 'important')
      }
      
      // Set transform in React state
      flushSync(() => {
        setPreviewTransform({ x: translateX, y: translateY })
      })
    }
    
    try {
      // Mark as permanent expansion before updating database
      isPermanentExpansionRef.current = true
      
      // Now update database - transform is already applied
      await onUpdateConcept(conceptId, { showNotesAndMetadata: true })
      
      // Re-enable transition after database update completes
      requestAnimationFrame(() => {
        if (isMountedRef.current && nodeRef.current) {
          nodeRef.current.style.removeProperty('transition')
        }
      })
    } catch (error) {
      console.error('Failed to show notes and metadata:', error)
      // On error, clear transform and reset flag
      isPermanentExpansionRef.current = false
      if (nodeRef.current) {
        nodeRef.current.style.removeProperty('transform')
        nodeRef.current.style.removeProperty('transition')
      }
      setPreviewTransform(null)
    }
  }

  // Measure expanded content and apply transform simultaneously with showing content
  const measureAndApplyTransform = () => {
    if (!nodeRef.current || collapsedHeightRef.current === null || collapsedWidthRef.current === null) {
      setIsPreviewingNotes(true)
      return
    }

    const hasMetadata = Object.keys(getNonStyleMetadata(metadata || {})).length > 0
    const metadataFieldCount = Object.keys(getNonStyleMetadata(metadata || {})).length
    
    const dimensions = measureExpandedContent({
      nodeElement: nodeRef.current,
      collapsedHeight: collapsedHeightRef.current,
      collapsedWidth: collapsedWidthRef.current,
      label,
      notes: notes || '',
      hasMetadata,
      metadataFieldCount,
    })
    
    const transform = calculatePreviewTransform(
      collapsedWidthRef.current,
      collapsedHeightRef.current,
      dimensions.expandedWidth,
      dimensions.expandedHeight
    )

    if (transform) {
      // Apply transform and expand content in the same frame
      // Use requestAnimationFrame to ensure both happen before browser paints
      requestAnimationFrame(() => {
        // Apply transform directly to DOM first (synchronously within this frame)
        if (nodeRef.current) {
          nodeRef.current.style.setProperty('transform', `translate(${transform.x}px, ${transform.y}px)`, 'important')
        }
        
        // Then update React state - both updates happen in same frame before paint
        flushSync(() => {
          setPreviewTransform(transform)
          setIsPreviewingNotes(true)
        })
      })
    } else {
      setIsPreviewingNotes(true)
    }
  }

  // Handler for preview mode (ephemeral) with delay
  const handlePreviewEnter = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Clear any existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }
    // Measure collapsed dimensions before expansion
    if (nodeRef.current) {
      if (collapsedHeightRef.current === null) {
        collapsedHeightRef.current = nodeRef.current.offsetHeight
      }
      if (collapsedWidthRef.current === null) {
        collapsedWidthRef.current = nodeRef.current.offsetWidth
      }
    }
    // Set preview after delay (1000ms) - measure and apply transform simultaneously
    previewTimeoutRef.current = setTimeout(() => {
      // Measure expanded content first (before showing it)
      measureAndApplyTransform()
    }, 1000)
  }

  const handlePreviewLeave = async () => {
    // Only handle preview leave if we're actually in temporary preview mode
    // If this is a permanent expansion (from clicking indicator), don't clear transform
    // Use ref to avoid stale closure issues
    if (!isPreviewingNotes || isPermanentExpansionRef.current) {
      return
    }
    
    // Clear timeout if user leaves before delay completes
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }
    
    // If in editing mode, save changes before closing preview (treat as blur)
    if (isEditingNotes && onSaveNotes) {
      await onSaveNotes()
    }
    if (isEditing && onSaveLabel) {
      await onSaveLabel()
    }
    
    // Set clearing flag to disable transition in style prop
    setIsClearingPreview(true)
    // Clear transform and preview state synchronously
    flushSync(() => {
      setPreviewTransform(null)
      setIsPreviewingNotes(false)
    })
    // Clear the clearing flag after transform is removed (next frame)
    requestAnimationFrame(() => {
      setIsClearingPreview(false)
    })
  }

  // Reset collapsed dimensions when preview ends (consolidated reset logic)
  useEffect(() => {
    if (!isPreviewingNotes && !isPermanentExpansionRef.current) {
      setPreviewTransform(null)
      // Reset collapsed dimensions when preview ends
      collapsedHeightRef.current = null
      collapsedWidthRef.current = null
    }
  }, [isPreviewingNotes])
  
  // Reset permanent expansion flag and dimensions when showNotesAndMetadata becomes false
  useEffect(() => {
    if (!showNotesAndMetadata) {
      isPermanentExpansionRef.current = false
      setPreviewTransform(null)
      // Reset collapsed dimensions when permanently hidden
      collapsedHeightRef.current = null
      collapsedWidthRef.current = null
    }
  }, [showNotesAndMetadata])

  // Cleanup timeout and set mounted flag on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
      setPreviewTransform(null)
    }
  }, [])

  return {
    isPreviewingNotes,
    previewTransform,
    isClearingPreview,
    handlePreviewEnter,
    handlePreviewLeave,
    handleShowNotesAndMetadata,
  }
}


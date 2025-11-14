import { memo, useState, useRef, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { ConceptNodeData } from '@/lib/reactFlowTypes'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useCanvasMutations } from '@/hooks/useCanvasMutations'
import { usePerspectiveActions } from '@/hooks/usePerspectiveActions'
import { usePresence } from '@/hooks/usePresence'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { usePerspectives } from '@/hooks/usePerspectives'
import { useAllRelationships } from '@/hooks/useRelationships'
import { useConcepts } from '@/hooks/useConcepts'
import { db, tx, id } from '@/lib/instant'
import { parseTripleText, stripLineBreaks } from '@/lib/textRepresentation'
import { EditingHighlight } from '@/components/presence/EditingHighlight'
import { PresenceAvatar } from '@/components/presence/PresenceAvatar'
import { NodeToolbar } from '@/components/toolbar/NodeToolbar'

/**
 * Style attribute keys that should be treated as built-in attributes, not metadata
 */
const NODE_STYLE_ATTRIBUTES = ['fillColor', 'borderColor', 'borderStyle', 'textColor']

/**
 * Filter out style attributes from metadata
 */
function getNonStyleMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const filtered: Record<string, unknown> = {}
  Object.entries(metadata).forEach(([key, value]) => {
    if (!NODE_STYLE_ATTRIBUTES.includes(key)) {
      filtered[key] = value
    }
  })
  return filtered
}

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
 * **Node Styling:**
 * Style properties are stored in metadata but treated as special attributes:
 * - `fillColor`: Background color (default: white/dark based on theme)
 * - `borderColor`: Border color (default: gray)
 * - `borderStyle`: Border style ('solid', 'dashed', 'dotted')
 * - `textColor`: Text color (default: black/white based on theme)
 * 
 * **Perspective Editing:**
 * When in perspective editing mode (Shift+Click):
 * - Nodes included in perspective are shown normally
 * - Nodes not in perspective are greyed out
 * - Clicking toggles inclusion in the current perspective
 * 
 * **Collaborative Editing:**
 * Shows avatars of other users currently editing this node, providing visual
 * feedback for collaborative editing.
 * 
 * @param props - Node props from React Flow
 * @param props.data - Node data containing concept entity and perspective state
 * @param props.selected - Whether the node is currently selected
 * @param props.id - Node ID (concept ID)
 * @returns The concept node JSX
 * 
 * @example
 * ```tsx
 * import { ConceptNode } from '@/components/concept/ConceptNode'
 * 
 * // Register as a custom node type
 * const nodeTypes = {
 *   concept: ConceptNode
 * }
 * 
 * // Use in React Flow
 * <ReactFlow nodeTypes={nodeTypes} nodes={nodes} />
 * ```
 */
export const ConceptNode = memo(({ data, selected, id: nodeId }: NodeProps<ConceptNodeData>) => {
  const { getEdges, setEdges, getNodes, setNodes, getNode, fitView } = useReactFlow()
  const currentMapId = useMapStore((state) => state.currentMapId)
  const setSelectedConceptId = useUIStore((state) => state.setSelectedConceptId)
  const setSelectedRelationshipId = useUIStore((state) => state.setSelectedRelationshipId)
  const setSelectedCommentId = useUIStore((state) => state.setSelectedCommentId)
  const selectedConceptId = useUIStore((state) => state.selectedConceptId)
  const conceptEditorOpen = useUIStore((state) => state.conceptEditorOpen)
  const setConceptEditorOpen = useUIStore((state) => state.setConceptEditorOpen)
  const { updateConcept } = useCanvasMutations()
  const { toggleConceptInPerspective } = usePerspectiveActions()
  const { otherUsersPresence } = usePresence()
  const { hasWriteAccess } = useMapPermissions()
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const isEditingPerspective = data.isEditingPerspective ?? false
  const isInPerspective = data.isInPerspective ?? true
  const perspectives = usePerspectives()
  const allRelationships = useAllRelationships()
  const concepts = useConcepts()
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(data.label)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editNotes, setEditNotes] = useState(data.concept.notes || '')
  const [notesDisplayHeight, setNotesDisplayHeight] = useState<number | null>(null)
  const [notesDisplayWidth, setNotesDisplayWidth] = useState<number | null>(null)
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false)
  const [isPreviewingNotes, setIsPreviewingNotes] = useState(false)
  const [previewTransform, setPreviewTransform] = useState<{ x: number; y: number } | null>(null)
  const [isClearingPreview, setIsClearingPreview] = useState(false)
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPermanentExpansionRef = useRef(false)
  const collapsedHeightRef = useRef<number | null>(null)
  const collapsedWidthRef = useRef<number | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null)
  const notesDisplayRef = useRef<HTMLDivElement>(null)
  const notesMeasureRef = useRef<HTMLSpanElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasTriggeredEditRef = useRef(false)
  const [isOptionHovered, setIsOptionHovered] = useState(false)
  const isMouseOverRef = useRef(false)
  const isOptionKeyPressed = useCanvasStore((state) => state.isOptionKeyPressed)
  
  // Get users editing this node
  const editingUsers = otherUsersPresence
    .filter((p) => p.editingNodeId === data.concept.id && p.userName && p.color && p.userId)
    .filter((presence, index, self) => 
      // Ensure unique userIds
      index === self.findIndex((p) => p.userId === presence.userId)
    )

  // Extract node style from metadata
  const metadataKey = data.concept?.metadata ? JSON.stringify(data.concept.metadata) : ''
  // Track dark mode state for theme-aware defaults
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  )
  
  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])
  
  const nodeStyle = useMemo(() => {
    const metadata = data.concept?.metadata || {}
    // Theme-aware default colors
    const defaultFillColor = isDarkMode ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)'
    const defaultBorderColor = isDarkMode ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)'
    const defaultTextColor = isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)'
    const defaultPrimaryColor = isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)'
    // Selected state colors - subtle but noticeable
    // Dark mode: subtle blue-gray tint that works well with dark backgrounds
    // Light mode: pale yellow for visibility
    const selectedFillColor = isDarkMode ? 'hsl(217 32% 25%)' : 'hsl(54 96% 88%)'
    
    return {
      fillColor: selected ? selectedFillColor : ((metadata.fillColor as string) || defaultFillColor),
      borderColor: selected ? defaultPrimaryColor : ((metadata.borderColor as string) || defaultBorderColor),
      borderStyle: (metadata.borderStyle as 'solid' | 'dashed' | 'dotted' | 'long-dash') || 'solid',
      borderThickness: (metadata.borderThickness as number) || 2,
      textColor: (metadata.textColor as string) || defaultTextColor,
    }
  }, [metadataKey, selected, isDarkMode])

  // Update edit label when data changes (but not while editing)
  useEffect(() => {
    if (!isEditing) {
      setEditLabel(data.label)
    }
  }, [data.label, isEditing])

  // Update edit notes when data changes (but not while editing)
  useEffect(() => {
    if (!isEditingNotes) {
      setEditNotes(data.concept.notes || '')
    }
  }, [data.concept.notes, isEditingNotes])

  // Reset the trigger ref when shouldStartEditing becomes false
  useEffect(() => {
    if (!data.shouldStartEditing) {
      hasTriggeredEditRef.current = false
    }
  }, [data.shouldStartEditing])

  // Trigger edit mode if shouldStartEditing flag is set (only once per flag cycle)
  useEffect(() => {
    if (data.shouldStartEditing && !isEditing && hasWriteAccess && !hasTriggeredEditRef.current) {
      hasTriggeredEditRef.current = true
      setIsEditing(true)
      setEditLabel(data.label)
    }
  }, [data.shouldStartEditing, isEditing, hasWriteAccess, data.label])

  // Focus input and set initial width when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current && measureRef.current) {
      // Set the measure span text to current label
      measureRef.current.textContent = editLabel || data.label
      // Use requestAnimationFrame to ensure DOM has updated before measuring
      requestAnimationFrame(() => {
        if (measureRef.current && inputRef.current) {
          inputRef.current.style.width = `${Math.max(measureRef.current.offsetWidth, 20)}px`
          inputRef.current.focus()
          inputRef.current.select()
        }
      })
    }
  }, [isEditing]) // Only run when isEditing changes, not on every editLabel change

  // Measure display height and width when it's rendered (before editing starts)
  useEffect(() => {
    if (!isEditingNotes && notesDisplayRef.current && data.concept.notes) {
      const element = notesDisplayRef.current
      // Use scrollHeight to get full content height
      const height = element.scrollHeight || element.offsetHeight
      // Measure width to constrain textarea
      const width = element.offsetWidth || element.clientWidth
      setNotesDisplayHeight(height)
      setNotesDisplayWidth(width)
    } else if (!data.concept.notes) {
      // Reset measurements when notes are cleared
      setNotesDisplayHeight(null)
      setNotesDisplayWidth(null)
    }
  }, [data.concept.notes, isEditingNotes])

  // Focus textarea and set initial height when notes editing starts
  useEffect(() => {
    if (isEditingNotes && notesTextareaRef.current) {
      requestAnimationFrame(() => {
        if (notesTextareaRef.current) {
          // Let textarea find its natural height based on content
          notesTextareaRef.current.style.height = 'auto'
          const naturalHeight = notesTextareaRef.current.scrollHeight
          const minHeight = notesDisplayHeight || 20 // Use measured height as minimum
          notesTextareaRef.current.style.height = `${Math.max(naturalHeight, minHeight)}px`
          notesTextareaRef.current.focus()
          // Select all text for easy replacement
          notesTextareaRef.current.select()
        }
      })
    }
  }, [isEditingNotes, notesDisplayHeight])

  // Auto-resize textarea as user types
  useEffect(() => {
    if (isEditingNotes && notesTextareaRef.current) {
      const textarea = notesTextareaRef.current
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto'
      // Set height based on scrollHeight (content height), but don't shrink below initial height
      const minHeight = notesDisplayHeight || 20
      const newHeight = Math.max(textarea.scrollHeight, minHeight)
      textarea.style.height = `${newHeight}px`
    }
  }, [editNotes, isEditingNotes, notesDisplayHeight])

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

  /**
   * Handle mouse enter - check if Option/Alt key is pressed and expand handle.
   */
  const handleMouseEnter = () => {
    isMouseOverRef.current = true
    if (isOptionKeyPressed && hasWriteAccess && !isEditing) {
      setIsOptionHovered(true)
    }
  }

  /**
   * Handle mouse leave - collapse handle if Option was held.
   */
  const handleMouseLeave = () => {
    isMouseOverRef.current = false
    setIsOptionHovered(false)
  }

  /**
   * Handle mouse move - check if Option key state changed while hovering.
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    // Only check altKey - metaKey is Command key, not Option key
    const isOptionKey = e.altKey
    if (hasWriteAccess && !isEditing) {
      setIsOptionHovered(isOptionKey)
    }
  }

  // Update hover state when Option key state changes (if mouse is over node)
  useEffect(() => {
    if (isMouseOverRef.current && hasWriteAccess && !isEditing) {
      setIsOptionHovered(isOptionKeyPressed)
    } else if (!isOptionKeyPressed) {
      setIsOptionHovered(false)
    }
  }, [isOptionKeyPressed, hasWriteAccess, isEditing])

  const handleSave = async () => {
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

    // Check if the entered text matches the triple pattern "Noun verb phrase Noun"
    const parsed = parseTripleText(trimmedLabel)
    
    if (parsed) {
      // Triple pattern detected: update current concept, create relationship and new concept
      try {
        // Get current node position for positioning the new concept
        const currentNode = getNode(nodeId)
        if (!currentNode || !currentNode.position || !currentMapId) {
          // Fallback to simple update if we can't get position
          await updateConcept(data.concept.id, {
            label: trimmedLabel,
          })
          setIsEditing(false)
          return Promise.resolve()
        }

        // Estimate node width (same as in ConceptMapCanvas)
        const estimatedNodeWidth = 130
        
        // Calculate position for new concept (1.5 node widths to the right)
        const newPosition = {
          x: currentNode.position.x + estimatedNodeWidth * 1.5,
          y: currentNode.position.y, // Keep same Y position
        }

        // Check if the "to" concept already exists
        const existingToConcept = concepts.find((c) => c.label === parsed.to)
        const toConceptId = existingToConcept ? existingToConcept.id : id()
        const relationshipId = id()
        
        // Build transaction array
        const transactions: Parameters<typeof db.transact>[0] = []
        
        // Update current concept label to the first noun if changed
        if (parsed.from !== data.label) {
          transactions.push(
            tx.concepts[data.concept.id].update({
              label: parsed.from,
              updatedAt: Date.now(),
            })
          )
        }

        // Create the "to" concept if it doesn't exist
        // Set userPlaced: false since this will be positioned by layout algorithm
        if (!existingToConcept) {
          transactions.push(
            tx.concepts[toConceptId]
              .update({
                label: parsed.to,
                positionX: newPosition.x,
                positionY: newPosition.y,
                notes: '',
                metadata: JSON.stringify({}),
                userPlaced: false, // Layout algorithm will position this node
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })
              .link({ map: currentMapId })
          )
        }

        // Create relationship between current concept and the "to" concept
        transactions.push(
          tx.relationships[relationshipId]
            .update({
              primaryLabel: stripLineBreaks(parsed.verb),
              reverseLabel: stripLineBreaks(parsed.verb),
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            .link({
              map: currentMapId,
              fromConcept: data.concept.id,
              toConcept: toConceptId,
            })
        )

        // Execute all operations in a single transaction
        await db.transact(transactions)

        // If we created a new concept, apply incremental layout and set shouldStartEditing flag
        if (!existingToConcept) {
          // Get incremental layout function from store
          const applyIncrementalLayout = useCanvasStore.getState().applyIncrementalLayoutForNewNodes
          
          // Apply incremental layout if function is available and a layout is selected
          if (applyIncrementalLayout) {
            // Small delay to ensure the new node is fully created and edges are updated
            setTimeout(async () => {
              try {
                await applyIncrementalLayout(new Set([toConceptId]))
              } catch (error) {
                console.error('Failed to apply incremental layout for new concept:', error)
              }
            }, 150) // Delay to ensure node and edges are created
          }
          
          // Wait a bit for the node to appear in React Flow
          setTimeout(() => {
            const nodes = getNodes()
            const newNode = nodes.find((node) => node.id === toConceptId)
            if (newNode) {
              const updatedNodes = nodes.map((node) => {
                if (node.id === toConceptId) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      shouldStartEditing: true,
                    },
                  }
                }
                return node
              })
              setNodes(updatedNodes)
            }
          }, 50) // Small delay to ensure React Flow has updated its internal state
        }
      } catch (error) {
        console.error('Failed to process triple:', error)
        // Fallback to simple label update on error
        try {
          await updateConcept(data.concept.id, {
            label: trimmedLabel,
          })
        } catch (updateError) {
          console.error('Failed to update concept label:', updateError)
          setEditLabel(data.label) // Revert on error
        }
      }
    } else {
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
  }

  const handleCancel = () => {
    setEditLabel(data.label)
    setIsEditing(false)
  }

  /**
   * Handle saving notes changes
   */
  const handleSaveNotes = async () => {
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

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    } else if (e.key === 'Tab' && isEditing && !e.shiftKey) {
      e.preventDefault()
      // Save current edit first
      await handleSave()
      
      // Create new node and relationship
      if (!currentMapId || !hasWriteAccess) return
      
      // Get current node position
      const currentNode = getNode(nodeId)
      if (!currentNode || !currentNode.position) return
      
      // Estimate node width (same as in ConceptMapCanvas)
      const estimatedNodeWidth = 130
      
      // Calculate position 1.5 node widths to the right
      const newPosition = {
        x: currentNode.position.x + estimatedNodeWidth * 1.5,
        y: currentNode.position.y, // Keep same Y position
      }
      
      try {
        // Generate IDs for both concept and relationship
        const newConceptId = id()
        const newRelationshipId = id()
        
        // Create both concept and relationship in a single transaction
        await db.transact([
          // Create the new concept
          tx.concepts[newConceptId]
            .update({
              label: 'New Concept',
              positionX: newPosition.x,
              positionY: newPosition.y,
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            .link({ map: currentMapId }),
          // Create the relationship linking current node to new concept
          tx.relationships[newRelationshipId]
            .update({
              primaryLabel: 'related to',
              reverseLabel: 'related from',
              notes: '',
              metadata: JSON.stringify({}),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
            .link({
              map: currentMapId,
              fromConcept: nodeId,
              toConcept: newConceptId,
            }),
        ])
        
        // Wait a bit for the node and edge to appear, then set shouldStartEditing flag and fit view
        setTimeout(() => {
          const edges = getEdges()
          const newEdge = edges.find((edge) => edge.id === newRelationshipId)
          if (newEdge) {
            const updatedEdges = edges.map((edge) => {
              if (edge.id === newRelationshipId) {
                return {
                  ...edge,
                  data: {
                    ...edge.data,
                    shouldStartEditing: true,
                  },
                }
              }
              return edge
            })
            setEdges(updatedEdges)
          }
          
          // Fit view to include the new node
          const newNode = getNode(newConceptId)
          if (newNode) {
            // Use fitView to ensure the new node is visible
            // Small delay to ensure React Flow has updated its internal state
            setTimeout(() => {
              fitView({ 
                padding: 0.2, 
                includeHiddenNodes: false,
                nodes: [newNode],
                duration: 100, // Smooth animation
              })
            }, 50)
          }
        }, 10)
      } catch (error) {
        console.error('Failed to create concept and relationship from Tab:', error)
      }
    } else if (e.key === 'Tab' && isEditing && e.shiftKey) {
      e.preventDefault()
      // Shift+Tab: Find existing relationship and navigate to it
      handleSave()
      
      const edges = getEdges()
      const connectedEdge = edges.find((edge) => edge.target === nodeId)
      
      if (connectedEdge) {
        // Set shouldStartEditing flag on the edge
        const updatedEdges = edges.map((edge) => {
          if (edge.id === connectedEdge.id) {
            return {
              ...edge,
              data: {
                ...edge.data,
                shouldStartEditing: true,
              },
            }
          }
          return edge
        })
        setEdges(updatedEdges)
      }
    }
  }

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
    
    if (nodeRef.current && collapsedHeightRef.current && collapsedWidthRef.current) {
      const tempDiv = document.createElement('div')
      const computedStyle = window.getComputedStyle(nodeRef.current)
      
      tempDiv.style.position = 'absolute'
      tempDiv.style.visibility = 'hidden'
      tempDiv.style.opacity = '0'
      tempDiv.style.pointerEvents = 'none'
      tempDiv.style.top = '-9999px'
      tempDiv.style.left = '-9999px'
      tempDiv.style.padding = computedStyle.padding
      tempDiv.style.paddingTop = computedStyle.paddingTop
      tempDiv.style.paddingBottom = computedStyle.paddingBottom
      tempDiv.style.paddingLeft = computedStyle.paddingLeft
      tempDiv.style.paddingRight = computedStyle.paddingRight
      tempDiv.style.fontSize = computedStyle.fontSize
      tempDiv.style.fontFamily = computedStyle.fontFamily
      tempDiv.style.fontWeight = computedStyle.fontWeight
      tempDiv.style.lineHeight = computedStyle.lineHeight
      tempDiv.style.boxSizing = 'border-box'
      tempDiv.style.minWidth = computedStyle.minWidth
      tempDiv.style.maxWidth = '500px'
      
      const label = data.label
      const notes = data.concept.notes || ''
      const hasMetadata = Object.keys(getNonStyleMetadata(data.concept.metadata || {})).length > 0
      
      const labelDiv = document.createElement('div')
      labelDiv.style.fontWeight = '600'
      labelDiv.style.fontSize = '0.875rem'
      labelDiv.style.marginBottom = '0.25rem'
      labelDiv.textContent = label
      tempDiv.appendChild(labelDiv)
      
      if (notes) {
        const notesDiv = document.createElement('div')
        notesDiv.style.fontSize = '0.75rem'
        notesDiv.style.marginTop = '0.25rem'
        notesDiv.style.whiteSpace = 'pre-wrap'
        notesDiv.style.lineHeight = '1.5'
        notesDiv.textContent = notes
        tempDiv.appendChild(notesDiv)
      }
      
      if (hasMetadata) {
        const metadataDiv = document.createElement('div')
        metadataDiv.style.fontSize = '0.75rem'
        metadataDiv.style.marginTop = '0.5rem'
        metadataDiv.textContent = `${Object.keys(getNonStyleMetadata(data.concept.metadata || {})).length} metadata field(s)`
        tempDiv.appendChild(metadataDiv)
      }
      
      document.body.appendChild(tempDiv)
      void tempDiv.offsetHeight
      
      const expandedHeight = tempDiv.offsetHeight
      const expandedWidth = Math.max(tempDiv.scrollWidth || tempDiv.offsetWidth, collapsedWidthRef.current)
      
      document.body.removeChild(tempDiv)
      
      const collapsedWidth = collapsedWidthRef.current
      const collapsedHeight = collapsedHeightRef.current
      
      if (expandedHeight > collapsedHeight || expandedWidth > collapsedWidth) {
        const widthDiff = expandedWidth - collapsedWidth
        const heightDiff = expandedHeight - collapsedHeight
        translateX = -widthDiff / 2
        translateY = -heightDiff / 2
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
      await updateConcept(data.concept.id, { showNotesAndMetadata: true })
      
      // Re-enable transition after database update completes
      requestAnimationFrame(() => {
        if (nodeRef.current) {
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

  // Handler for preview mode (ephemeral) with delay
  const handlePreviewEnter = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Clear any existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }
    // Measure collapsed dimensions before expansion
    if (nodeRef.current) {
      if (!collapsedHeightRef.current) {
        collapsedHeightRef.current = nodeRef.current.offsetHeight
      }
      if (!collapsedWidthRef.current) {
        collapsedWidthRef.current = nodeRef.current.offsetWidth
      }
    }
    // Set preview after delay (1000ms) - measure and apply transform simultaneously
    previewTimeoutRef.current = setTimeout(() => {
      // Measure expanded content first (before showing it)
      measureAndApplyTransform()
    }, 1000)
  }

  // Measure expanded content and apply transform simultaneously with showing content
  const measureAndApplyTransform = () => {
    if (!nodeRef.current || !collapsedHeightRef.current || !collapsedWidthRef.current) {
      setIsPreviewingNotes(true)
      return
    }

    // Create a temporary measurement element that matches the node structure
    const tempDiv = document.createElement('div')
    const computedStyle = window.getComputedStyle(nodeRef.current)
    
    // Copy all relevant styles from the actual node
    tempDiv.style.position = 'absolute'
    tempDiv.style.visibility = 'hidden'
    tempDiv.style.opacity = '0'
    tempDiv.style.pointerEvents = 'none'
    tempDiv.style.top = '-9999px'
    tempDiv.style.left = '-9999px'
    // Don't constrain width - let it expand naturally to measure the actual expanded width
    tempDiv.style.padding = computedStyle.padding
    tempDiv.style.paddingTop = computedStyle.paddingTop
    tempDiv.style.paddingBottom = computedStyle.paddingBottom
    tempDiv.style.paddingLeft = computedStyle.paddingLeft
    tempDiv.style.paddingRight = computedStyle.paddingRight
    tempDiv.style.fontSize = computedStyle.fontSize
    tempDiv.style.fontFamily = computedStyle.fontFamily
    tempDiv.style.fontWeight = computedStyle.fontWeight
    tempDiv.style.lineHeight = computedStyle.lineHeight
    tempDiv.style.boxSizing = 'border-box'
    tempDiv.style.minWidth = computedStyle.minWidth
    // Set max-width to prevent it from expanding beyond reasonable bounds
    tempDiv.style.maxWidth = '500px' // Reasonable max width for measurement
    
    // Clone the node content structure more accurately
    const label = data.label
    const notes = data.concept.notes || ''
    const hasMetadata = Object.keys(getNonStyleMetadata(data.concept.metadata || {})).length > 0
    
    // Build content matching the actual structure
    const labelDiv = document.createElement('div')
    labelDiv.style.fontWeight = '600'
    labelDiv.style.fontSize = '0.875rem'
    labelDiv.style.marginBottom = '0.25rem'
    labelDiv.textContent = label
    tempDiv.appendChild(labelDiv)
    
    if (notes) {
      const notesDiv = document.createElement('div')
      notesDiv.style.fontSize = '0.75rem'
      notesDiv.style.marginTop = '0.25rem'
      notesDiv.style.whiteSpace = 'pre-wrap'
      notesDiv.style.lineHeight = '1.5'
      // For markdown, approximate the rendered height (notes are usually shorter when rendered)
      // We'll use the raw text length as a proxy
      notesDiv.textContent = notes
      tempDiv.appendChild(notesDiv)
    }
    
    if (hasMetadata) {
      const metadataDiv = document.createElement('div')
      metadataDiv.style.fontSize = '0.75rem'
      metadataDiv.style.marginTop = '0.5rem'
      metadataDiv.textContent = `${Object.keys(getNonStyleMetadata(data.concept.metadata || {})).length} metadata field(s)`
      tempDiv.appendChild(metadataDiv)
    }
    
    document.body.appendChild(tempDiv)
    
    // Force a reflow to ensure accurate measurement
    void tempDiv.offsetHeight
    
    // Measure expanded dimensions
    // Use scrollWidth to get the actual content width (even if constrained)
    // and offsetHeight for height
    const expandedHeight = tempDiv.offsetHeight
    const expandedWidth = Math.max(tempDiv.scrollWidth || tempDiv.offsetWidth, collapsedWidthRef.current)
    
    // Clean up
    document.body.removeChild(tempDiv)
    
    // Calculate transform
    // To expand from center: we need to offset by half the size difference
    // The node's top-left corner is at (x, y), so to keep the center fixed:
    // - Original center: (x + collapsedWidth/2, y + collapsedHeight/2)
    // - Expanded center (without transform): (x + expandedWidth/2, y + expandedHeight/2)
    // - We need to move left by (expandedWidth - collapsedWidth)/2
    // - And move up by (expandedHeight - collapsedHeight)/2
    const collapsedWidth = collapsedWidthRef.current
    const collapsedHeight = collapsedHeightRef.current
    
    if (expandedHeight > collapsedHeight || expandedWidth > collapsedWidth) {
      // Calculate the difference in dimensions
      const widthDiff = expandedWidth - collapsedWidth
      const heightDiff = expandedHeight - collapsedHeight
      
      // Move left by half the width increase (X decreases)
      const translateX = -widthDiff / 2
      // Move up by half the height increase (Y decreases)
      const translateY = -heightDiff / 2
      
      // Apply transform and expand content in the same frame
      // Use requestAnimationFrame to ensure both happen before browser paints
      requestAnimationFrame(() => {
        // Apply transform directly to DOM first (synchronously within this frame)
        if (nodeRef.current) {
          nodeRef.current.style.setProperty('transform', `translate(${translateX}px, ${translateY}px)`, 'important')
        }
        
        // Then update React state - both updates happen in same frame before paint
        flushSync(() => {
          setPreviewTransform({ x: translateX, y: translateY })
          setIsPreviewingNotes(true)
        })
      })
    } else {
      setIsPreviewingNotes(true)
    }
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
    if (isEditingNotes) {
      await handleSaveNotes()
    }
    if (isEditing) {
      await handleSave()
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


  // Clear transform when preview ends (but not for permanent expansion)
  useEffect(() => {
    if (!isPreviewingNotes && !isPermanentExpansionRef.current) {
      setPreviewTransform(null)
      // Reset collapsed dimensions for next preview
      collapsedHeightRef.current = null
      collapsedWidthRef.current = null
    }
  }, [isPreviewingNotes])
  
  // Reset permanent expansion flag when notes/metadata are hidden
  useEffect(() => {
    const showNotesAndMetadata = data.concept.showNotesAndMetadata ?? true
    if (!showNotesAndMetadata) {
      isPermanentExpansionRef.current = false
      // Clear transform when permanently hiding notes/metadata
      setPreviewTransform(null)
    }
  }, [data.concept.showNotesAndMetadata])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
      setPreviewTransform(null)
    }
  }, [])

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
          boxShadow: selected ? (isDarkMode ? '0 0 0 2px rgba(210, 250, 255, 0.2)' : '0 0 0 2px rgba(99, 102, 241, 0.2)') : undefined,
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
      {/* Editing highlights from other users */}
      {editingUsers.map((presence) => (
        <EditingHighlight
          key={presence.userId}
          presence={{
            userId: presence.userId,
            userName: presence.userName,
            email: presence.email || null,
            cursor: null,
            editingNodeId: presence.editingNodeId,
            editingEdgeId: null,
            color: presence.color,
            avatarUrl: presence.avatarUrl || null,
          }}
          nodeId={data.concept.id}
        />
      ))}
      
      {/* Avatars for users editing this node */}
      {editingUsers.length > 0 && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {editingUsers.map((presence) => (
            <PresenceAvatar
              key={presence.userId}
              presence={{
                userId: presence.userId,
                userName: presence.userName,
                email: presence.email || null,
                cursor: null,
                editingNodeId: presence.editingNodeId,
                editingEdgeId: null,
                color: presence.color,
                avatarUrl: presence.avatarUrl || null,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Centered target handle - expands to cover whole node when Option is held */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          position: 'absolute',
          top: isOptionHovered ? '0' : '50%',
          left: isOptionHovered ? '0' : '50%',
          transform: isOptionHovered ? 'none' : 'translate(-50%, -50%)',
          backgroundColor: 'transparent',
          width: isOptionHovered ? '100%' : '20px',
          height: isOptionHovered ? '100%' : '20px',
          borderRadius: isOptionHovered ? '8px' : '50%',
          border: 'none',
          zIndex: isOptionHovered ? 10 : 1,
        }}
      />
      
      <div className="text-center">
        {isEditing ? (
          <>
            {/* Hidden span to measure text width - positioned off-screen but in normal flow */}
            <span
              ref={measureRef}
              className="font-semibold text-sm absolute whitespace-pre pointer-events-none"
              style={{ 
                color: nodeStyle.textColor,
                visibility: 'hidden',
                position: 'absolute',
                top: '-9999px',
                left: '-9999px'
              }}
            >
              {editLabel || data.label}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={editLabel}
              onChange={(e) => {
                setEditLabel(e.target.value)
                // Update input width based on measured text width
                if (measureRef.current && inputRef.current) {
                  measureRef.current.textContent = e.target.value || data.label
                  // Use requestAnimationFrame to ensure DOM has updated
                  requestAnimationFrame(() => {
                    if (measureRef.current && inputRef.current) {
                      inputRef.current.style.width = `${Math.max(measureRef.current.offsetWidth, 20)}px`
                    }
                  })
                }
              }}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="inline-block font-semibold text-sm bg-transparent border-0 outline-none text-center"
              style={{ 
                color: nodeStyle.textColor,
                minWidth: '1px'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </>
        ) : (
          <div className="font-semibold text-sm inline-block" style={{ color: nodeStyle.textColor }}>
            {data.label}
          </div>
        )}
      </div>
      
      {/* Hidden span for measuring text width */}
      {isEditingNotes && (
        <span
          ref={notesMeasureRef}
          className="absolute invisible whitespace-nowrap"
          style={{ top: '-9999px', left: '-9999px' }}
        />
      )}
      
      {/* Notes section - editable inline (only show when notes exist or when editing, and when showNotesAndMetadata is true or when editing or previewing) */}
      {(shouldShowNotesAndMetadata || isEditingNotes) && (data.concept.notes || isEditingNotes) && (
        <div className={`mt-1 ${isEditingNotes ? 'overflow-visible' : 'w-full overflow-hidden'}`}>
          {isEditingNotes ? (
            <textarea
              ref={notesTextareaRef}
              value={editNotes}
              onChange={(e) => {
                setEditNotes(e.target.value)
                const textarea = e.target
                // Auto-resize height
                textarea.style.height = 'auto'
                const minHeight = notesDisplayHeight || 20
                const newHeight = Math.max(textarea.scrollHeight, minHeight)
                textarea.style.height = `${newHeight}px`
                // Auto-expand width based on content (measure longest line using hidden element)
                const minWidth = notesDisplayWidth || 100
                let maxLineWidth = minWidth
                if (notesMeasureRef.current) {
                  // Split by newlines and measure each line
                  const lines = e.target.value.split('\n')
                  notesMeasureRef.current.style.fontSize = window.getComputedStyle(textarea).fontSize
                  notesMeasureRef.current.style.fontFamily = window.getComputedStyle(textarea).fontFamily
                  notesMeasureRef.current.style.fontWeight = window.getComputedStyle(textarea).fontWeight
                  notesMeasureRef.current.style.letterSpacing = window.getComputedStyle(textarea).letterSpacing
                  notesMeasureRef.current.style.whiteSpace = 'nowrap'
                  notesMeasureRef.current.style.visibility = 'hidden'
                  notesMeasureRef.current.style.position = 'absolute'
                  notesMeasureRef.current.style.top = '-9999px'
                  
                  lines.forEach((line) => {
                    notesMeasureRef.current!.textContent = line || ' '
                    const lineWidth = notesMeasureRef.current!.offsetWidth
                    maxLineWidth = Math.max(maxLineWidth, lineWidth)
                  })
                }
                const newWidth = Math.max(maxLineWidth, minWidth)
                textarea.style.width = `${newWidth}px`
              }}
              onBlur={handleSaveNotes}
              onKeyDown={handleNotesKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-xs bg-transparent resize-none outline-none border-0 p-0 m-0 block"
              style={{ 
                color: nodeStyle.textColor,
                opacity: 0.7,
                lineHeight: '1.5',
                fontFamily: 'inherit',
                whiteSpace: 'pre',
                wordBreak: 'normal',
                overflowWrap: 'normal',
                boxSizing: 'border-box',
                minWidth: notesDisplayWidth ? `${notesDisplayWidth}px` : '100%',
                width: notesDisplayWidth ? `${notesDisplayWidth}px` : '100%',
                overflowX: 'visible',
                overflowY: 'hidden',
              }}
              placeholder="Add notes (Markdown supported)..."
              disabled={!hasWriteAccess}
            />
          ) : (
            <div 
              ref={notesDisplayRef}
              className={`text-xs **:text-inherit [&_strong]:font-bold [&_em]:italic [&_code]:font-mono [&_a]:underline [&_p]:m-0 [&_p]:leading-normal ${hasWriteAccess ? 'cursor-text hover:opacity-100' : ''} transition-opacity w-full overflow-hidden`}
              style={{ color: nodeStyle.textColor, opacity: 0.7, lineHeight: '1.5' }}
              onClick={(e) => {
                if (hasWriteAccess) {
                  e.stopPropagation()
                  setIsEditingNotes(true)
                }
              }}
              title={hasWriteAccess ? "Click to edit notes" : undefined}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {data.concept.notes}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
      {shouldShowNotesAndMetadata && Object.keys(getNonStyleMetadata(data.concept.metadata || {})).length > 0 && (
        <div className="mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsMetadataExpanded(!isMetadataExpanded)
            }}
            className="flex items-center gap-1 text-xs transition-colors w-full"
            style={{ color: nodeStyle.textColor, opacity: 0.6 }}
          >
            {isMetadataExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            <span>
              {Object.keys(getNonStyleMetadata(data.concept.metadata || {})).length} metadata field(s)
            </span>
          </button>
          {isMetadataExpanded && (
            <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: nodeStyle.borderColor }}>
              {Object.entries(getNonStyleMetadata(data.concept.metadata || {}))
                .filter(([key]) => key) // Filter out empty keys
                .map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="font-medium" style={{ color: nodeStyle.textColor, opacity: 0.8 }}>
                      {key}:
                    </span>{' '}
                    <span style={{ color: nodeStyle.textColor, opacity: 0.7 }}>
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      
      {/* Indicator for hidden notes/metadata */}
      {shouldShowIndicator && (
        <button
          onClick={handleShowNotesAndMetadata}
          onMouseEnter={handlePreviewEnter}
          className="absolute p-1 rounded-full bg-accent hover:bg-accent/80 transition-colors"
          style={{
            bottom: '-3px',
            right: '-3px',
            zIndex: 10,
            cursor: hasWriteAccess ? 'pointer' : 'default',
            opacity: 0.8,
          }}
          title="Hover to preview or click to show notes and metadata"
          disabled={!hasWriteAccess}
        >
          <Info className="h-3 w-3" style={{ color: nodeStyle.textColor, opacity: 0.7 }} strokeWidth={2} />
        </button>
      )}
      
      {/* Centered source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'transparent',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: 'none',
        }}
      />
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
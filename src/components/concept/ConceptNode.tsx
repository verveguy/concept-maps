import { memo, useState, useRef, useEffect, useMemo } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ConceptNodeData } from '@/lib/reactFlowTypes'
import { useUIStore } from '@/stores/uiStore'
import { useMapStore } from '@/stores/mapStore'
import { useConceptActions } from '@/hooks/useConceptActions'
import { usePerspectiveActions } from '@/hooks/usePerspectiveActions'
import { usePresence } from '@/hooks/usePresence'
import { useMapPermissions } from '@/hooks/useMapPermissions'
import { usePerspectives } from '@/hooks/usePerspectives'
import { useAllRelationships } from '@/hooks/useRelationships'
import { db, tx, id } from '@/lib/instant'
import { EditingHighlight } from '@/components/presence/EditingHighlight'
import { PresenceAvatar } from '@/components/presence/PresenceAvatar'

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
 * Custom node component for Concept nodes.
 * Supports inline editing on double-click.
 * Includes centered handles for source and target connections.
 * 
 * @param data - Node data containing concept information
 * @param selected - Whether the node is currently selected
 * @returns The concept node JSX
 */
export const ConceptNode = memo(({ data, selected, id: nodeId }: NodeProps<ConceptNodeData>) => {
  const { getEdges, setEdges, getNode } = useReactFlow()
  const currentMapId = useMapStore((state) => state.currentMapId)
  const setSelectedConceptId = useUIStore((state) => state.setSelectedConceptId)
  const setConceptEditorOpen = useUIStore((state) => state.setConceptEditorOpen)
  const setSelectedRelationshipId = useUIStore((state) => state.setSelectedRelationshipId)
  const setRelationshipEditorOpen = useUIStore((state) => state.setRelationshipEditorOpen)
  const { updateConcept } = useConceptActions()
  const { toggleConceptInPerspective } = usePerspectiveActions()
  const { otherUsersPresence } = usePresence()
  const { hasWriteAccess } = useMapPermissions()
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const isEditingPerspective = data.isEditingPerspective ?? false
  const isInPerspective = data.isInPerspective ?? true
  const perspectives = usePerspectives()
  const allRelationships = useAllRelationships()
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(data.label)
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasTriggeredEditRef = useRef(false)
  
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
    
    return {
      fillColor: (metadata.fillColor as string) || defaultFillColor,
      borderColor: (metadata.borderColor as string) || (selected ? defaultPrimaryColor : defaultBorderColor),
      borderStyle: (metadata.borderStyle as 'solid' | 'dashed' | 'dotted') || 'solid',
      textColor: (metadata.textColor as string) || defaultTextColor,
    }
  }, [metadataKey, selected, isDarkMode])

  // Update edit label when data changes (but not while editing)
  useEffect(() => {
    if (!isEditing) {
      setEditLabel(data.label)
    }
  }, [data.label, isEditing])

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

    // Delay opening editor to allow double-click detection
    clickTimerRef.current = setTimeout(() => {
      if (!isEditing) {
        // Close relationship editor and clear relationship selection when selecting a concept
        setSelectedRelationshipId(null)
        setRelationshipEditorOpen(false)
        // Open concept editor
        setSelectedConceptId(data.concept.id)
        setConceptEditorOpen(true)
      }
      clickTimerRef.current = null
    }, 300) // 300ms delay to distinguish from double-click
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

  const handleSave = async () => {
    if (!hasWriteAccess) {
      setIsEditing(false)
      return
    }
    
    if (editLabel.trim() && editLabel.trim() !== data.label) {
      try {
        await updateConcept(data.concept.id, {
          label: editLabel.trim(),
        })
      } catch (error) {
        console.error('Failed to update concept label:', error)
        setEditLabel(data.label) // Revert on error
      }
    } else {
      setEditLabel(data.label) // Revert if empty or unchanged
    }
    setIsEditing(false)
    return Promise.resolve() // Return promise for await in handleKeyDown
  }

  const handleCancel = () => {
    setEditLabel(data.label)
    setIsEditing(false)
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
        
        // Wait a bit for the edge to appear, then set shouldStartEditing flag
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
        }, 100)
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

  return (
    <div
      className="px-4 py-3 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg min-w-[120px] relative"
      style={{
        backgroundColor: nodeStyle.fillColor,
        borderWidth: '2px',
        borderStyle: nodeStyle.borderStyle,
        borderColor: nodeStyle.borderColor,
        boxShadow: selected ? (isDarkMode ? '0 0 0 2px rgba(210, 250, 255, 0.2)' : '0 0 0 2px rgba(99, 102, 241, 0.2)') : undefined,
        opacity: nodeOpacity,
        filter: nodeFilter,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
      
      {/* Centered target handle */}
      <Handle
        type="target"
        position={Position.Top}
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
      
      {data.concept.notes && (
        <div 
          className="text-xs mt-1 line-clamp-2 [&_*]:text-inherit [&_*]:text-xs [&_strong]:font-bold [&_em]:italic [&_code]:font-mono [&_a]:underline" 
          style={{ color: nodeStyle.textColor, opacity: 0.7 }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.concept.notes}
          </ReactMarkdown>
        </div>
      )}
      {Object.keys(getNonStyleMetadata(data.concept.metadata || {})).length > 0 && (
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
  )
})

ConceptNode.displayName = 'ConceptNode'
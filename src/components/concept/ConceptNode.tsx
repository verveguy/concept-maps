import { memo, useState, useRef, useEffect, useMemo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
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
 * Maximum number of handles per side for distributing multiple edges.
 */
const MAX_HANDLES_PER_SIDE = 5

/**
 * Custom node component for Concept nodes.
 * Supports inline editing on double-click.
 * Includes multiple handles on top and bottom to support multiple edges between the same nodes.
 * 
 * @param data - Node data containing concept information
 * @param selected - Whether the node is currently selected
 * @returns The concept node JSX
 */
export const ConceptNode = memo(({ data, selected }: NodeProps<ConceptNodeData>) => {
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
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Get users editing this node
  const editingUsers = otherUsersPresence
    .filter((p) => p.editingNodeId === data.concept.id && p.userName && p.color && p.userId)
    .filter((presence, index, self) => 
      // Ensure unique userIds
      index === self.findIndex((p) => p.userId === presence.userId)
    ) as Array<{ userId: string; userName: string; color: string; editingNodeId: string }>

  // Extract node style from metadata
  const metadataKey = data.concept?.metadata ? JSON.stringify(data.concept.metadata) : ''
  const nodeStyle = useMemo(() => {
    const metadata = data.concept?.metadata || {}
    return {
      fillColor: (metadata.fillColor as string) || '#ffffff',
      borderColor: (metadata.borderColor as string) || (selected ? '#6366f1' : '#d1d5db'),
      borderStyle: (metadata.borderStyle as 'solid' | 'dashed' | 'dotted') || 'solid',
      textColor: (metadata.textColor as string) || '#111827',
    }
  }, [metadataKey, selected])

  // Update edit label when data changes
  useEffect(() => {
    setEditLabel(data.label)
  }, [data.label])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

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
  }

  const handleCancel = () => {
    setEditLabel(data.label)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
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
        borderColor: selected ? '#6366f1' : nodeStyle.borderColor,
        boxShadow: selected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : undefined,
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
            cursor: null,
            editingNodeId: presence.editingNodeId,
            editingEdgeId: null,
            color: presence.color,
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
                cursor: null,
                editingNodeId: presence.editingNodeId,
                editingEdgeId: null,
                color: presence.color,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Multiple target handles at top, distributed horizontally */}
      {/* Handles are spaced evenly from -40% to +40% of node width */}
      {Array.from({ length: MAX_HANDLES_PER_SIDE }, (_, i) => {
        // Calculate horizontal position: evenly spaced from 10% to 90% (centered around 50%)
        const spacing = MAX_HANDLES_PER_SIDE > 1 ? 80 / (MAX_HANDLES_PER_SIDE - 1) : 0
        const offset = (i - (MAX_HANDLES_PER_SIDE - 1) / 2) * spacing
        return (
          <Handle
            key={`top-${i}`}
            type="target"
            position={Position.Top}
            id={`top-${i}`}
            style={{
              left: `${50 + offset}%`,
            }}
            className="bg-gray-300! w-1! h-1! opacity-30"
          />
        )
      })}
      
      {/* Keep a default handle for backwards compatibility */}
      <Handle type="target" position={Position.Top} className="bg-gray-300! w-1! h-1! opacity-30" />
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editLabel}
          onChange={(e) => setEditLabel(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full font-semibold text-sm bg-transparent border border-primary rounded px-1 py-0.5 outline-none"
          style={{ color: nodeStyle.textColor }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="font-semibold text-sm" style={{ color: nodeStyle.textColor }}>
          {data.label}
        </div>
      )}
      
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
      
      {/* Multiple source handles at bottom, distributed horizontally */}
      {/* Handles are spaced evenly from -40% to +40% of node width */}
      {Array.from({ length: MAX_HANDLES_PER_SIDE }, (_, i) => {
        // Calculate horizontal position: evenly spaced from 10% to 90% (centered around 50%)
        const spacing = MAX_HANDLES_PER_SIDE > 1 ? 80 / (MAX_HANDLES_PER_SIDE - 1) : 0
        const offset = (i - (MAX_HANDLES_PER_SIDE - 1) / 2) * spacing
        return (
          <Handle
            key={`bottom-${i}`}
            type="source"
            position={Position.Bottom}
            id={`bottom-${i}`}
            style={{
              left: `${50 + offset}%`,
            }}
            className="bg-gray-300! w-1! h-1! opacity-30"
          />
        )
      })}
      
      {/* Keep a default handle for backwards compatibility */}
      <Handle type="source" position={Position.Bottom} className="bg-gray-300! w-1! h-1! opacity-30" />
    </div>
  )
})

ConceptNode.displayName = 'ConceptNode'
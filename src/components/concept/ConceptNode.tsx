import { memo, useState, useRef, useEffect, useMemo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ConceptNodeData } from '@/lib/reactFlowTypes'
import { useUIStore } from '@/stores/uiStore'
import { useConceptActions } from '@/hooks/useConceptActions'
import { usePresence } from '@/hooks/usePresence'
import { EditingHighlight } from '@/components/presence/EditingHighlight'
import { PresenceAvatar } from '@/components/presence/PresenceAvatar'

/**
 * Custom node component for Concept nodes
 * Supports inline editing on double-click
 */
export const ConceptNode = memo(({ data, selected }: NodeProps<ConceptNodeData>) => {
  const setSelectedConceptId = useUIStore((state) => state.setSelectedConceptId)
  const setConceptEditorOpen = useUIStore((state) => state.setConceptEditorOpen)
  const { updateConcept } = useConceptActions()
  const { otherUsersPresence } = usePresence()
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(data.label)
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Get users editing this node
  const editingUsers = otherUsersPresence.filter(
    (p) => p.editingNodeId === data.concept.id && p.userName && p.color
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

  const handleClick = () => {
    // Clear any pending timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
    }

    // Delay opening editor to allow double-click detection
    clickTimerRef.current = setTimeout(() => {
      if (!isEditing) {
        setSelectedConceptId(data.concept.id)
        setConceptEditorOpen(true)
      }
      clickTimerRef.current = null
    }, 300) // 300ms delay to distinguish from double-click
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Cancel any pending click handler
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }

    setIsEditing(true)
    setEditLabel(data.label)
  }

  const handleSave = async () => {
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

  return (
    <div
      className="px-4 py-3 rounded-lg shadow-md cursor-pointer transition-all hover:shadow-lg min-w-[120px] relative"
      style={{
        backgroundColor: nodeStyle.fillColor,
        borderWidth: '2px',
        borderStyle: nodeStyle.borderStyle,
        borderColor: selected ? '#6366f1' : nodeStyle.borderColor,
        boxShadow: selected ? '0 0 0 2px rgba(99, 102, 241, 0.2)' : undefined,
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
      
      <Handle type="target" position={Position.Top} className="bg-gray-400! w-2! h-2!" />
      
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
        <div className="text-xs mt-1 line-clamp-2" style={{ color: nodeStyle.textColor, opacity: 0.7 }}>
          {data.concept.notes.substring(0, 50)}
          {data.concept.notes.length > 50 && '...'}
        </div>
      )}
      {Object.keys(data.concept.metadata || {}).length > 0 && (
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
              {Object.keys(data.concept.metadata || {}).length} metadata field(s)
            </span>
          </button>
          {isMetadataExpanded && (
            <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: nodeStyle.borderColor }}>
              {Object.entries(data.concept.metadata || {}).map(([key, value]) => (
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
      <Handle type="source" position={Position.Bottom} className="bg-gray-400! w-2! h-2!" />
    </div>
  )
})

ConceptNode.displayName = 'ConceptNode'
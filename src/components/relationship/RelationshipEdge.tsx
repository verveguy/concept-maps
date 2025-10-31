import { memo, useState, useRef, useEffect, useMemo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
  useReactFlow,
} from 'reactflow'
import type { RelationshipEdgeData } from '@/lib/reactFlowTypes'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'

/**
 * Custom edge component for Relationship edges
 * Supports inline editing on double-click
 */
export const RelationshipEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    markerEnd,
  }: EdgeProps<RelationshipEdgeData>) => {
    const { updateRelationship } = useRelationshipActions()
    const relationship = data?.relationship
    const label = relationship?.primaryLabel || ''
    
    // Extract edge style from metadata
    // Use JSON.stringify to ensure we detect changes to nested metadata
    const metadataKey = relationship?.metadata ? JSON.stringify(relationship.metadata) : ''
    const edgeStyle = useMemo(() => {
      const metadata = relationship?.metadata || {}
      const baseColor = (metadata.edgeColor as string) || '#94a3b8'
      return {
        type: (metadata.edgeType as 'bezier' | 'smoothstep' | 'step' | 'straight') || 'bezier',
        color: selected ? '#6366f1' : baseColor, // Highlight selected edges with primary color
        style: (metadata.edgeStyle as 'solid' | 'dashed') || 'solid',
      }
    }, [metadataKey, selected])
    
    const [isEditing, setIsEditing] = useState(false)
    const [editLabel, setEditLabel] = useState(label)
    const inputRef = useRef<HTMLInputElement>(null)

    // Update edit label when relationship changes
    useEffect(() => {
      setEditLabel(label)
    }, [label])

    // Focus input when editing starts
    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }, [isEditing])

    // Calculate edge path based on edge type
    const [edgePath, labelX, labelY] = useMemo(() => {
      const params = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      }
      
      switch (edgeStyle.type) {
        case 'smoothstep':
          return getSmoothStepPath(params)
        case 'step':
          // Step is smoothstep with borderRadius 0
          return getSmoothStepPath({
            ...params,
            borderRadius: 0,
          } as any)
        case 'straight':
          return getStraightPath(params)
        case 'bezier':
        default:
          return getBezierPath(params)
      }
    }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, edgeStyle.type])

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsEditing(true)
      setEditLabel(label)
    }

    const handleSave = async () => {
      if (!relationship) return
      
      if (editLabel.trim() && editLabel.trim() !== label) {
        try {
          await updateRelationship(relationship.id, {
            primaryLabel: editLabel.trim(),
          })
        } catch (error) {
          console.error('Failed to update relationship label:', error)
          setEditLabel(label) // Revert on error
        }
      } else {
        setEditLabel(label) // Revert if empty or unchanged
      }
      setIsEditing(false)
    }

    const handleCancel = () => {
      setEditLabel(label)
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
      <>
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            stroke: edgeStyle.color,
            strokeWidth: selected ? 3 : 2,
            strokeDasharray: edgeStyle.style === 'dashed' ? '5,5' : undefined,
          }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
            onDoubleClick={handleDoubleClick}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="px-2 py-1 text-xs font-medium bg-white border border-primary rounded shadow-lg outline-none min-w-[80px]"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div
                className={`px-2 py-1 text-xs font-medium bg-white rounded shadow-sm border ${
                  selected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300'
                } cursor-pointer hover:bg-gray-50`}
              >
                {label}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      </>
    )
  }
)

RelationshipEdge.displayName = 'RelationshipEdge'

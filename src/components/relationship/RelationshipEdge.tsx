/**
 * Custom edge component for Relationship edges.
 * Provides inline editing capabilities and supports multiple edge types.
 */

import { memo, useState, useRef, useEffect, useMemo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
  Position,
} from 'reactflow'
import type { RelationshipEdgeData } from '@/lib/reactFlowTypes'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'

/**
 * Calculate control point offset based on source/target positions.
 * This mimics React Flow's internal bezier calculation.
 * 
 * @param sourcePosition - Source handle position
 * @param targetPosition - Target handle position
 * @param sourceX - Source X coordinate
 * @param sourceY - Source Y coordinate
 * @param targetX - Target X coordinate
 * @param targetY - Target Y coordinate
 * @returns Control point offset value
 */
function getControlPointOffset(
  sourcePosition: Position,
  targetPosition: Position,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number
): number {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.sqrt(dx * dx + dy * dy)
  
  // Base offset similar to React Flow's default
  const baseOffset = length * 0.25
  
  // Adjust based on position
  if (sourcePosition === Position.Right || sourcePosition === Position.Left) {
    return Math.max(50, baseOffset)
  }
  return Math.max(50, baseOffset)
}

/**
 * Extract handle index from handle ID (e.g., "bottom-2" -> 2)
 */
function getHandleIndex(handleId: string | null | undefined): number {
  if (!handleId) return 2 // Default to middle handle
  const match = handleId.match(/(?:top|bottom)-(\d+)/)
  return match ? parseInt(match[1], 10) : 2
}

/**
 * Custom bezier path with offset control points for separating overlapping edges
 * Bends left for left handles, right for right handles (matching handle selection logic)
 */
function getBezierPathWithOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined
): [string, number, number] {
  const offset = getControlPointOffset(sourcePosition, targetPosition, sourceX, sourceY, targetX, targetY)
  
  // Extract handle indices to determine bend direction
  const sourceHandleIndex = getHandleIndex(sourceHandle)
  const targetHandleIndex = getHandleIndex(targetHandle)
  const handleIndex = Math.max(sourceHandleIndex, targetHandleIndex)
  
  // Determine bend direction based on handle position relative to center
  // Middle handle (index 2) = no bend, left handles (< 2) = bend left, right handles (> 2) = bend right
  const MAX_HANDLES_PER_SIDE = 5
  const middleHandleIndex = Math.floor(MAX_HANDLES_PER_SIDE / 2) // 2
  const offsetFromCenter = handleIndex - middleHandleIndex
  
  // Calculate control points with directional offset
  let controlX1: number
  let controlY1: number
  let controlX2: number
  let controlY2: number
  
  // Calculate direction vector
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.sqrt(dx * dx + dy * dy)
  
  if (length === 0) {
    // Fallback for zero-length edges
    controlX1 = sourceX
    controlY1 = sourceY
    controlX2 = targetX
    controlY2 = targetY
  } else {
    // Calculate perpendicular vector for offset (points left when looking from source to target)
    const perpX = -dy / length
    const perpY = dx / length
    
    // Calculate bend amount - stronger bend for handles further from center
    const bendAmount = 50 // Base pixels of bend
    const controlPointOffset = offsetFromCenter * bendAmount
    
    // Apply perpendicular offset to control points (negative = left, positive = right)
    const offsetX = perpX * controlPointOffset
    const offsetY = perpY * controlPointOffset
    
    // Calculate control points based on position, with bend offset
    switch (sourcePosition) {
      case Position.Right:
        controlX1 = sourceX + offset + offsetX
        controlY1 = sourceY + offsetY
        break
      case Position.Left:
        controlX1 = sourceX - offset + offsetX
        controlY1 = sourceY + offsetY
        break
      case Position.Top:
        controlX1 = sourceX + offsetX
        controlY1 = sourceY - offset + offsetY
        break
      case Position.Bottom:
      default:
        controlX1 = sourceX + offsetX
        controlY1 = sourceY + offset + offsetY
        break
    }
    
    switch (targetPosition) {
      case Position.Right:
        controlX2 = targetX + offset + offsetX
        controlY2 = targetY + offsetY
        break
      case Position.Left:
        controlX2 = targetX - offset + offsetX
        controlY2 = targetY + offsetY
        break
      case Position.Top:
        controlX2 = targetX + offsetX
        controlY2 = targetY - offset + offsetY
        break
      case Position.Bottom:
      default:
        controlX2 = targetX + offsetX
        controlY2 = targetY + offset + offsetY
        break
    }
  }
  
  // Calculate label position (midpoint of the curve)
  // Approximate midpoint of cubic bezier curve
  const t = 0.5
  const mt = 1 - t
  const labelX = mt * mt * mt * sourceX + 3 * mt * mt * t * controlX1 + 3 * mt * t * t * controlX2 + t * t * t * targetX
  const labelY = mt * mt * mt * sourceY + 3 * mt * mt * t * controlY1 + 3 * mt * t * t * controlY2 + t * t * t * targetY
  
  // Create SVG path for cubic bezier curve
  const path = `M ${sourceX},${sourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${targetX},${targetY}`
  
  return [path, labelX, labelY]
}

/**
 * Custom edge component for Relationship edges.
 * Supports inline editing on double-click.
 * Handles multiple edge types (bezier, smoothstep, step, straight) and styling.
 * 
 * @param sourceX - Source X coordinate
 * @param sourceY - Source Y coordinate
 * @param targetX - Target X coordinate
 * @param targetY - Target Y coordinate
 * @param sourcePosition - Source handle position
 * @param targetPosition - Target handle position
 * @param sourceHandle - Source handle ID
 * @param targetHandle - Target handle ID
 * @param data - Edge data containing relationship information
 * @param selected - Whether the edge is selected
 * @param markerEnd - Arrow marker configuration
 * @returns The relationship edge component JSX
 */
export const RelationshipEdge = memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    sourceHandle,
    targetHandle,
    data,
    selected,
    markerEnd,
  }: EdgeProps<RelationshipEdgeData>) => {
    const { updateRelationship } = useRelationshipActions()
    const relationship = data?.relationship
    const label = relationship?.primaryLabel || ''
    const isEditingPerspective = data?.isEditingPerspective ?? false
    const isInPerspective = data?.isInPerspective ?? true
    
    // Extract edge style from metadata
    // Use JSON.stringify to ensure we detect changes to nested metadata
    const metadataKey = relationship?.metadata ? JSON.stringify(relationship.metadata) : ''
    const edgeStyle = useMemo(() => {
      const metadata = relationship?.metadata || {}
      const baseColor = (metadata.edgeColor as string) || '#94a3b8'
      
      // Apply greyed-out styling when editing perspective and relationship is not included
      const isGreyedOut = isEditingPerspective && !isInPerspective
      let color = selected ? '#6366f1' : baseColor
      
      if (isGreyedOut) {
        // Apply greyed-out effect
        color = '#d1d5db' // Light grey color
      }
      
      return {
        type: (metadata.edgeType as 'bezier' | 'smoothstep' | 'step' | 'straight') || 'bezier',
        color,
        style: (metadata.edgeStyle as 'solid' | 'dashed') || 'solid',
        opacity: isGreyedOut ? 0.3 : 1,
      }
    }, [metadataKey, selected, isEditingPerspective, isInPerspective])
    
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
    // For bezier edges with multiple edges between same nodes, use custom path with offset control points
    const [edgePath, labelX, labelY, labelOffsetX, labelOffsetY] = useMemo(() => {
      const params = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      }
      
      const hasMultipleEdges = data?.hasMultipleEdges ?? false
      const edgeIndex = data?.edgeIndex ?? 0
      
      let pathResult: [string, number, number]
      
      switch (edgeStyle.type) {
        case 'smoothstep':
          pathResult = getSmoothStepPath(params)
          break
        case 'step':
          // Step is smoothstep with borderRadius 0
          pathResult = getSmoothStepPath({
            ...params,
            borderRadius: 0,
          } as any)
          break
        case 'straight':
          pathResult = getStraightPath(params)
          break
        case 'bezier':
        default:
          // Use custom bezier path with offset control points for multiple edges
          // This ensures edges bend in opposite directions based on handle positions
          if (hasMultipleEdges && edgeStyle.type === 'bezier') {
            pathResult = getBezierPathWithOffset(
              sourceX,
              sourceY,
              targetX,
              targetY,
              sourcePosition,
              targetPosition,
              sourceHandle,
              targetHandle
            )
          } else {
            // Use standard bezier path for single edges
            pathResult = getBezierPath(params)
          }
          break
      }
      
      const [path, labelXPos, labelYPos] = pathResult
      
      // Apply small label offset if needed (for non-bezier edge types with multiple edges)
      if (hasMultipleEdges && edgeStyle.type !== 'bezier') {
        const maxHandles = 5
        const offsetAmount = 25 // pixels of offset per edge index
        const offset = (edgeIndex - (maxHandles - 1) / 2) * offsetAmount
        
        const dx = targetX - sourceX
        const dy = targetY - sourceY
        const length = Math.sqrt(dx * dx + dy * dy)
        
        if (length > 0) {
          const perpX = -dy / length
          const perpY = dx / length
          const labelOffsetX = perpX * offset
          const labelOffsetY = perpY * offset
          return [path, labelXPos, labelYPos, labelOffsetX, labelOffsetY]
        }
      }
      
      return [path, labelXPos, labelYPos, 0, 0]
    }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, data?.hasMultipleEdges, data?.edgeIndex, edgeStyle.type])

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
            opacity: edgeStyle.opacity,
          }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX + labelOffsetX}px,${labelY + labelOffsetY}px)`,
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
                style={{
                  opacity: isEditingPerspective && !isInPerspective ? 0.5 : 1,
                }}
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

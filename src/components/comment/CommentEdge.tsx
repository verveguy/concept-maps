/**
 * Custom React Flow edge component for Comment edges.
 * 
 * Renders a dashed bezier curve connecting a Comment node to a Concept node.
 * Uses centered handles and has no arrow markers (unlike Relationship edges).
 * 
 * **Features:**
 * - Dashed stroke style
 * - Bezier curve path
 * - Gray color (subtle, not as prominent as relationship edges)
 * - No arrow markers
 * 
 * @param props - Edge props from React Flow
 * @param props.id - Edge ID
 * @param props.source - Source node ID (Comment)
 * @param props.target - Target node ID (Concept)
 * @param props.selected - Whether the edge is currently selected
 * @param props.style - Edge style object
 * @param props.markerEnd - Arrow marker (not used for comments)
 * @returns The comment edge JSX
 */

import { memo } from 'react'
import { BaseEdge, EdgeProps, getBezierPath } from 'reactflow'

export const CommentEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
  }: EdgeProps) => {
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    })

    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: selected ? '#ef4444' : '#9ca3af', // Red when selected, gray otherwise
          strokeWidth: selected ? 3 : 2, // Thicker when selected
          strokeDasharray: '5,5', // Dashed line
        }}
        markerEnd={undefined} // No arrow markers for comments
      />
    )
  }
)

CommentEdge.displayName = 'CommentEdge'


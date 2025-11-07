/**
 * Custom connection line component that renders behind nodes.
 * Uses bezier curves and applies a lower z-index to ensure it appears behind nodes.
 */

import { memo } from 'react'
import { getBezierPath, type ConnectionLineComponentProps } from 'reactflow'

/**
 * Custom connection line component.
 * Renders a bezier curve connection line with a lower z-index so it appears behind nodes.
 * 
 * @param props - Connection line component props from React Flow
 * @returns The connection line SVG element
 */
export const CustomConnectionLine = memo(({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) => {
  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    targetX: toX,
    targetY: toY,
    sourcePosition: fromPosition,
    targetPosition: toPosition,
  })

  return (
    <g>
      <path
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        className="react-flow__connection-path"
        d={edgePath}
        style={{ zIndex: 0 }}
      />
    </g>
  )
})

CustomConnectionLine.displayName = 'CustomConnectionLine'


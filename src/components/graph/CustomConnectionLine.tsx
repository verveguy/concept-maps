/**
 * Custom connection line component that renders behind nodes.
 * Uses bezier curves and applies a lower z-index to ensure it appears behind nodes.
 */

import { memo } from 'react'
import { getBezierPath, type ConnectionLineComponentProps } from 'reactflow'

/**
 * Custom connection line component that renders behind nodes.
 * 
 * Renders a bezier curve connection line with a lower z-index so it appears
 * behind nodes during edge creation. This provides visual feedback when users
 * are creating new relationships by dragging from one concept to another.
 * 
 * **Visual Design:**
 * - Bezier curve connecting the source and target positions
 * - Indigo color (#6366f1) matching the app's primary color
 * - 2px stroke width
 * - Lower z-index to ensure it appears behind nodes
 * 
 * **Use Case:**
 * This component is used by React Flow during edge creation. When a user starts
 * dragging from a node handle, React Flow shows a preview connection line.
 * This custom component ensures the line appears behind nodes for better visual
 * hierarchy.
 * 
 * @param props - Connection line component props from React Flow
 * @param props.fromX - Source X coordinate
 * @param props.fromY - Source Y coordinate
 * @param props.toX - Target X coordinate
 * @param props.toY - Target Y coordinate
 * @param props.fromPosition - Source handle position (for bezier calculation)
 * @param props.toPosition - Target handle position (for bezier calculation)
 * @returns The connection line SVG element
 * 
 * @example
 * ```tsx
 * import { CustomConnectionLine } from '@/components/graph/CustomConnectionLine'
 * import { ReactFlow } from 'reactflow'
 * 
 * function ConceptMap() {
 *   return (
 *     <ReactFlow
 *       nodes={nodes}
 *       edges={edges}
 *       connectionLineComponent={CustomConnectionLine}
 *     />
 *   )
 * }
 * ```
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


/**
 * Component for rendering connection handles on concept nodes.
 * 
 * Renders both target (incoming) and source (outgoing) handles. The target
 * handle expands to cover the entire node when Option/Alt key is held,
 * allowing users to drag from anywhere on the node.
 * 
 * **Handle Expansion:**
 * - When Option/Alt key is pressed and mouse is over node, target handle expands
 * - When Option/Alt key is released or mouse leaves, handle collapses to center
 * - Only works when user has write access
 * 
 * @param isOptionHovered - Whether handle should be expanded (Option key + mouse over)
 * 
 * @example
 * ```tsx
 * import { ConceptNodeHandles } from '@/components/concept/ConceptNodeHandles'
 * 
 * function ConceptNode({ isOptionHovered }) {
 *   return (
 *     <div>
 *       <ConceptNodeHandles isOptionHovered={isOptionHovered} />
 *     </div>
 *   )
 * }
 * ```
 */

import { Handle, Position } from 'reactflow'

/**
 * Props for ConceptNodeHandles component
 */
export interface ConceptNodeHandlesProps {
  /** Whether handle should be expanded (Option key + mouse over) */
  isOptionHovered: boolean
}

/**
 * Component to render connection handles for concept nodes.
 * 
 * @param props - Component props
 * @returns Handles JSX
 */
export function ConceptNodeHandles({ isOptionHovered }: ConceptNodeHandlesProps) {
  return (
    <>
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
    </>
  )
}


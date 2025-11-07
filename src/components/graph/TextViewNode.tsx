/**
 * TextViewNode - Custom React Flow node that displays the structured text view.
 * This allows the text view to be positioned and moved on the canvas alongside the graph.
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { StructuredTextView } from '@/components/text/StructuredTextView'

/**
 * TextViewNodeData - Data structure for text view node.
 */
export interface TextViewNodeData {
  /** Node type identifier */
  type: 'text-view'
}

/**
 * Custom React Flow node that displays the structured text view.
 * 
 * Allows the text view to be positioned and moved on the canvas alongside the graph.
 * This enables users to see both the graph visualization and the text representation
 * simultaneously, with the text view as a draggable node.
 * 
 * **Node Features:**
 * - Fixed size: 800x600px
 * - Draggable on the canvas
 * - Handles for connections (top and bottom)
 * - Title bar showing "Structured Text View"
 * - Contains the StructuredTextView component
 * 
 * **Visual Design:**
 * - White background with border
 * - Shadow for depth
 * - Selected state shows primary color border and ring
 * - Title bar with gray background
 * 
 * **Use Case:**
 * Used in "both" view mode where users can see both the graph and text views
 * simultaneously. The text view node can be positioned anywhere on the canvas
 * and moved independently of the concept nodes.
 * 
 * @param props - Node props from React Flow
 * @param props.data - Node data (type: 'text-view')
 * @param props.selected - Whether the node is currently selected
 * @returns The text view node JSX
 * 
 * @example
 * ```tsx
 * import { TextViewNode } from '@/components/graph/TextViewNode'
 * 
 * // Register as a custom node type
 * const nodeTypes = {
 *   'text-view': TextViewNode
 * }
 * 
 * // Use in React Flow
 * <ReactFlow nodeTypes={nodeTypes} nodes={nodes} />
 * ```
 */
export const TextViewNode = memo(({ data: _data, selected }: NodeProps<TextViewNodeData>) => {
  return (
    <div
      className={`w-[800px] h-[600px] bg-white border-2 rounded-lg shadow-lg overflow-hidden ${
        selected ? 'border-primary shadow-xl ring-2 ring-primary/20' : 'border-gray-300'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
      
      {/* Title bar */}
      <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Structured Text View</h3>
        <div className="text-xs text-gray-500">Drag to move</div>
      </div>
      
      {/* Text view content */}
      <div className="h-[calc(100%-48px)] overflow-hidden">
        <StructuredTextView />
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
    </div>
  )
})

TextViewNode.displayName = 'TextViewNode'


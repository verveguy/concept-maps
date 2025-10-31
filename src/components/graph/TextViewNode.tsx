import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { StructuredTextView } from '@/components/text/StructuredTextView'

/**
 * TextViewNodeData - Data structure for text view node
 */
export interface TextViewNodeData {
  type: 'text-view'
}

/**
 * TextViewNode - Custom React Flow node that displays the structured text view
 * This allows the text view to be positioned and moved on the canvas alongside the graph
 */
export const TextViewNode = memo(({ data, selected }: NodeProps<TextViewNodeData>) => {
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


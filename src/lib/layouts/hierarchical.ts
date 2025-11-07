/**
 * Hierarchical layout algorithm implementation.
 * Uses dagre to arrange nodes in a top-to-bottom hierarchy.
 */

import dagre from 'dagre'
import type { Node, Edge } from 'reactflow'

/**
 * Configuration options for hierarchical layout.
 */
export interface HierarchicalLayoutOptions {
  /** Layout direction (default: 'TB' - Top to Bottom) */
  direction?: 'TB' | 'BT' | 'LR' | 'RL'
  /** Node width in pixels (default: 150) */
  nodeWidth?: number
  /** Node height in pixels (default: 100) */
  nodeHeight?: number
  /** Vertical spacing between ranks (default: 100) */
  ranksep?: number
  /** Horizontal spacing between nodes (default: 50) */
  nodesep?: number
}

/**
 * Hierarchical layout algorithm using dagre.
 * 
 * Arranges nodes in a top-to-bottom (or other directional) hierarchy based on
 * the graph structure. This creates a tree-like layout where parent nodes are
 * positioned above their children.
 * 
 * **Algorithm:**
 * Uses the dagre library which implements a hierarchical graph layout algorithm:
 * - Analyzes the graph structure to determine node ranks (levels)
 * - Positions nodes within ranks to minimize edge crossings
 * - Distributes nodes evenly across the canvas
 * - Supports multiple directions (top-to-bottom, bottom-to-top, left-to-right, right-to-left)
 * 
 * **Layout Direction:**
 * - `'TB'` (default): Top to Bottom - roots at top, leaves at bottom
 * - `'BT'`: Bottom to Top - roots at bottom, leaves at top
 * - `'LR'`: Left to Right - roots on left, leaves on right
 * - `'RL'`: Right to Left - roots on right, leaves on left
 * 
 * **Spacing:**
 * - `ranksep`: Vertical spacing between ranks (levels)
 * - `nodesep`: Horizontal spacing between nodes in the same rank
 * 
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges connecting the nodes
 * @param options - Layout configuration options
 * @param options.direction - Layout direction: 'TB' | 'BT' | 'LR' | 'RL' (default: 'TB')
 * @param options.nodeWidth - Node width in pixels (default: 150)
 * @param options.nodeHeight - Node height in pixels (default: 100)
 * @param options.ranksep - Vertical spacing between ranks (default: 100)
 * @param options.nodesep - Horizontal spacing between nodes (default: 50)
 * @returns Updated nodes with new positions calculated by the hierarchical algorithm
 * 
 * @example
 * ```tsx
 * import { applyHierarchicalLayout } from '@/lib/layouts/hierarchical'
 * 
 * function ConceptMap() {
 *   const [nodes, setNodes] = useState(initialNodes)
 *   const edges = useRelationshipsToEdges()
 *   
 *   const handleApplyLayout = () => {
 *     const newNodes = applyHierarchicalLayout(nodes, edges, {
 *       direction: 'TB',
 *       nodeWidth: 200,
 *       nodeHeight: 120,
 *       ranksep: 150,
 *       nodesep: 75
 *     })
 *     setNodes(newNodes)
 *   }
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
 */
export function applyHierarchicalLayout(
  nodes: Node[],
  edges: Edge[],
  options: HierarchicalLayoutOptions = {}
): Node[] {
  const {
    direction = 'TB', // Top to Bottom
    nodeWidth = 150,
    nodeHeight = 100,
    ranksep = 100, // Vertical spacing between ranks
    nodesep = 50, // Horizontal spacing between nodes
  } = options

  // Create a new dagre graph
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep,
    ranksep,
  })

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    })
  })

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  // Run dagre layout algorithm
  dagre.layout(dagreGraph)

  // Extract positions and update nodes
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    }
  })
}


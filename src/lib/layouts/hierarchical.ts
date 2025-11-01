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
 * Arranges nodes in a top-to-bottom hierarchy.
 * 
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges connecting the nodes
 * @param options - Layout configuration options
 * @returns Updated nodes with new positions
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


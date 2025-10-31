import dagre from 'dagre'
import type { Node, Edge } from 'reactflow'

/**
 * Hierarchical layout algorithm using dagre
 * Arranges nodes in a top-to-bottom hierarchy
 */
export function applyHierarchicalLayout(
  nodes: Node[],
  edges: Edge[],
  options: {
    direction?: 'TB' | 'BT' | 'LR' | 'RL'
    nodeWidth?: number
    nodeHeight?: number
    ranksep?: number
    nodesep?: number
  } = {}
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


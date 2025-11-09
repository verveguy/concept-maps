/**
 * Stress-majorization layout algorithm implementation using elkjs.
 * Preserves graph-theoretic distances between nodes, minimizing stress.
 * Excellent for concept maps with cycles and multiple connections.
 */

import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from 'reactflow'

/**
 * Configuration options for stress-majorization layout.
 */
export interface StressLayoutOptions {
  /** Canvas width in pixels (default: 1000) */
  width?: number
  /** Canvas height in pixels (default: 1000) */
  height?: number
  /** Number of iterations for stress minimization (default: 200) */
  iterations?: number
  /** Whether to consider edge labels in layout (default: true) */
  considerEdgeLabels?: boolean
  /** Spacing between nodes in pixels (default: 200) */
  nodeSpacing?: number
  /** Spacing between edges and nodes in pixels (default: 50) */
  edgeNodeSpacing?: number
}

/**
 * Stress-majorization layout algorithm using elkjs.
 * 
 * This layout preserves graph-theoretic distances between nodes by minimizing
 * stress (the difference between ideal and actual distances). It's excellent
 * for concept maps because:
 * - Preserves relationship distances naturally
 * - Handles cycles well
 * - Works with multiple edges between nodes
 * - Produces organic, readable layouts
 * 
 * **Algorithm:**
 * Uses elkjs's stress layout algorithm which:
 * 1. Calculates ideal distances between nodes based on graph structure
 * 2. Iteratively adjusts positions to minimize stress
 * 3. Considers edge lengths and node repulsion
 * 4. Converges to a stable layout
 * 
 * **Stress Minimization:**
 * The algorithm minimizes the stress function:
 * stress = Σ (ideal_distance - actual_distance)²
 * 
 * This ensures that nodes that should be close together (based on graph structure)
 * are positioned close together in the layout.
 * 
 * **"Preserves Graph Distances":**
 * The layout tries to position nodes so that the visual/physical distance between
 * nodes matches their graph-theoretic distance (shortest path length). For example:
 * - Nodes 2 hops away in the graph → positioned closer together
 * - Nodes 5 hops away → positioned farther apart
 * This preserves the structural relationships of the graph in the visual layout,
 * making it easier to understand which concepts are closely related vs distantly related.
 * 
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges connecting the nodes
 * @param options - Layout configuration options
 * @param options.width - Canvas width in pixels (default: 1000)
 * @param options.height - Canvas height in pixels (default: 1000)
 * @param options.iterations - Number of iterations for stress minimization (default: 200)
 * @param options.considerEdgeLabels - Whether to consider edge labels in layout (default: true)
 * @returns Updated nodes with new positions calculated by stress-majorization
 * 
 * @example
 * ```tsx
 * import { applyStressLayout } from '@/lib/layouts/stress'
 * 
 * function ConceptMap() {
 *   const [nodes, setNodes] = useState(initialNodes)
 *   const edges = useRelationshipsToEdges()
 *   
 *   const handleApplyLayout = async () => {
 *     const newNodes = await applyStressLayout(nodes, edges, {
 *       width: 2000,
 *       height: 1500,
 *       iterations: 300
 *     })
 *     setNodes(newNodes)
 *   }
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
 */
export async function applyStressLayout(
  nodes: Node[],
  edges: Edge[],
  options: StressLayoutOptions = {}
): Promise<Node[]> {
  const {
    iterations = 200,
    considerEdgeLabels = true,
    nodeSpacing = 500, // Much more generous default spacing
    edgeNodeSpacing = 120, // Increased edge-node spacing
  } = options

  if (nodes.length === 0) return nodes

  // Create elkjs instance
  const elk = new ELK()

  // Estimate edge label widths for spacing
  const getEdgeLabelWidth = (edge: Edge): number => {
    if (!considerEdgeLabels) return 0
    const edgeLabel = (edge.data as any)?.relationship?.primaryLabel || ''
    if (!edgeLabel) return 0
    // Rough estimate: ~8px per character + padding
    return edgeLabel.length * 8 + 32
  }

  // Convert React Flow nodes to elkjs format
  const elkNodes = nodes.map((node) => {
    // Estimate node dimensions (approximate: ~150px wide, ~50px tall)
    const nodeWidth = 150
    const nodeHeight = 50
    
    return {
      id: node.id,
      width: nodeWidth,
      height: nodeHeight,
    }
  })

  // Convert React Flow edges to elkjs format
  const elkEdges = edges.map((edge) => {
    const labelWidth = getEdgeLabelWidth(edge)
    
    return {
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      // Add label width to help with spacing
      ...(labelWidth > 0 && {
        labels: [{ text: '', width: labelWidth, height: 20 }],
      }),
    }
  })

  // Create elkjs graph with stress layout
  // Use increased spacing to prevent dense layouts
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'stress',
      'elk.stress.iterations': iterations.toString(),
      'elk.spacing.nodeNode': nodeSpacing.toString(),
      'elk.spacing.edgeNode': edgeNodeSpacing.toString(),
      'elk.spacing.edgeEdge': '60', // Further increased edge-edge spacing
    },
    children: elkNodes,
    edges: elkEdges,
  }

  // Run elkjs layout
  const layoutedGraph = await elk.layout(elkGraph)

  // Extract positions and update nodes
  return nodes.map((node) => {
    const elkNode = layoutedGraph.children?.find((n) => n.id === node.id)
    if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
      // elkjs positions nodes by their center, React Flow by top-left
      const nodeWidth = 150
      const nodeHeight = 50
      return {
        ...node,
        position: {
          x: elkNode.x - nodeWidth / 2,
          y: elkNode.y - nodeHeight / 2,
        },
      }
    }
    return node
  })
}


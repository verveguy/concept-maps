/**
 * Layered layout algorithm implementation using elkjs.
 * Uses Sugiyama-style hierarchical layout that minimizes edge crossings.
 * Excellent for concept maps with cycles and multiple connections.
 */

import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from 'reactflow'

/**
 * Configuration options for layered layout.
 */
export interface LayeredLayoutOptions {
  /** Canvas width in pixels (default: 1000) */
  width?: number
  /** Canvas height in pixels (default: 1000) */
  height?: number
  /** Layout direction (default: 'DOWN') */
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
  /** Spacing between nodes (default: 80) */
  nodeSpacing?: number
  /** Spacing between layers (default: 100) */
  layerSpacing?: number
  /** Whether to consider edge labels in layout (default: true) */
  considerEdgeLabels?: boolean
}

/**
 * Layered layout algorithm using elkjs (Sugiyama-style).
 * 
 * This layout arranges nodes in layers (hierarchical levels) while minimizing
 * edge crossings. It's excellent for concept maps because:
 * - Handles cycles intelligently by breaking them
 * - Minimizes edge crossings significantly
 * - Works well with multiple edges between nodes
 * - Provides clear visual hierarchy even without a root node
 * 
 * **Algorithm:**
 * Uses elkjs's layered layout algorithm which:
 * 1. Assigns nodes to layers (levels)
 * 2. Orders nodes within layers to minimize crossings
 * 3. Routes edges to avoid overlaps
 * 4. Handles cycles by intelligently breaking them
 * 
 * **Edge Crossing Minimization:**
 * The algorithm uses sophisticated heuristics to minimize edge crossings:
 * - Barycenter heuristic for node ordering
 * - Edge routing optimization
 * - Cycle breaking strategies
 * 
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges connecting the nodes
 * @param options - Layout configuration options
 * @param options.width - Canvas width in pixels (default: 1000)
 * @param options.height - Canvas height in pixels (default: 1000)
 * @param options.direction - Layout direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' (default: 'DOWN')
 * @param options.nodeSpacing - Spacing between nodes (default: 80)
 * @param options.layerSpacing - Spacing between layers (default: 100)
 * @param options.considerEdgeLabels - Whether to consider edge labels in layout (default: true)
 * @returns Updated nodes with new positions calculated by the layered algorithm
 * 
 * @example
 * ```tsx
 * import { applyLayeredLayout } from '@/lib/layouts/layered'
 * 
 * function ConceptMap() {
 *   const [nodes, setNodes] = useState(initialNodes)
 *   const edges = useRelationshipsToEdges()
 *   
 *   const handleApplyLayout = async () => {
 *     const newNodes = await applyLayeredLayout(nodes, edges, {
 *       width: 2000,
 *       height: 1500,
 *       direction: 'DOWN',
 *       nodeSpacing: 100,
 *       layerSpacing: 120
 *     })
 *     setNodes(newNodes)
 *   }
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
 */
export async function applyLayeredLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayeredLayoutOptions = {}
): Promise<Node[]> {
  const {
    direction = 'DOWN',
    nodeSpacing = 80,
    layerSpacing = 100,
    considerEdgeLabels = true,
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

  // Map direction to elkjs direction
  const elkDirection = direction === 'UP' ? 'UP' :
                       direction === 'LEFT' ? 'LEFT' :
                       direction === 'RIGHT' ? 'RIGHT' :
                       'DOWN'

  // Create elkjs graph
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': elkDirection,
      'elk.spacing.nodeNode': nodeSpacing.toString(),
      'elk.layered.spacing.nodeNodeBetweenLayers': layerSpacing.toString(),
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.cycleBreaking.strategy': 'GREEDY',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.layered.spacing.edgeEdge': '10',
      'elk.layered.spacing.edgeNode': '20',
      'elk.spacing.edgeNode': '30',
      'elk.spacing.edgeEdge': '10',
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


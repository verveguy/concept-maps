/**
 * Force-directed layout algorithm implementation.
 * Uses d3-force to position nodes based on physics simulation with forces
 * between connected nodes.
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from 'd3-force'
import type { Node, Edge } from 'reactflow'

/**
 * Configuration options for force-directed layout.
 */
export interface ForceDirectedLayoutOptions {
  /** Canvas width in pixels (default: 1000) */
  width?: number
  /** Canvas height in pixels (default: 1000) */
  height?: number
  /** Charge strength for repulsion between nodes (default: -300) */
  strength?: number
  /** Ideal distance between connected nodes (default: 150) */
  distance?: number
  /** Number of simulation iterations (default: 300) */
  iterations?: number
}

/**
 * Force-directed layout algorithm using d3-force.
 * 
 * Positions nodes based on physics simulation with forces between connected nodes.
 * This creates an organic, natural-looking graph layout where:
 * - Connected nodes are pulled together
 * - All nodes repel each other (preventing overlap)
 * - Nodes are centered in the canvas
 * - Collision detection prevents node overlap
 * 
 * **Algorithm:**
 * Uses d3-force's physics simulation with multiple forces:
 * - **Link force**: Attracts connected nodes to a specified distance
 * - **Charge force**: Repels all nodes from each other (negative charge)
 * - **Center force**: Pulls all nodes toward the canvas center
 * - **Collision force**: Prevents nodes from overlapping
 * 
 * **Configuration:**
 * The algorithm runs for a fixed number of iterations (default: 300) to
 * allow the simulation to stabilize. More iterations produce more stable
 * layouts but take longer to compute.
 * 
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges connecting the nodes
 * @param options - Layout configuration options
 * @param options.width - Canvas width in pixels (default: 1000)
 * @param options.height - Canvas height in pixels (default: 1000)
 * @param options.strength - Charge strength for repulsion between nodes (default: -300, negative = repulsion)
 * @param options.distance - Ideal distance between connected nodes (default: 150)
 * @param options.iterations - Number of simulation iterations (default: 300)
 * @returns Updated nodes with new positions calculated by the force simulation
 * 
 * @example
 * ```tsx
 * import { applyForceDirectedLayout } from '@/lib/layouts/forceDirected'
 * 
 * function ConceptMap() {
 *   const [nodes, setNodes] = useState(initialNodes)
 *   const edges = useRelationshipsToEdges()
 *   
 *   const handleApplyLayout = () => {
 *     const newNodes = applyForceDirectedLayout(nodes, edges, {
 *       width: 2000,
 *       height: 1500,
 *       strength: -400,
 *       distance: 200,
 *       iterations: 500
 *     })
 *     setNodes(newNodes)
 *   }
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
 */
export function applyForceDirectedLayout(
  nodes: Node[],
  edges: Edge[],
  options: ForceDirectedLayoutOptions = {}
): Node[] {
  const {
    width = 1000,
    height = 1000,
    strength = -300,
    distance = 150,
    iterations = 300,
  } = options

  // Create nodes with x, y properties for d3-force
  const simulationNodes = nodes.map((node) => ({
    id: node.id,
    x: node.position.x,
    y: node.position.y,
  }))

  // Create a map for quick node lookup
  const nodeMap = new Map(simulationNodes.map((n, i) => [n.id, i]))

  // Create links for d3-force (using indices)
  const simulationLinks = edges
    .map((edge) => {
      const sourceIndex = nodeMap.get(edge.source)
      const targetIndex = nodeMap.get(edge.target)
      if (sourceIndex === undefined || targetIndex === undefined) return null
      return {
        source: sourceIndex,
        target: targetIndex,
      }
    })
    .filter((link): link is { source: number; target: number } => link !== null)

  // Create force simulation
  const simulation = forceSimulation(simulationNodes as any)
    .force('link', forceLink(simulationLinks).distance(distance).strength(0.5))
    .force('charge', forceManyBody().strength(strength))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collision', forceCollide().radius(80))

  // Run simulation for specified iterations
  for (let i = 0; i < iterations; i++) {
    simulation.tick()
  }

  // Extract positions and update nodes
  return nodes.map((node) => {
    const simNode = simulationNodes.find((n) => n.id === node.id)!
    return {
      ...node,
      position: {
        x: simNode.x || node.position.x,
        y: simNode.y || node.position.y,
      },
    }
  })
}


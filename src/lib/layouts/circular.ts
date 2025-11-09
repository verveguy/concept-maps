/**
 * Circular layout algorithm implementation.
 * Arranges nodes in a circle, ideal for concept maps with cycles and no clear hierarchy.
 */

import type { Node, Edge } from 'reactflow'

/**
 * Configuration options for circular layout.
 */
export interface CircularLayoutOptions {
  /** Canvas width in pixels (default: 1000) */
  width?: number
  /** Canvas height in pixels (default: 1000) */
  height?: number
  /** Radius of the circle (default: auto-calculated) */
  radius?: number
  /** Starting angle in radians (default: 0 - starts at top) */
  startAngle?: number
  /** Whether to sort nodes by degree (default: true) */
  sortByDegree?: boolean
}

/**
 * Circular layout algorithm for concept maps.
 * 
 * Arranges nodes in a circle, which is ideal for concept maps because:
 * - Treats all nodes equally (no hierarchy)
 * - Handles cycles naturally
 * - Provides clear visual separation
 * - Works well for small-medium graphs
 * 
 * **Algorithm:**
 * 1. Optionally sorts nodes by degree (most connected nodes first)
 * 2. Arranges nodes evenly around a circle
 * 3. Centers the circle in the canvas
 * 
 * **Sorting:**
 * When `sortByDegree` is true, nodes are sorted by their degree (number of connections).
 * This places highly connected nodes first, which can help visualize important concepts.
 * 
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges connecting the nodes (used for degree calculation)
 * @param options - Layout configuration options
 * @param options.width - Canvas width in pixels (default: 1000)
 * @param options.height - Canvas height in pixels (default: 1000)
 * @param options.radius - Radius of the circle (default: auto-calculated based on canvas size)
 * @param options.startAngle - Starting angle in radians (default: 0 - starts at top)
 * @param options.sortByDegree - Whether to sort nodes by degree (default: true)
 * @returns Updated nodes with new positions arranged in a circle
 * 
 * @example
 * ```tsx
 * import { applyCircularLayout } from '@/lib/layouts/circular'
 * 
 * function ConceptMap() {
 *   const [nodes, setNodes] = useState(initialNodes)
 *   const edges = useRelationshipsToEdges()
 *   
 *   const handleApplyLayout = () => {
 *     const newNodes = applyCircularLayout(nodes, edges, {
 *       width: 2000,
 *       height: 1500,
 *       sortByDegree: true
 *     })
 *     setNodes(newNodes)
 *   }
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
 */
export function applyCircularLayout(
  nodes: Node[],
  edges: Edge[],
  options: CircularLayoutOptions = {}
): Node[] {
  const {
    width = 1000,
    height = 1000,
    startAngle = 0,
    sortByDegree = true,
  } = options

  if (nodes.length === 0) return nodes
  if (nodes.length === 1) {
    // Single node: center it
    return nodes.map((node) => ({
      ...node,
      position: {
        x: width / 2 - 75, // Approximate node width / 2
        y: height / 2 - 25, // Approximate node height / 2
      },
    }))
  }

  // Calculate node degrees (number of connections)
  const nodeDegrees = new Map<string, number>()
  nodes.forEach((node) => {
    nodeDegrees.set(node.id, 0)
  })
  
  edges.forEach((edge) => {
    const sourceDegree = nodeDegrees.get(edge.source) || 0
    const targetDegree = nodeDegrees.get(edge.target) || 0
    nodeDegrees.set(edge.source, sourceDegree + 1)
    nodeDegrees.set(edge.target, targetDegree + 1)
  })

  // Sort nodes by degree if requested (most connected first)
  const sortedNodes = sortByDegree
    ? [...nodes].sort((a, b) => {
        const degreeA = nodeDegrees.get(a.id) || 0
        const degreeB = nodeDegrees.get(b.id) || 0
        return degreeB - degreeA // Descending order
      })
    : nodes

  // Calculate optimal radius based on canvas size and node count
  // Leave padding around edges (20% margin)
  const minDimension = Math.min(width, height)
  const maxRadius = minDimension * 0.4 // Use 40% of smaller dimension
  
  // Adjust radius based on number of nodes
  // More nodes need larger radius to avoid overlap
  const baseRadius = Math.min(maxRadius, (minDimension * 0.3) + (nodes.length * 5))
  const radius = options.radius ?? baseRadius

  // Calculate angle increment for each node
  const angleIncrement = (2 * Math.PI) / sortedNodes.length

  // Calculate center of canvas
  const centerX = width / 2
  const centerY = height / 2

  // Create a map of new positions
  const positionMap = new Map<string, { x: number; y: number }>()
  
  sortedNodes.forEach((node, index) => {
    const angle = startAngle + (index * angleIncrement)
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    
    // Adjust for node center (nodes are positioned by top-left corner)
    // Approximate node dimensions: ~150px wide, ~50px tall
    positionMap.set(node.id, {
      x: x - 75, // Half node width
      y: y - 25, // Half node height
    })
  })

  // Update nodes with new positions
  return nodes.map((node) => {
    const newPosition = positionMap.get(node.id)
    if (newPosition) {
      return {
        ...node,
        position: newPosition,
      }
    }
    return node
  })
}



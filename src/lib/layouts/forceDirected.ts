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
 * Estimate the width of an edge label for layout calculations.
 * 
 * @param label - Edge label text
 * @param fontSize - Font size in pixels (default: 12px for text-xs)
 * @param padding - Horizontal padding in pixels (default: 16px for px-2 on both sides)
 * @returns Estimated width in pixels
 */
function estimateEdgeLabelWidth(label: string, fontSize: number = 12, padding: number = 16): number {
  if (!label) return 0
  
  // Try to use canvas for accurate measurement
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (context) {
        // Match the actual font used: text-xs font-medium
        context.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
        const measuredWidth = context.measureText(label).width
        return measuredWidth + padding
      }
    } catch {
      // Fall through to estimation if canvas fails
    }
  }
  
  // Fallback estimation: for font-medium, average character width is closer to 0.75 * fontSize
  const avgCharWidth = fontSize * 0.75
  return (label.length * avgCharWidth) + padding
}

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
  /** Set of node IDs to keep fixed (for incremental layout) */
  fixedNodeIds?: Set<string>
  /** Set of node IDs that are newly added (for incremental layout) */
  newNodeIds?: Set<string>
  /** Number of hops to include around new nodes (default: 1) - only layout this neighborhood */
  neighborhoodHops?: number
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
    fixedNodeIds,
    newNodeIds,
    neighborhoodHops = 1,
  } = options

  // Determine if we're doing incremental layout
  const isIncremental = fixedNodeIds !== undefined && fixedNodeIds.size > 0
  
  // If incremental with new nodes, find the neighborhood to layout
  let nodesToLayout: Set<string> = new Set()
  let computedFixedNodeIds: Set<string> | undefined = fixedNodeIds
  
  if (isIncremental && newNodeIds && newNodeIds.size > 0) {
    // Find neighborhood: new nodes + their neighbors (up to neighborhoodHops away)
    nodesToLayout = new Set<string>(newNodeIds)
    
    // Build adjacency map for efficient neighbor lookup
    const adjacencyMap = new Map<string, Set<string>>()
    nodes.forEach(node => adjacencyMap.set(node.id, new Set()))
    edges.forEach(edge => {
      adjacencyMap.get(edge.source)?.add(edge.target)
      adjacencyMap.get(edge.target)?.add(edge.source)
    })
    
    // Expand neighborhood by specified number of hops
    let currentLevel = new Set(newNodeIds)
    for (let hop = 0; hop < neighborhoodHops; hop++) {
      const nextLevel = new Set<string>()
      currentLevel.forEach(nodeId => {
        const neighbors = adjacencyMap.get(nodeId)
        if (neighbors) {
          neighbors.forEach(neighborId => {
            if (!nodesToLayout.has(neighborId)) {
              nodesToLayout.add(neighborId)
              nextLevel.add(neighborId)
            }
          })
        }
      })
      currentLevel = nextLevel
    }
    
    // Fixed nodes are all nodes NOT in the neighborhood
    computedFixedNodeIds = new Set(
      nodes
        .map(n => n.id)
        .filter(id => !nodesToLayout.has(id))
    )
  }

  // Adaptive parameter tuning based on graph characteristics
  const nodeCount = nodes.length
  const edgeCount = edges.length
  const avgDegree = edgeCount / Math.max(nodeCount, 1)
  
  // Adjust charge strength based on graph density
  // Denser graphs need stronger repulsion
  const adaptiveStrength = avgDegree > 3 
    ? strength * 1.5  // Dense graphs: stronger repulsion
    : strength * 0.8  // Sparse graphs: weaker repulsion
  
  // Adjust link distance based on graph size
  // Larger graphs need more spacing
  const adaptiveDistance = nodeCount > 20
    ? distance * 1.3
    : distance
  
  // Adjust iterations based on graph complexity
  // More complex graphs need more iterations to stabilize
  const adaptiveIterations = nodeCount > 15 || edgeCount > 30
    ? Math.max(iterations, 400)
    : iterations

  // Create nodes with x, y properties for d3-force
  // Use better initial positioning: spread nodes in a circle if they're all at origin
  const allAtOrigin = nodes.every(n => Math.abs(n.position.x) < 10 && Math.abs(n.position.y) < 10)
  const simulationNodes = nodes.map((node, i) => {
    let x = node.position.x
    let y = node.position.y
    const isFixed = computedFixedNodeIds?.has(node.id) ?? false
    
    // If all nodes are at origin and not incremental, initialize them in a circle
    if (!isIncremental && allAtOrigin && nodeCount > 1) {
      const angle = (2 * Math.PI * i) / nodeCount
      const radius = Math.min(width, height) * 0.3
      x = width / 2 + radius * Math.cos(angle)
      y = height / 2 + radius * Math.sin(angle)
    }
    
    // For incremental layout with new nodes, position new nodes near their connections
    if (isIncremental && newNodeIds?.has(node.id)) {
      // Find connected nodes to position new node near them
      const connectedEdges = edges.filter(
        e => e.source === node.id || e.target === node.id
      )
      if (connectedEdges.length > 0) {
        // Find average position of connected fixed nodes (nodes not in the neighborhood)
        const connectedNodeIds = new Set<string>()
        connectedEdges.forEach(e => {
          if (e.source !== node.id) connectedNodeIds.add(e.source)
          if (e.target !== node.id) connectedNodeIds.add(e.target)
        })
        
        const connectedFixedNodes = nodes.filter(
          n => connectedNodeIds.has(n.id) && computedFixedNodeIds?.has(n.id)
        )
        
        if (connectedFixedNodes.length > 0) {
          const avgX = connectedFixedNodes.reduce((sum, n) => sum + n.position.x, 0) / connectedFixedNodes.length
          const avgY = connectedFixedNodes.reduce((sum, n) => sum + n.position.y, 0) / connectedFixedNodes.length
          // Position new node offset from average position
          x = avgX + (adaptiveDistance * 0.8)
          y = avgY + (adaptiveDistance * 0.8)
        }
      }
    }
    
    return {
      id: node.id,
      x,
      y,
      fx: isFixed ? x : undefined, // Fix position for fixed nodes
      fy: isFixed ? y : undefined,
    }
  })

  // Create a map for quick node lookup
  const nodeMap = new Map(simulationNodes.map((n, i) => [n.id, i]))

  // Create links for d3-force (using indices)
  // For incremental layout with neighborhood, only include edges that connect nodes in the layout neighborhood
  // This prevents fixed nodes from being pulled around
  const relevantEdges = isIncremental && nodesToLayout.size > 0
    ? edges.filter(e => nodesToLayout.has(e.source) || nodesToLayout.has(e.target))
    : edges
  
  // Calculate per-edge distances based on label width
  const simulationLinks = relevantEdges
    .map((edge) => {
      const sourceIndex = nodeMap.get(edge.source)
      const targetIndex = nodeMap.get(edge.target)
      if (sourceIndex === undefined || targetIndex === undefined) return null
      
      // Get edge label from edge data
      const edgeLabel = (edge.data as any)?.relationship?.primaryLabel || ''
      const labelWidth = estimateEdgeLabelWidth(edgeLabel)
      
      // Calculate distance: base distance + extra space for label
      // Add 50% of label width to ensure labels don't overlap nodes
      const edgeDistance = adaptiveDistance + (labelWidth * 0.5)
      
      return {
        source: sourceIndex,
        target: targetIndex,
        distance: edgeDistance,
      }
    })
    .filter((link): link is { source: number; target: number; distance: number } => link !== null)

  // Create force simulation with improved parameters
  const simulation = forceSimulation(simulationNodes as any)
    .force('link', forceLink(simulationLinks)
      .distance((d: any) => d.distance || adaptiveDistance)
      .strength(0.7)) // Increased link strength for better connectivity
    .force('charge', forceManyBody()
      .strength(adaptiveStrength)
      .distanceMax(Math.max(width, height) * 0.6)) // Limit charge range for performance
    .force('center', forceCenter(width / 2, height / 2)
      .strength(0.1)) // Weaker center force to allow natural spread
    .force('collision', forceCollide()
      .radius(85) // Slightly larger collision radius for better spacing
      .strength(0.8)) // Strong collision to prevent overlap

  // Run simulation with alpha decay for smoother convergence
  simulation.alpha(1).alphaDecay(1 - Math.pow(0.001, 1 / adaptiveIterations))
  
  // Run simulation for specified iterations
  for (let i = 0; i < adaptiveIterations; i++) {
    simulation.tick()
  }

  // Stop simulation to free resources
  simulation.stop()

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


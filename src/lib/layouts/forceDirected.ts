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
 * Positions nodes based on forces between connected nodes.
 * 
 * @param nodes - React Flow nodes to position
 * @param edges - React Flow edges connecting the nodes
 * @param options - Layout configuration options
 * @returns Updated nodes with new positions
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


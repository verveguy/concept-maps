import type { Node, Edge } from 'reactflow'
import { MarkerType } from 'reactflow'
import type { Concept, Relationship } from '@/lib/schema'

/**
 * Convert Concept entities to React Flow nodes
 */
export function conceptsToNodes(concepts: Concept[]): Node[] {
  return concepts.map((concept) => ({
    id: concept.id,
    type: 'concept',
    position: concept.position,
    data: {
      label: concept.label,
      concept,
    },
  }))
}

/**
 * Convert Relationship entities to React Flow edges
 * Uses custom RelationshipEdge component for inline editing
 * Adds arrow markers to show directionality
 */
export function relationshipsToEdges(relationships: Relationship[]): Edge[] {
  return relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.fromConceptId,
    target: relationship.toConceptId,
    type: 'default', // Use custom RelationshipEdge component
    markerEnd: {
      type: MarkerType.Arrow,
      width: 12,
      height: 12,
    },
    data: {
      relationship,
    },
  }))
}

/**
 * Convert React Flow nodes to Concept entities
 */
export function nodesToConcepts(nodes: Node[]): Partial<Concept>[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
  }))
}

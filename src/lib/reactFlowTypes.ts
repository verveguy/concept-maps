import type { Node, Edge } from 'reactflow'
import type { Concept, Relationship } from '@/lib/schema'

/**
 * Custom node data type for Concept nodes
 */
export interface ConceptNodeData {
  label: string
  concept: Concept
  isInPerspective?: boolean // Whether this concept is included in the current perspective
  isEditingPerspective?: boolean // Whether we're currently editing a perspective
}

/**
 * Custom edge data type for Relationship edges
 */
export interface RelationshipEdgeData {
  relationship: Relationship
  isInPerspective?: boolean // Whether this relationship is included in the current perspective
  isEditingPerspective?: boolean // Whether we're currently editing a perspective
  hasMultipleEdges?: boolean // Whether there are multiple edges between the same two nodes
  edgeIndex?: number // Index of this edge within a group of edges between the same nodes
}

/**
 * Type guard to check if node data is ConceptNodeData
 */
export function isConceptNodeData(data: unknown): data is ConceptNodeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'label' in data &&
    'concept' in data
  )
}

/**
 * Type guard to check if edge data is RelationshipEdgeData
 */
export function isRelationshipEdgeData(
  data: unknown
): data is RelationshipEdgeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'relationship' in data
  )
}

/**
 * Typed Node for Concept nodes
 */
export type ConceptNode = Node<ConceptNodeData>

/**
 * Typed Edge for Relationship edges
 */
export type RelationshipEdge = Edge<RelationshipEdgeData>

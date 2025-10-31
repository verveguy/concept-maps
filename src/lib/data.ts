import type { Node, Edge } from 'reactflow'
import { MarkerType } from 'reactflow'
import type { Concept, Relationship } from '@/lib/schema'

/**
 * Convert Concept entities to React Flow nodes
 * @param concepts - Array of concepts to convert
 * @param perspectiveConceptIds - Optional set of concept IDs included in perspective (for styling)
 * @param isEditingPerspective - Whether we're editing a perspective (affects styling)
 */
export function conceptsToNodes(
  concepts: Concept[],
  perspectiveConceptIds?: Set<string>,
  isEditingPerspective?: boolean
): Node[] {
  return concepts
    .filter((concept) => concept.id && concept.id.trim()) // Filter out empty IDs
    .map((concept) => ({
      id: concept.id,
      type: 'concept',
      position: concept.position,
      data: {
        label: concept.label,
        concept,
        isInPerspective: perspectiveConceptIds
          ? perspectiveConceptIds.has(concept.id)
          : undefined,
        isEditingPerspective,
      },
    }))
}

/**
 * Convert Relationship entities to React Flow edges
 * Uses custom RelationshipEdge component for inline editing
 * Adds arrow markers to show directionality
 * @param relationships - Array of relationships to convert
 * @param perspectiveRelationshipIds - Optional set of relationship IDs included in perspective (for styling)
 * @param isEditingPerspective - Whether we're editing a perspective (affects styling)
 */
export function relationshipsToEdges(
  relationships: Relationship[],
  perspectiveRelationshipIds?: Set<string>,
  isEditingPerspective?: boolean
): Edge[] {
  return relationships
    .filter((relationship) => relationship.id && relationship.id.trim()) // Filter out empty IDs
    .map((relationship) => ({
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
        isInPerspective: perspectiveRelationshipIds
          ? perspectiveRelationshipIds.has(relationship.id)
          : undefined,
        isEditingPerspective,
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

/**
 * Data transformation utilities for converting between domain models
 * and React Flow visualization types.
 */

import type { Node, Edge } from 'reactflow'
import { MarkerType } from 'reactflow'
import type { Concept, Relationship } from '@/lib/schema'

/**
 * Options for converting concepts to nodes.
 */
export interface ConceptsToNodesOptions {
  /** Optional set of concept IDs included in perspective (for styling) */
  perspectiveConceptIds?: Set<string>
  /** Whether we're editing a perspective (affects styling) */
  isEditingPerspective?: boolean
}

/**
 * Options for converting relationships to edges.
 */
export interface RelationshipsToEdgesOptions {
  /** Optional set of relationship IDs included in perspective (for styling) */
  perspectiveRelationshipIds?: Set<string>
  /** Whether we're editing a perspective (affects styling) */
  isEditingPerspective?: boolean
}

/**
 * Maximum number of handles per side for distributing multiple edges.
 * Used to prevent edge overlap when multiple relationships connect the same nodes.
 */
const MAX_HANDLES_PER_SIDE = 5

/**
 * Convert Concept entities to React Flow nodes.
 * 
 * @param concepts - Array of concepts to convert
 * @param perspectiveConceptIds - Optional set of concept IDs included in perspective (for styling)
 * @param isEditingPerspective - Whether we're editing a perspective (affects styling)
 * @returns Array of React Flow nodes
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
 * Convert Relationship entities to React Flow edges.
 * Uses custom RelationshipEdge component for inline editing.
 * Adds arrow markers to show directionality.
 * Assigns handles to edges to prevent overlap when multiple edges connect the same nodes.
 * 
 * @param relationships - Array of relationships to convert
 * @param perspectiveRelationshipIds - Optional set of relationship IDs included in perspective (for styling)
 * @param isEditingPerspective - Whether we're editing a perspective (affects styling)
 * @returns Array of React Flow edges
 */
export function relationshipsToEdges(
  relationships: Relationship[],
  perspectiveRelationshipIds?: Set<string>,
  isEditingPerspective?: boolean
): Edge[] {
  // Filter out empty IDs
  const validRelationships = relationships.filter(
    (relationship) => relationship.id && relationship.id.trim()
  )

  // Group relationships by (fromConceptId, toConceptId) pair
  const edgeGroups = new Map<string, Relationship[]>()
  validRelationships.forEach((relationship) => {
    const groupKey = `${relationship.fromConceptId}|${relationship.toConceptId}`
    if (!edgeGroups.has(groupKey)) {
      edgeGroups.set(groupKey, [])
    }
    edgeGroups.get(groupKey)!.push(relationship)
  })

  // Convert relationships to edges, assigning handles based on their index within each group
  // Single edges use the middle handle, multiple edges are distributed around the center
  const edges: Edge[] = []
  edgeGroups.forEach((groupRelationships) => {
    const hasMultipleEdges = groupRelationships.length > 1
    const middleHandleIndex = Math.floor(MAX_HANDLES_PER_SIDE / 2) // Center handle (index 2 for 5 handles)
    
    groupRelationships.forEach((relationship, index) => {
      let handleIndex: number
      
      if (!hasMultipleEdges) {
        // Single edge: use middle handle
        handleIndex = middleHandleIndex
      } else {
        // Multiple edges: distribute symmetrically around center
        const numEdges = groupRelationships.length
        
        if (numEdges === 2) {
          // Two edges: use handles on either side of center
          handleIndex = middleHandleIndex - 1 + index * 2
        } else if (numEdges === 3) {
          // Three edges: center, left, right
          if (index === 0) {
            handleIndex = middleHandleIndex - 1
          } else if (index === 1) {
            handleIndex = middleHandleIndex
          } else {
            handleIndex = middleHandleIndex + 1
          }
        } else {
          // Four or more edges: distribute symmetrically around center
          // Calculate offset from center (negative = left, positive = right)
          // For even number of edges, distribute on both sides of center
          // For odd number of edges, include center and distribute around it
          const offsetFromCenter = index - (numEdges - 1) / 2
          
          // Scale offset to fit within available handles
          // Use smaller step to keep edges closer to center when possible
          const maxOffset = Math.floor(MAX_HANDLES_PER_SIDE / 2)
          const scale = Math.min(1, maxOffset / Math.ceil(numEdges / 2))
          const scaledOffset = Math.round(offsetFromCenter * scale)
          
          handleIndex = middleHandleIndex + scaledOffset
          
          // Clamp to valid handle range [0, MAX_HANDLES_PER_SIDE - 1]
          handleIndex = Math.max(0, Math.min(MAX_HANDLES_PER_SIDE - 1, handleIndex))
        }
      }
      
      const sourceHandle = `bottom-${handleIndex}`
      const targetHandle = `top-${handleIndex}`

      edges.push({
        id: relationship.id,
        source: relationship.fromConceptId,
        target: relationship.toConceptId,
        sourceHandle,
        targetHandle,
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
          hasMultipleEdges, // Flag indicating multiple edges between same nodes
          edgeIndex: index, // Index within the group for offset calculation
        },
      })
    })
  })

  return edges
}

/**
 * Convert React Flow nodes to Concept entities.
 * Extracts position data from nodes for updating concept positions.
 * 
 * @param nodes - React Flow nodes to convert
 * @returns Array of partial Concept objects with id and position
 */
export function nodesToConcepts(nodes: Node[]): Partial<Concept>[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
  }))
}

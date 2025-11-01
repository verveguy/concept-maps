/**
 * React Flow type definitions for concept mapping visualization.
 * Provides type-safe interfaces for React Flow nodes and edges used in the concept map.
 */

import type { Node, Edge } from 'reactflow'
import type { Concept, Relationship } from '@/lib/schema'

/**
 * Custom node data type for Concept nodes in React Flow.
 * Contains the concept data and perspective-related metadata.
 */
export interface ConceptNodeData {
  /** Display label for the concept */
  label: string
  /** The concept entity data */
  concept: Concept
  /** Whether this concept is included in the current perspective */
  isInPerspective?: boolean
  /** Whether we're currently editing a perspective */
  isEditingPerspective?: boolean
}

/**
 * Custom edge data type for Relationship edges in React Flow.
 * Contains the relationship data and metadata for rendering.
 */
export interface RelationshipEdgeData {
  /** The relationship entity data */
  relationship: Relationship
  /** Whether this relationship is included in the current perspective */
  isInPerspective?: boolean
  /** Whether we're currently editing a perspective */
  isEditingPerspective?: boolean
  /** Whether there are multiple edges between the same two nodes */
  hasMultipleEdges?: boolean
  /** Index of this edge within a group of edges between the same nodes */
  edgeIndex?: number
}

/**
 * Type guard to check if node data is ConceptNodeData.
 * 
 * @param data - Unknown data to check
 * @returns True if data is ConceptNodeData
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
 * Type guard to check if edge data is RelationshipEdgeData.
 * 
 * @param data - Unknown data to check
 * @returns True if data is RelationshipEdgeData
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
 * Typed Node for Concept nodes in React Flow.
 */
export type ConceptNode = Node<ConceptNodeData>

/**
 * Typed Edge for Relationship edges in React Flow.
 */
export type RelationshipEdge = Edge<RelationshipEdgeData>

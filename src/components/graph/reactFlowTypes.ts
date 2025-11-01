/**
 * React Flow node and edge type definitions.
 * Defined in a separate file to ensure stable references across hot reloads.
 * Uses Object.freeze to ensure the objects are truly immutable.
 */

import { ConceptNode } from '../concept/ConceptNode'
import { RelationshipEdge } from '../relationship/RelationshipEdge'
import { TextViewNode } from './TextViewNode'

/**
 * Registered node types for React Flow.
 * Maps node type identifiers to their component implementations.
 */
export const nodeTypes = Object.freeze({
  /** Concept node type */
  concept: ConceptNode,
  /** Text view node type */
  'text-view': TextViewNode,
})

/**
 * Registered edge types for React Flow.
 * Maps edge type identifiers to their component implementations.
 */
export const edgeTypes = Object.freeze({
  /** Default relationship edge type */
  default: RelationshipEdge,
})


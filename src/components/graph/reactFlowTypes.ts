import { ConceptNode } from '../concept/ConceptNode'
import { RelationshipEdge } from '../relationship/RelationshipEdge'
import { TextViewNode } from './TextViewNode'

/**
 * React Flow node and edge type definitions
 * Defined in a separate file to ensure stable references across hot reloads
 * Using Object.freeze to ensure the objects are truly immutable
 */
export const nodeTypes = Object.freeze({
  concept: ConceptNode,
  'text-view': TextViewNode,
})

export const edgeTypes = Object.freeze({
  default: RelationshipEdge,
})


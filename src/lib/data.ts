/**
 * Data transformation utilities for converting between domain models
 * and React Flow visualization types.
 */

import type { Node, Edge } from 'reactflow'
import { MarkerType } from 'reactflow'
import type { Concept, Relationship, Comment } from '@/lib/schema'

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
 * Transforms domain model concepts into React Flow node format for visualization.
 * Each concept becomes a node with position, label, and metadata. The function
 * also handles perspective-based styling by marking nodes as included/excluded
 * from the current perspective.
 * 
 * **Node Data Structure:**
 * - `id`: Concept ID
 * - `type`: Always `'concept'` (for React Flow node type mapping)
 * - `position`: Concept's x/y coordinates
 * - `data.label`: Concept display label
 * - `data.concept`: Full concept entity
 * - `data.isInPerspective`: Whether concept is in current perspective (if applicable)
 * - `data.isEditingPerspective`: Whether perspective editing mode is active
 * 
 * **Filtering:**
 * Concepts with empty or whitespace-only IDs are automatically filtered out.
 * 
 * @param concepts - Array of concepts to convert to nodes
 * @param perspectiveConceptIds - Optional set of concept IDs included in the current perspective (used for styling)
 * @param isEditingPerspective - Whether perspective editing mode is active (affects node styling)
 * @returns Array of React Flow nodes ready for visualization
 * 
 * @example
 * ```tsx
 * import { conceptsToNodes } from '@/lib/data'
 * import { useConcepts } from '@/hooks/useConcepts'
 * 
 * function ConceptMap() {
 *   const concepts = useConcepts()
 *   const nodes = conceptsToNodes(concepts)
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
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
 * 
 * Transforms domain model relationships into React Flow edge format for visualization.
 * Each relationship becomes an edge connecting two concept nodes. The function handles
 * multiple edges between the same nodes by distributing them across different handles
 * to prevent visual overlap.
 * 
 * **Edge Features:**
 * - Uses custom `RelationshipEdge` component for inline editing capabilities
 * - Adds arrow markers to show directionality (from concept → to concept)
 * - Distributes multiple edges between the same nodes across handles (up to 5 per side)
 * - Supports perspective-based styling
 * 
 * **Handle Distribution:**
 * When multiple relationships connect the same two concepts, edges are distributed
 * symmetrically around the center handle to prevent overlap. Single edges use the
 * center handle, while multiple edges are spread evenly.
 * 
 * **Edge Data Structure:**
 * - `id`: Relationship ID
 * - `source`: Source concept ID
 * - `target`: Target concept ID
 * - `sourceHandle`/`targetHandle`: Handle IDs for multi-edge distribution
 * - `type`: Always `'default'` (maps to RelationshipEdge component)
 * - `markerEnd`: Arrow marker configuration
 * - `data.relationship`: Full relationship entity
 * - `data.isInPerspective`: Whether relationship is in current perspective
 * - `data.hasMultipleEdges`: Flag indicating multiple edges between same nodes
 * 
 * **Filtering:**
 * Relationships with empty or whitespace-only IDs are automatically filtered out.
 * 
 * @param relationships - Array of relationships to convert to edges
 * @param perspectiveRelationshipIds - Optional set of relationship IDs included in the current perspective (used for styling)
 * @param isEditingPerspective - Whether perspective editing mode is active (affects edge styling)
 * @returns Array of React Flow edges ready for visualization
 * 
 * @example
 * ```tsx
 * import { relationshipsToEdges } from '@/lib/data'
 * import { useRelationships } from '@/hooks/useRelationships'
 * 
 * function ConceptMap() {
 *   const relationships = useRelationships()
 *   const edges = relationshipsToEdges(relationships)
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
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
 * Convert React Flow nodes back to Concept entities.
 * 
 * Extracts position data from React Flow nodes after they've been moved or
 * repositioned. This is used to update concept positions in the database when
 * nodes are dragged on the canvas.
 * 
 * **Use Case:**
 * When a user drags a node on the canvas, React Flow updates the node's position.
 * This function extracts the new position and concept ID so the position can be
 * saved back to InstantDB.
 * 
 * **Return Value:**
 * Returns partial Concept objects containing only `id` and `position` fields,
 * suitable for use with `updateConcept()` which accepts partial updates.
 * 
 * @param nodes - React Flow nodes to extract position data from
 * @returns Array of partial Concept objects with `id` and `position` fields
 * 
 * @example
 * ```tsx
 * import { nodesToConcepts } from '@/lib/data'
 * import { useConceptActions } from '@/hooks/useConceptActions'
 * 
 * function ConceptMap() {
 *   const { updateConcept } = useConceptActions()
 *   
 *   const onNodesChange = (changes) => {
 *     // Handle position changes
 *     const positionChanges = changes.filter(c => c.type === 'position')
 *     const concepts = nodesToConcepts(positionChanges.map(c => c.node))
 *     
 *     // Update each concept's position
 *     concepts.forEach(concept => {
 *       updateConcept(concept.id!, { position: concept.position! })
 *     })
 *   }
 * }
 * ```
 */
export function nodesToConcepts(nodes: Node[]): Partial<Concept>[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
  }))
}

/**
 * Convert Comment entities to React Flow nodes.
 * 
 * Transforms domain model comments into React Flow node format for visualization.
 * Each comment becomes a node with position and text content. Comments are rendered
 * as yellow sticky note-style nodes.
 * 
 * **Node Data Structure:**
 * - `id`: Comment ID
 * - `type`: Always `'comment'` (for React Flow node type mapping)
 * - `position`: Comment's x/y coordinates
 * - `data.comment`: Full comment entity
 * - `data.shouldStartEditing`: Flag to trigger edit mode when node is first created
 * 
 * **Filtering:**
 * Comments with empty or whitespace-only IDs are automatically filtered out.
 * 
 * @param comments - Array of comments to convert to nodes
 * @param perspectiveConceptIds - Optional set of concept IDs included in the current perspective (used for filtering)
 * @returns Array of React Flow nodes ready for visualization
 * 
 * @example
 * ```tsx
 * import { commentsToNodes } from '@/lib/data'
 * import { useComments } from '@/hooks/useComments'
 * 
 * function ConceptMap() {
 *   const comments = useComments()
 *   const nodes = commentsToNodes(comments)
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
 */
export function commentsToNodes(
  comments: Comment[],
  _perspectiveConceptIds?: Set<string>
): Node[] {
  return comments
    .filter((comment) => comment.id && comment.id.trim()) // Filter out empty IDs
    .map((comment) => ({
      id: comment.id,
      type: 'comment',
      position: comment.position,
      data: {
        comment,
      },
    }))
}

/**
 * Convert Comment-Concept links to React Flow edges.
 * 
 * Transforms comment-concept associations into React Flow edge format for visualization.
 * Each comment-concept link becomes a dashed bezier edge connecting the comment node
 * to the concept node. Uses centered handles (same approach as Concept-Concept edges).
 * 
 * **Edge Features:**
 * - Uses custom `CommentEdge` component for dashed bezier styling
 * - No arrow markers (unlike Relationship edges)
 * - Uses centered handles (top center for Comment source, bottom center for Concept target)
 * - Only creates edges for visible concepts (respects perspective filtering)
 * 
 * **Edge Data Structure:**
 * - `id`: Generated edge ID (format: `comment-{commentId}-concept-{conceptId}`)
 * - `source`: Comment ID
 * - `target`: Concept ID
 * - `sourceHandle`: Always undefined (uses centered handle)
 * - `targetHandle`: Always undefined (uses centered handle)
 * - `type`: Always `'comment-edge'` (maps to CommentEdge component)
 * - No `markerEnd` (no arrows for comments)
 * 
 * **Filtering:**
 * - Only creates edges if the concept is visible (in perspectiveConceptIds if provided)
 * - Comments with empty IDs or concepts with empty IDs are filtered out
 * 
 * @param comments - Array of comments with conceptIds populated
 * @param concepts - Array of concepts to link to (used for validation and filtering)
 * @param perspectiveConceptIds - Optional set of concept IDs included in the current perspective (used for filtering)
 * @returns Array of React Flow edges ready for visualization
 * 
 * @example
 * ```tsx
 * import { commentsToEdges } from '@/lib/data'
 * import { useComments } from '@/hooks/useComments'
 * import { useConcepts } from '@/hooks/useConcepts'
 * 
 * function ConceptMap() {
 *   const comments = useComments()
 *   const concepts = useConcepts()
 *   const edges = commentsToEdges(comments, concepts)
 *   
 *   return <ReactFlow nodes={nodes} edges={edges} />
 * }
 * ```
 */
export function commentsToEdges(
  comments: Comment[],
  concepts: Concept[],
  perspectiveConceptIds?: Set<string>
): Edge[] {
  // Create a set of valid concept IDs for quick lookup
  const validConceptIds = new Set(concepts.map((c) => c.id))
  
  // Filter comments and concepts with valid IDs
  const validComments = comments.filter(
    (comment) => comment.id && comment.id.trim()
  )
  
  const edges: Edge[] = []
  
  validComments.forEach((comment) => {
    // Only create edges for concepts that are linked to this comment
    comment.conceptIds.forEach((conceptId) => {
      // Skip if concept ID is invalid
      if (!conceptId || !conceptId.trim()) return
      
      // Skip if concept doesn't exist in the concepts array
      if (!validConceptIds.has(conceptId)) return
      
      // If perspective filtering is active, only create edges for visible concepts
      if (perspectiveConceptIds && !perspectiveConceptIds.has(conceptId)) {
        return
      }
      
      // Create edge with centered handles (no specific handle IDs = uses center)
      edges.push({
        id: `comment-${comment.id}-concept-${conceptId}`,
        source: comment.id,
        target: conceptId,
        sourceHandle: undefined, // Uses centered handle
        targetHandle: undefined, // Uses centered handle
        type: 'comment-edge', // Maps to CommentEdge component
        // No markerEnd - comments don't have arrows
      })
    })
  })
  
  return edges
}

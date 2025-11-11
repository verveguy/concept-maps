/**
 * Hook for synchronizing InstantDB data to React Flow nodes and edges.
 * 
 * Provides functionality for:
 * - Transforming domain models (concepts, relationships, comments) to React Flow format
 * - Perspective filtering (shows only selected concepts/relationships)
 * - Efficient updates (only updates when data actually changes)
 * - Comment nodes and edges management
 * - TextView node management
 * 
 * This hook centralizes all data synchronization logic, making it easier to test
 * and maintain.
 */

import { useEffect, useRef } from 'react'
import type { Node, Edge } from 'reactflow'
import type { Concept, Relationship, Comment } from '@/lib/schema'

/**
 * Options for data sync hook.
 */
export interface UseCanvasDataSyncOptions {
  /** Transformed nodes array (concepts + comments + text view) */
  transformedNodes: Node[]
  /** Transformed edges array (relationships + comment edges) */
  transformedEdges: Edge[]
  /** Array of concepts from InstantDB (for change detection) */
  concepts: Concept[]
  /** Array of relationships from InstantDB (for change detection) */
  relationships: Relationship[]
  /** Array of comments from InstantDB (for change detection) */
  comments: Comment[]
  /** Set of concept IDs included in current perspective (undefined if no perspective) */
  perspectiveConceptIds?: Set<string>
  /** Set of relationship IDs included in current perspective (undefined if no perspective) */
  perspectiveRelationshipIds?: Set<string>
  /** Whether currently editing a perspective */
  isEditingPerspective: boolean
  /** Whether text view is visible */
  textViewVisible: boolean
  /** Function to set React Flow nodes */
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void
  /** Function to set React Flow edges */
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void
}

/**
 * Hook for data synchronization.
 * 
 * @param options - Configuration options
 * @returns Object containing transformed nodes and edges
 */
export function useCanvasDataSync(options: UseCanvasDataSyncOptions) {
  const {
    transformedNodes,
    transformedEdges,
    concepts,
    relationships,
    comments,
    perspectiveConceptIds,
    perspectiveRelationshipIds,
    isEditingPerspective,
    textViewVisible,
    setNodes,
    setEdges,
  } = options

  // Track previous data to avoid unnecessary updates
  const prevConceptsRef = useRef(concepts)
  const prevRelationshipsRef = useRef(relationships)
  const prevCommentsRef = useRef(comments)
  const prevCommentEdgesRef = useRef<Edge[]>([])
  const prevTextViewVisibleRef = useRef(textViewVisible)
  const prevPerspectiveConceptIdsRef = useRef<string | undefined>(
    perspectiveConceptIds ? Array.from(perspectiveConceptIds).sort().join(',') : undefined
  )
  const prevPerspectiveRelationshipIdsRef = useRef<string | undefined>(
    perspectiveRelationshipIds ? Array.from(perspectiveRelationshipIds).sort().join(',') : undefined
  )
  const prevIsEditingPerspectiveRef = useRef(isEditingPerspective)

  // Sync nodes when concepts/comments/perspective changes
  useEffect(() => {
    // Only update if concepts actually changed (by ID, position, label, notes, or metadata)
    const conceptsChanged =
      concepts.length !== prevConceptsRef.current.length ||
      concepts.some((c, i) => {
        const prev = prevConceptsRef.current[i]
        if (!prev) return true
        if (c.id !== prev.id) return true
        if (c.position.x !== prev.position.x) return true
        if (c.position.y !== prev.position.y) return true
        if (c.label !== prev.label) return true
        // Check if notes changed
        if ((c.notes || '') !== (prev.notes || '')) return true
        // Check if metadata changed (compare JSON strings)
        const metadataChanged =
          JSON.stringify(c.metadata || {}) !== JSON.stringify(prev.metadata || {})
        return metadataChanged
      })

    // Check if comments changed
    const commentsChanged =
      comments.length !== prevCommentsRef.current.length ||
      comments.some((c, i) => {
        const prev = prevCommentsRef.current[i]
        if (!prev) return true
        if (c.id !== prev.id) return true
        if (c.position.x !== prev.position.x) return true
        if (c.position.y !== prev.position.y) return true
        if (c.text !== prev.text) return true
        return false
      })

    // Check if perspective inclusion state changed
    const currentPerspectiveKey = perspectiveConceptIds
      ? Array.from(perspectiveConceptIds).sort().join(',')
      : undefined
    const perspectiveChanged =
      currentPerspectiveKey !== prevPerspectiveConceptIdsRef.current ||
      isEditingPerspective !== prevIsEditingPerspectiveRef.current

    if (
      conceptsChanged ||
      commentsChanged ||
      perspectiveChanged ||
      textViewVisible !== prevTextViewVisibleRef.current
    ) {
      setNodes(transformedNodes)
      prevConceptsRef.current = concepts
      prevCommentsRef.current = comments
      prevTextViewVisibleRef.current = textViewVisible
      prevPerspectiveConceptIdsRef.current = currentPerspectiveKey
      prevIsEditingPerspectiveRef.current = isEditingPerspective
    }
  }, [
    transformedNodes,
    concepts,
    comments,
    textViewVisible,
    perspectiveConceptIds,
    isEditingPerspective,
    setNodes,
  ])

  // Sync edges when relationships/comments/perspective changes
  useEffect(() => {
    // Extract comment edges from transformed edges for comparison
    const currentCommentEdges = transformedEdges.filter((e) => e.type === 'comment-edge')

    // Only update if relationships actually changed
    const relationshipsChanged =
      relationships.length !== prevRelationshipsRef.current.length ||
      relationships.some((r, i) => {
        const prev = prevRelationshipsRef.current[i]
        if (!prev) return true
        if (r.id !== prev.id) return true
        if (r.fromConceptId !== prev.fromConceptId) return true
        if (r.toConceptId !== prev.toConceptId) return true
        if (r.primaryLabel !== prev.primaryLabel) return true
        if (r.reverseLabel !== prev.reverseLabel) return true
        // Check if metadata changed (compare JSON strings)
        const metadataChanged =
          JSON.stringify(r.metadata || {}) !== JSON.stringify(prev.metadata || {})
        return metadataChanged
      })

    // Check if perspective inclusion state changed for relationships
    const currentPerspectiveRelationshipKey = perspectiveRelationshipIds
      ? Array.from(perspectiveRelationshipIds).sort().join(',')
      : undefined
    const perspectiveRelationshipChanged =
      currentPerspectiveRelationshipKey !== prevPerspectiveRelationshipIdsRef.current ||
      isEditingPerspective !== prevIsEditingPerspectiveRef.current

    // Check if comment edges changed
    const commentEdgesChanged =
      currentCommentEdges.length !== prevCommentEdgesRef.current.length ||
      currentCommentEdges.some((edge, i) => {
        const prev = prevCommentEdgesRef.current[i]
        if (!prev) return true
        if (edge.id !== prev.id) return true
        if (edge.source !== prev.source) return true
        if (edge.target !== prev.target) return true
        return false
      })

    if (relationshipsChanged || perspectiveRelationshipChanged || commentEdgesChanged) {
      setEdges(transformedEdges)
      prevRelationshipsRef.current = relationships
      prevCommentsRef.current = comments
      prevCommentEdgesRef.current = currentCommentEdges
      prevPerspectiveRelationshipIdsRef.current = currentPerspectiveRelationshipKey
      prevIsEditingPerspectiveRef.current = isEditingPerspective
    }
  }, [
    transformedEdges,
    relationships,
    comments,
    perspectiveRelationshipIds,
    isEditingPerspective,
    setEdges,
  ])
}


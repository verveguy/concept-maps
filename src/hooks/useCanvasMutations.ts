/**
 * Hook for canvas mutations with undo tracking.
 * Wraps all database mutations to enable undo/redo functionality.
 * 
 * This hook provides a centralized mutation interface that:
 * - Records all mutations for undo
 * - Groups related mutations into operations
 * - Provides consistent error handling
 * - Enables future undo/redo implementation
 */

import { useCallback } from 'react'
import { useConceptActions } from '@/hooks/useConceptActions'
import { useRelationshipActions } from '@/hooks/useRelationshipActions'
import { useCommentActions } from '@/hooks/useCommentActions'
import { useUndo } from '@/hooks/useUndo'
import { db, tx, id } from '@/lib/instant'
import type { CreateConceptData, UpdateConceptData } from '@/hooks/useConceptActions'
import type { CreateRelationshipData, UpdateRelationshipData } from '@/hooks/useRelationshipActions'
import type { CreateCommentData, UpdateCommentData } from '@/hooks/useCommentActions'

/**
 * Hook for canvas mutations with undo tracking.
 * 
 * Wraps all database mutations to enable undo/redo functionality.
 * All mutations are recorded and can be undone later.
 * 
 * **Mutation Recording:**
 * - Deletions are automatically recorded for undo
 * - Mutations can be grouped into operations
 * - Operations can be undone as a unit
 * 
 * **Usage:**
 * ```tsx
 * const { createConcept, updateConcept, deleteConcept } = useCanvasMutations()
 * 
 * // Create a concept (recorded for undo)
 * await createConcept({ mapId, label, position })
 * 
 * // Update a concept
 * await updateConcept(conceptId, { label: 'New Label' })
 * 
 * // Delete a concept (automatically recorded for undo)
 * await deleteConcept(conceptId)
 * ```
 */
export function useCanvasMutations() {
  const {
    createConcept: createConceptAction,
    updateConcept: updateConceptAction,
    deleteConcept: deleteConceptAction,
  } = useConceptActions()
  
  const {
    createRelationship: createRelationshipAction,
    updateRelationship: updateRelationshipAction,
    deleteRelationship: deleteRelationshipAction,
  } = useRelationshipActions()
  
  const {
    createComment: createCommentAction,
    updateComment: updateCommentAction,
    deleteComment: deleteCommentAction,
    linkCommentToConcept: linkCommentToConceptAction,
    unlinkCommentFromConcept: unlinkCommentFromConceptAction,
  } = useCommentActions()
  
  const { recordDeletion, startOperation, endOperation } = useUndo()

  /**
   * Create a new concept.
   * 
   * @param concept - Concept data to create
   */
  const createConcept = useCallback(
    async (concept: CreateConceptData) => {
      return createConceptAction(concept)
    },
    [createConceptAction]
  )

  /**
   * Update an existing concept.
   * 
   * @param conceptId - ID of the concept to update
   * @param updates - Partial concept data to update
   */
  const updateConcept = useCallback(
    async (conceptId: string, updates: UpdateConceptData) => {
      return updateConceptAction(conceptId, updates)
    },
    [updateConceptAction]
  )

  /**
   * Delete a concept (soft delete).
   * Automatically recorded for undo.
   * 
   * @param conceptId - ID of the concept to delete
   */
  const deleteConcept = useCallback(
    async (conceptId: string) => {
      recordDeletion('concept', conceptId)
      return deleteConceptAction(conceptId)
    },
    [deleteConceptAction, recordDeletion]
  )

  /**
   * Create a new relationship.
   * 
   * @param relationship - Relationship data to create
   */
  const createRelationship = useCallback(
    async (relationship: CreateRelationshipData) => {
      return createRelationshipAction(relationship)
    },
    [createRelationshipAction]
  )

  /**
   * Update an existing relationship.
   * 
   * @param relationshipId - ID of the relationship to update
   * @param updates - Partial relationship data to update
   */
  const updateRelationship = useCallback(
    async (relationshipId: string, updates: UpdateRelationshipData) => {
      return updateRelationshipAction(relationshipId, updates)
    },
    [updateRelationshipAction]
  )

  /**
   * Delete a relationship (soft delete).
   * Automatically recorded for undo.
   * 
   * @param relationshipId - ID of the relationship to delete
   */
  const deleteRelationship = useCallback(
    async (relationshipId: string) => {
      recordDeletion('relationship', relationshipId)
      return deleteRelationshipAction(relationshipId)
    },
    [deleteRelationshipAction, recordDeletion]
  )

  /**
   * Create a new comment.
   * 
   * @param comment - Comment data to create
   */
  const createComment = useCallback(
    async (comment: CreateCommentData) => {
      return createCommentAction(comment)
    },
    [createCommentAction]
  )

  /**
   * Update an existing comment.
   * 
   * @param commentId - ID of the comment to update
   * @param updates - Partial comment data to update
   */
  const updateComment = useCallback(
    async (commentId: string, updates: UpdateCommentData) => {
      return updateCommentAction(commentId, updates)
    },
    [updateCommentAction]
  )

  /**
   * Delete a comment (soft delete).
   * Automatically recorded for undo.
   * 
   * @param commentId - ID of the comment to delete
   */
  const deleteComment = useCallback(
    async (commentId: string) => {
      recordDeletion('comment', commentId)
      return deleteCommentAction(commentId)
    },
    [deleteCommentAction, recordDeletion]
  )

  /**
   * Link a comment to a concept.
   * 
   * @param commentId - ID of the comment
   * @param conceptId - ID of the concept
   */
  const linkCommentToConcept = useCallback(
    async (commentId: string, conceptId: string) => {
      return linkCommentToConceptAction(commentId, conceptId)
    },
    [linkCommentToConceptAction]
  )

  /**
   * Unlink a comment from a concept.
   * 
   * @param commentId - ID of the comment
   * @param conceptId - ID of the concept
   */
  const unlinkCommentFromConcept = useCallback(
    async (commentId: string, conceptId: string) => {
      return unlinkCommentFromConceptAction(commentId, conceptId)
    },
    [unlinkCommentFromConceptAction]
  )

  /**
   * Create a concept and relationship together in a single transaction.
   * Useful for drag-to-create scenarios.
   * 
   * @param conceptData - Concept data
   * @param relationshipData - Relationship data (with fromConceptId and toConceptId)
   * @returns Object with created concept and relationship IDs
   */
  const createConceptWithRelationship = useCallback(
    async (
      conceptData: Omit<CreateConceptData, 'mapId'> & { mapId: string },
      relationshipData: {
        fromConceptId: string
        toConceptId: string
        primaryLabel?: string
        reverseLabel?: string
        notes?: string
        metadata?: Record<string, unknown>
      }
    ) => {
      const newConceptId = id()
      const newRelationshipId = id()

      await db.transact([
        // Create the concept
        tx.concepts[newConceptId]
          .update({
            label: conceptData.label,
            positionX: conceptData.position.x,
            positionY: conceptData.position.y,
            notes: conceptData.notes || '',
            metadata: JSON.stringify(conceptData.metadata || {}),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          .link({ map: conceptData.mapId }),
        // Create the relationship
        tx.relationships[newRelationshipId]
          .update({
            primaryLabel: relationshipData.primaryLabel || 'related to',
            reverseLabel: relationshipData.reverseLabel || relationshipData.primaryLabel || 'related from',
            notes: relationshipData.notes || '',
            metadata: JSON.stringify(relationshipData.metadata || {}),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          .link({
            map: conceptData.mapId,
            fromConcept: relationshipData.fromConceptId,
            toConcept: relationshipData.toConceptId,
          }),
      ])

      return {
        conceptId: newConceptId,
        relationshipId: newRelationshipId,
      }
    },
    []
  )

  return {
    // Concept mutations
    createConcept,
    updateConcept,
    deleteConcept,
    
    // Relationship mutations
    createRelationship,
    updateRelationship,
    deleteRelationship,
    
    // Comment mutations
    createComment,
    updateComment,
    deleteComment,
    linkCommentToConcept,
    unlinkCommentFromConcept,
    
    // Combined mutations
    createConceptWithRelationship,
    
    // Operation management
    startOperation,
    endOperation,
  }
}

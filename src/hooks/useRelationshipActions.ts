/**
 * Hook for relationship CRUD operations.
 * Provides actions for creating, updating, and deleting relationships.
 * Uses db.transact() with tx objects for all mutations.
 */

import { db, tx, id } from '@/lib/instant'

/**
 * Data structure for creating a new relationship.
 */
export interface CreateRelationshipData {
  /** Map ID this relationship belongs to */
  mapId: string
  /** Source concept ID */
  fromConceptId: string
  /** Target concept ID */
  toConceptId: string
  /** Primary label (direction: from -> to) */
  primaryLabel: string
  /** Reverse label (direction: to -> from), defaults to primaryLabel */
  reverseLabel?: string
  /** Optional markdown notes */
  notes?: string
  /** Optional metadata as key-value pairs */
  metadata?: Record<string, unknown>
}

/**
 * Data structure for updating a relationship.
 */
export interface UpdateRelationshipData {
  /** New primary label */
  primaryLabel?: string
  /** New reverse label */
  reverseLabel?: string
  /** New markdown notes */
  notes?: string
  /** New metadata */
  metadata?: Record<string, unknown>
}

/**
 * Hook for relationship CRUD operations.
 * Uses db.transact() with tx objects for all mutations.
 * 
 * @returns Object containing createRelationship, updateRelationship, and deleteRelationship functions
 */
export function useRelationshipActions() {
  /**
   * Create a new relationship.
   * 
   * @param relationship - Relationship data to create
   */
  const createRelationship = async (relationship: CreateRelationshipData) => {
    const relationshipId = id()
    await db.transact([
      tx.relationships[relationshipId]
        .update({
          primaryLabel: relationship.primaryLabel,
          reverseLabel: relationship.reverseLabel || relationship.primaryLabel,
          notes: relationship.notes || '',
          metadata: JSON.stringify(relationship.metadata || {}),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({
          map: relationship.mapId,
          fromConcept: relationship.fromConceptId,
          toConcept: relationship.toConceptId,
        }),
    ])
  }

  /**
   * Update an existing relationship.
   * 
   * @param relationshipId - ID of the relationship to update
   * @param updates - Partial relationship data to update
   */
  const updateRelationship = async (
    relationshipId: string,
    updates: UpdateRelationshipData
  ) => {
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (updates.primaryLabel !== undefined)
      updateData.primaryLabel = updates.primaryLabel
    if (updates.reverseLabel !== undefined)
      updateData.reverseLabel = updates.reverseLabel
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.metadata !== undefined) {
      updateData.metadata = JSON.stringify(updates.metadata)
    }

    await db.transact([tx.relationships[relationshipId].update(updateData)])
  }

  /**
   * Delete a relationship.
   * 
   * @param relationshipId - ID of the relationship to delete
   */
  const deleteRelationship = async (relationshipId: string) => {
    await db.transact([tx.relationships[relationshipId].delete()])
  }

  return {
    createRelationship,
    updateRelationship,
    deleteRelationship,
  }
}

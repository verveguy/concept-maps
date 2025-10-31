import { db, tx, id } from '@/lib/instant'

/**
 * Hook for relationship CRUD operations
 * Uses db.transact() with tx objects for all mutations
 */
export function useRelationshipActions() {
  const createRelationship = async (relationship: {
    mapId: string
    fromConceptId: string
    toConceptId: string
    primaryLabel: string
    reverseLabel?: string
    notes?: string
    metadata?: Record<string, unknown>
  }) => {
    await db.transact([
      tx.relationships[id()].update({
        mapId: relationship.mapId,
        fromConceptId: relationship.fromConceptId,
        toConceptId: relationship.toConceptId,
        primaryLabel: relationship.primaryLabel,
        reverseLabel: relationship.reverseLabel || relationship.primaryLabel,
        notes: relationship.notes || '',
        metadata: JSON.stringify(relationship.metadata || {}),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ])
  }

  const updateRelationship = async (
    relationshipId: string,
    updates: {
      primaryLabel?: string
      reverseLabel?: string
      notes?: string
      metadata?: Record<string, unknown>
    }
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

  const deleteRelationship = async (relationshipId: string) => {
    await db.transact([tx.relationships[relationshipId].delete()])
  }

  return {
    createRelationship,
    updateRelationship,
    deleteRelationship,
  }
}

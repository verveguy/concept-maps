import { db, tx, id } from '@/lib/instant'

/**
 * Hook for concept CRUD operations
 * Uses db.transact() with tx objects for all mutations
 */
export function useConceptActions() {
  const createConcept = async (concept: {
    mapId: string
    label: string
    position: { x: number; y: number }
    notes?: string
    metadata?: Record<string, unknown>
  }) => {
    await db.transact([
      tx.concepts[id()].update({
        mapId: concept.mapId,
        label: concept.label,
        positionX: concept.position.x,
        positionY: concept.position.y,
        notes: concept.notes || '',
        metadata: JSON.stringify(concept.metadata || {}),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ])
  }

  const updateConcept = async (
    conceptId: string,
    updates: {
      label?: string
      position?: { x: number; y: number }
      notes?: string
      metadata?: Record<string, unknown>
    }
  ) => {
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (updates.label !== undefined) updateData.label = updates.label
    if (updates.position !== undefined) {
      updateData.positionX = updates.position.x
      updateData.positionY = updates.position.y
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.metadata !== undefined) {
      updateData.metadata = JSON.stringify(updates.metadata)
    }

    await db.transact([tx.concepts[conceptId].update(updateData)])
  }

  const deleteConcept = async (conceptId: string) => {
    await db.transact([tx.concepts[conceptId].delete()])
  }

  return {
    createConcept,
    updateConcept,
    deleteConcept,
  }
}

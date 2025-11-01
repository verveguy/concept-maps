/**
 * Hook for concept CRUD operations.
 * Provides actions for creating, updating, and deleting concepts.
 * Uses db.transact() with tx objects for all mutations.
 */

import { db, tx, id } from '@/lib/instant'

/**
 * Data structure for creating a new concept.
 */
export interface CreateConceptData {
  /** Map ID this concept belongs to */
  mapId: string
  /** Display label for the concept */
  label: string
  /** Position coordinates on the canvas */
  position: { x: number; y: number }
  /** Optional markdown notes */
  notes?: string
  /** Optional metadata as key-value pairs */
  metadata?: Record<string, unknown>
}

/**
 * Data structure for updating a concept.
 */
export interface UpdateConceptData {
  /** New display label */
  label?: string
  /** New position coordinates */
  position?: { x: number; y: number }
  /** New markdown notes */
  notes?: string
  /** New metadata */
  metadata?: Record<string, unknown>
}

/**
 * Hook for concept CRUD operations.
 * Uses db.transact() with tx objects for all mutations.
 * 
 * @returns Object containing createConcept, updateConcept, and deleteConcept functions
 */
export function useConceptActions() {
  /**
   * Create a new concept.
   * 
   * @param concept - Concept data to create
   */
  const createConcept = async (concept: CreateConceptData) => {
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

  /**
   * Update an existing concept.
   * 
   * @param conceptId - ID of the concept to update
   * @param updates - Partial concept data to update
   */
  const updateConcept = async (
    conceptId: string,
    updates: UpdateConceptData
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

  /**
   * Delete a concept.
   * 
   * @param conceptId - ID of the concept to delete
   */
  const deleteConcept = async (conceptId: string) => {
    await db.transact([tx.concepts[conceptId].delete()])
  }

  return {
    createConcept,
    updateConcept,
    deleteConcept,
  }
}

/**
 * Hook for perspective CRUD operations.
 * Provides actions for creating, updating, and deleting perspectives.
 * Uses db.transact() with tx objects for all mutations.
 */

import { db, tx, id } from '@/lib/instant'

/**
 * Data structure for creating a new perspective.
 */
export interface CreatePerspectiveData {
  /** Map ID this perspective belongs to */
  mapId: string
  /** Name of the perspective */
  name: string
  /** Optional array of concept IDs to include */
  conceptIds?: string[]
  /** Optional array of relationship IDs to include */
  relationshipIds?: string[]
}

/**
 * Data structure for updating a perspective.
 */
export interface UpdatePerspectiveData {
  /** New name */
  name?: string
  /** New array of concept IDs */
  conceptIds?: string[]
  /** New array of relationship IDs */
  relationshipIds?: string[]
}

/**
 * Hook for perspective CRUD operations.
 * Uses db.transact() with tx objects for all mutations.
 * 
 * @returns Object containing perspective management functions
 */
export function usePerspectiveActions() {
  const auth = db.useAuth()

  /**
   * Create a new perspective.
   * 
   * @param perspective - Perspective data to create
   * @throws Error if user is not authenticated
   */
  const createPerspective = async (perspective: CreatePerspectiveData) => {
    if (!auth.user?.id) throw new Error('User must be authenticated')

    const perspectiveId = id()
    await db.transact([
      tx.perspectives[perspectiveId]
        .update({
          name: perspective.name,
          conceptIds: JSON.stringify(perspective.conceptIds || []),
          relationshipIds: JSON.stringify(perspective.relationshipIds || []),
          createdAt: Date.now(),
        })
        .link({
          map: perspective.mapId,
          creator: auth.user.id,
        }),
    ])
  }

  /**
   * Update an existing perspective.
   * 
   * @param perspectiveId - ID of the perspective to update
   * @param updates - Partial perspective data to update
   */
  const updatePerspective = async (
    perspectiveId: string,
    updates: UpdatePerspectiveData
  ) => {
    const updateData: Record<string, unknown> = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.conceptIds !== undefined) {
      updateData.conceptIds = JSON.stringify(updates.conceptIds)
    }
    if (updates.relationshipIds !== undefined) {
      updateData.relationshipIds = JSON.stringify(updates.relationshipIds)
    }

    await db.transact([tx.perspectives[perspectiveId].update(updateData)])
  }

  /**
   * Delete a perspective.
   * 
   * @param perspectiveId - ID of the perspective to delete
   */
  const deletePerspective = async (perspectiveId: string) => {
    await db.transact([tx.perspectives[perspectiveId].delete()])
  }

  /**
   * Toggle a concept's inclusion in a perspective.
   * Reads current perspective state, toggles concept, and updates InstantDB.
   * Also handles relationship cleanup (removes relationships if concept is removed).
   * 
   * @param perspectiveId - ID of the perspective to update
   * @param conceptId - ID of the concept to toggle
   * @param currentConceptIds - Current array of concept IDs in the perspective
   * @param currentRelationshipIds - Current array of relationship IDs in the perspective
   * @param allRelationships - All relationships in the map (for cleanup)
   */
  const toggleConceptInPerspective = async (
    perspectiveId: string,
    conceptId: string,
    currentConceptIds: string[],
    currentRelationshipIds: string[],
    allRelationships: Array<{ id: string; fromConceptId: string; toConceptId: string }>
  ) => {
    const isIncluded = currentConceptIds.includes(conceptId)
    let newConceptIds: string[]
    let newRelationshipIds: string[]

    if (isIncluded) {
      // Remove concept
      newConceptIds = currentConceptIds.filter((id) => id !== conceptId)
      
      // Also remove all relationships involving this concept
      const relationshipsToRemove = new Set<string>()
      allRelationships.forEach((rel) => {
        if (rel.fromConceptId === conceptId || rel.toConceptId === conceptId) {
          relationshipsToRemove.add(rel.id)
        }
      })
      
      // Remove affected relationships from perspective
      newRelationshipIds = currentRelationshipIds.filter(
        (id: string) => !relationshipsToRemove.has(id)
      )
    } else {
      // Add concept
      newConceptIds = [...currentConceptIds, conceptId]
      
      // Auto-add relationships where both concepts are now selected
      const relationshipsToAdd = new Set<string>(currentRelationshipIds)
      allRelationships.forEach((rel) => {
        if (
          (rel.fromConceptId === conceptId && newConceptIds.includes(rel.toConceptId)) ||
          (rel.toConceptId === conceptId && newConceptIds.includes(rel.fromConceptId))
        ) {
          relationshipsToAdd.add(rel.id)
        }
      })
      newRelationshipIds = Array.from(relationshipsToAdd)
    }

    await db.transact([
      tx.perspectives[perspectiveId].update({
        conceptIds: JSON.stringify(newConceptIds),
        relationshipIds: JSON.stringify(newRelationshipIds),
      }),
    ])
  }

  /**
   * Toggle a relationship's inclusion in a perspective.
   * Reads current perspective state, toggles relationship, and updates InstantDB.
   * 
   * @param perspectiveId - ID of the perspective to update
   * @param relationshipId - ID of the relationship to toggle
   * @param currentRelationshipIds - Current array of relationship IDs in the perspective
   */
  const toggleRelationshipInPerspective = async (
    perspectiveId: string,
    relationshipId: string,
    currentRelationshipIds: string[]
  ) => {
    const isIncluded = currentRelationshipIds.includes(relationshipId)
    const newRelationshipIds = isIncluded
      ? currentRelationshipIds.filter((id) => id !== relationshipId)
      : [...currentRelationshipIds, relationshipId]

    await db.transact([
      tx.perspectives[perspectiveId].update({
        relationshipIds: JSON.stringify(newRelationshipIds),
      }),
    ])
  }

  return {
    createPerspective,
    updatePerspective,
    deletePerspective,
    toggleConceptInPerspective,
    toggleRelationshipInPerspective,
  }
}

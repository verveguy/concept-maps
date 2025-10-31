import { db, tx, id } from '@/lib/instant'

/**
 * Hook for perspective CRUD operations
 * Uses db.transact() with tx objects for all mutations
 */
export function usePerspectiveActions() {
  const auth = db.useAuth()

  const createPerspective = async (perspective: {
    mapId: string
    name: string
    conceptIds?: string[]
    relationshipIds?: string[]
  }) => {
    if (!auth.user?.id) throw new Error('User must be authenticated')

    await db.transact([
      tx.perspectives[id()].update({
        mapId: perspective.mapId,
        name: perspective.name,
        conceptIds: JSON.stringify(perspective.conceptIds || []),
        relationshipIds: JSON.stringify(perspective.relationshipIds || []),
        createdBy: auth.user.id,
        createdAt: Date.now(),
      }),
    ])
  }

  const updatePerspective = async (
    perspectiveId: string,
    updates: {
      name?: string
      conceptIds?: string[]
      relationshipIds?: string[]
    }
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

  const deletePerspective = async (perspectiveId: string) => {
    await db.transact([tx.perspectives[perspectiveId].delete()])
  }

  /**
   * Toggle a concept's inclusion in a perspective
   * Reads current perspective state, toggles concept, and updates InstantDB
   * Also handles relationship cleanup (removes relationships if concept is removed)
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
   * Toggle a relationship's inclusion in a perspective
   * Reads current perspective state, toggles relationship, and updates InstantDB
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

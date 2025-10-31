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

  return {
    createPerspective,
    updatePerspective,
    deletePerspective,
  }
}

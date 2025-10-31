import { db, tx, id } from '@/lib/instant'

/**
 * Hook for map CRUD operations
 * Uses db.transact() with tx objects for all mutations
 */
export function useMapActions() {
  const auth = db.useAuth()

  const createMap = async (name: string) => {
    if (!auth.user?.id) throw new Error('User must be authenticated')

    await db.transact([
      tx.maps[id()].update({
        name,
        createdBy: auth.user.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ])
  }

  const updateMap = async (mapId: string, updates: { name?: string }) => {
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (updates.name !== undefined) updateData.name = updates.name

    await db.transact([tx.maps[mapId].update(updateData)])
  }

  const deleteMap = async (mapId: string) => {
    await db.transact([tx.maps[mapId].delete()])
  }

  return {
    createMap,
    updateMap,
    deleteMap,
  }
}

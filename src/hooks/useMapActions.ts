/**
 * Hook for map CRUD operations.
 * Provides actions for creating, updating, and deleting maps.
 * Uses db.transact() with tx objects for all mutations.
 */

import { db, tx, id } from '@/lib/instant'

/**
 * Hook for map CRUD operations.
 * 
 * Provides functions to create, update, and delete concept maps in InstantDB.
 * All mutations use `db.transact()` with transaction objects for atomic operations.
 * 
 * **Operations:**
 * - `createMap`: Creates a new map with a name and links it to the current user as creator
 * - `updateMap`: Updates existing map properties (currently only supports name updates)
 * - `deleteMap`: Soft-deletes a map by setting `deletedAt` timestamp
 * 
 * **Map Ownership:**
 * Maps are owned by the user who creates them. The creator automatically has
 * full read/write access. Other users can be granted access via the sharing system.
 * 
 * **Transaction Safety:**
 * All operations are performed within InstantDB transactions, ensuring data
 * consistency and atomicity. If any part of a transaction fails, the entire
 * operation is rolled back.
 * 
 * @returns Object containing map mutation functions:
 * - `createMap`: Create a new map
 * - `updateMap`: Update an existing map
 * - `deleteMap`: Soft-delete a map
 * 
 * @example
 * ```tsx
 * import { useMapActions } from '@/hooks/useMapActions'
 * 
 * function MapCreator() {
 *   const { createMap } = useMapActions()
 *   
 *   const handleCreate = async () => {
 *     await createMap('My New Map')
 *   }
 *   
 *   return <button onClick={handleCreate}>Create Map</button>
 * }
 * ```
 */
export function useMapActions() {
  const auth = db.useAuth()

  /**
   * Create a new concept map.
   * 
   * Creates a map with the provided name and links it to the authenticated user
   * as the creator. The map ID is automatically generated. Timestamps (`createdAt`,
   * `updatedAt`) are set to the current time.
   * 
   * **Permissions:**
   * The creator automatically becomes the map owner with full read/write access.
   * Other users can be granted access via the sharing system.
   * 
   * @param name - Display name for the new map
   * 
   * @throws Error if user is not authenticated or the transaction fails
   * 
   * @example
   * ```tsx
   * const { createMap } = useMapActions()
   * 
   * const handleCreate = async () => {
   *   const mapName = prompt('Enter map name:')
   *   if (mapName) {
   *     await createMap(mapName)
   *   }
   * }
   * ```
   */
  const createMap = async (name: string) => {
    if (!auth.user?.id) throw new Error('User must be authenticated')

    const mapId = id()
    await db.transact([
      tx.maps[mapId]
        .update({
          name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({ creator: auth.user.id }),
    ])
  }

  /**
   * Update an existing map.
   * 
   * Performs a partial update on a map. Currently only supports updating the
   * map name. The `updatedAt` timestamp is automatically set to the current time.
   * 
   * **Supported Updates:**
   * - `name`: Change the map's display name
   * 
   * @param mapId - ID of the map to update
   * @param updates - Partial map data to update
   * @param updates.name - New display name (optional)
   * 
   * @throws Error if the map doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { updateMap } = useMapActions()
   * 
   * // Update the map name
   * await updateMap(mapId, { name: 'Updated Map Name' })
   * ```
   */
  const updateMap = async (mapId: string, updates: { name?: string }) => {
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (updates.name !== undefined) updateData.name = updates.name

    await db.transact([tx.maps[mapId].update(updateData)])
  }

  /**
   * Delete a map (soft delete).
   * 
   * Performs a soft delete by setting the `deletedAt` timestamp. The map record
   * remains in the database but is excluded from normal queries. This allows
   * for undo functionality and audit trails.
   * 
   * **Soft Delete Behavior:**
   * - Map is marked as deleted with `deletedAt` timestamp
   * - Map is automatically excluded from `useMaps()` queries
   * - Map can be permanently deleted via trash management
   * - All concepts and relationships in the map remain accessible until permanently deleted
   * 
   * **Note:** Uses `merge()` instead of `update()` to handle optional fields
   * and avoid schema conflicts.
   * 
   * @param mapId - ID of the map to soft-delete
   * 
   * @throws Error if the map doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { deleteMap } = useMapActions()
   * 
   * const handleDelete = async () => {
   *   if (confirm('Delete this map? This will also delete all concepts and relationships.')) {
   *     await deleteMap(mapId)
   *   }
   * }
   * ```
   */
  const deleteMap = async (mapId: string) => {
    await db.transact([
      tx.maps[mapId].merge({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ])
  }

  return {
    createMap,
    updateMap,
    deleteMap,
  }
}

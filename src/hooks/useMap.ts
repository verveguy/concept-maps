/**
 * Hook for querying the current map from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'

/**
 * Hook to get the current map data.
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Automatically queries
 * the map based on the current map ID from the map store. Includes permission
 * links (creator, readPermissions, writePermissions) for access control checks.
 * 
 * **Real-time Updates:**
 * The hook subscribes to real-time updates, so the returned map object will
 * automatically update when the map is modified by any user with access.
 * 
 * **Access Control:**
 * If a user doesn't have permission to view a map, InstantDB will filter it out
 * and the hook will return `null`. Use `isLoading` to distinguish between
 * "still loading" and "no access/doesn't exist".
 * 
 * **Return Value:**
 * Returns an object containing:
 * - `map`: The current map entity object, or `null` if no map is selected or user lacks access
 * - `isLoading`: Whether the query is still loading
 * 
 * @returns Object with `map` and `isLoading` properties
 * 
 * @example
 * ```tsx
 * import { useMap } from '@/hooks/useMap'
 * 
 * function MapHeader() {
 *   const { map, isLoading } = useMap()
 *   
 *   if (isLoading) {
 *     return <div>Loading...</div>
 *   }
 *   
 *   if (!map) {
 *     return <div>No map selected</div>
 *   }
 *   
 *   return <h1>{map.name}</h1>
 * }
 * ```
 */
export function useMap() {
  const currentMapId = useMapStore((state) => state.currentMapId)

  const { data, isLoading } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            creator: {},
            writePermissions: {},
            readPermissions: {},
          },
        }
      : null
  )

  return {
    map: data?.maps?.[0] || null,
    isLoading,
  }
}

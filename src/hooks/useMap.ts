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
 * **Return Value:**
 * Returns the map entity object if a map is selected, or `null` if no map
 * is currently selected. The map object includes:
 * - Basic map properties (id, name, timestamps)
 * - Creator link (for ownership checks)
 * - Permission links (for access control)
 * 
 * @returns The current map entity object, or `null` if no map is selected
 * 
 * @example
 * ```tsx
 * import { useMap } from '@/hooks/useMap'
 * 
 * function MapHeader() {
 *   const map = useMap()
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

  const { data } = db.useQuery(
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

  return data?.maps?.[0] || null
}

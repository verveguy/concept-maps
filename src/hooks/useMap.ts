/**
 * Hook for querying the current map from InstantDB.
 * Provides reactive data fetching with real-time updates.
 * Supports share tokens via rulesParams for shared access.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { useShareToken } from './useShareToken'

/**
 * Hook to get the current map data.
 * Uses InstantDB useQuery() for real-time updates.
 * Passes shareToken via rulesParams for permission checks.
 * 
 * @returns The current map entity, or null if no map is selected
 */
export function useMap() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  const shareToken = useShareToken()

  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
          },
        }
      : null,
    shareToken ? { shareToken } : undefined
  )

  return data?.maps?.[0] || null
}

/**
 * Hook for querying perspectives from InstantDB.
 * Provides reactive data fetching with real-time updates.
 * Supports share tokens via rulesParams for shared access.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Perspective } from '@/lib/schema'
import { useShareToken } from './useShareToken'

/**
 * Hook to get perspectives for the current map.
 * Uses InstantDB useQuery() for real-time updates.
 * Passes shareToken via rulesParams for permission checks.
 * 
 * @returns Array of perspectives for the current map
 */
export function usePerspectives() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  const shareToken = useShareToken()

  const { data } = db.useQuery(
    currentMapId
      ? {
          perspectives: {
            $: { where: { mapId: currentMapId } },
          },
        }
      : null,
    shareToken ? { rulesParams: { shareToken } } : undefined
  )

  // Transform InstantDB data to schema format
  const perspectives: Perspective[] =
    data?.perspectives?.map((p: any) => ({
      id: p.id,
      mapId: p.mapId,
      name: p.name,
      conceptIds: p.conceptIds ? JSON.parse(p.conceptIds) : [],
      relationshipIds: p.relationshipIds ? JSON.parse(p.relationshipIds) : [],
      createdBy: p.createdBy,
      createdAt: new Date(p.createdAt),
    })) || []

  return perspectives
}

/**
 * Hook for querying perspectives from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Perspective } from '@/lib/schema'

/**
 * Hook to get perspectives for the current map.
 * Uses InstantDB useQuery() for real-time updates.
 * 
 * @returns Array of perspectives for the current map
 */
export function usePerspectives() {
  const currentMapId = useMapStore((state) => state.currentMapId)

  const { data } = db.useQuery(
    currentMapId
      ? {
          perspectives: {
            $: { where: { mapId: currentMapId } },
          },
        }
      : null
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

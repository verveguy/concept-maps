import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'

/**
 * Hook to get the current map data
 * Uses InstantDB useQuery() for real-time updates
 */
export function useMap() {
  const currentMapId = useMapStore((state) => state.currentMapId)

  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
          },
        }
      : null
  )

  return data?.maps?.[0] || null
}

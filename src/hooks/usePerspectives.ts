/**
 * Hook for querying perspectives from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Perspective } from '@/lib/schema'

/**
 * Hook to get perspectives for the current map.
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Automatically queries
 * perspectives based on the current map ID from the map store.
 * 
 * **Perspective Structure:**
 * Each perspective contains:
 * - `id`: Unique perspective identifier
 * - `mapId`: ID of the map this perspective belongs to
 * - `name`: Display name for the perspective
 * - `conceptIds`: Array of concept IDs included in this perspective
 * - `relationshipIds`: Array of relationship IDs included in this perspective
 * - `createdBy`: ID of the user who created the perspective
 * - `createdAt`: Timestamp when the perspective was created
 * 
 * **Real-time Updates:**
 * The hook subscribes to real-time updates, so the returned array will
 * automatically update when perspectives are created, modified, or deleted.
 * 
 * @returns Array of perspectives for the current map
 * 
 * @example
 * ```tsx
 * import { usePerspectives } from '@/hooks/usePerspectives'
 * 
 * function PerspectiveList() {
 *   const perspectives = usePerspectives()
 *   
 *   return (
 *     <ul>
 *       {perspectives.map(perspective => (
 *         <li key={perspective.id}>
 *           {perspective.name} ({perspective.conceptIds.length} concepts)
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function usePerspectives() {
  const currentMapId = useMapStore((state) => state.currentMapId)

  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            perspectives: {
              map: {},
              creator: {},
            },
          },
        }
      : null
  )

  // Transform InstantDB data to schema format
  const perspectives: Perspective[] =
    data?.maps?.[0]?.perspectives?.map((p: any) => ({
      id: p.id,
      mapId: p.map?.id || currentMapId || '',
      name: p.name,
      conceptIds: p.conceptIds ? JSON.parse(p.conceptIds) : [],
      relationshipIds: p.relationshipIds ? JSON.parse(p.relationshipIds) : [],
      createdBy: p.creator?.id || '',
      createdAt: new Date(p.createdAt),
    })) || []

  return perspectives
}

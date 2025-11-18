/**
 * Hook for querying maps from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMemo } from 'react'
import type { Map } from '@/lib/schema'

/**
 * Categorize maps into owned vs shared maps.
 * 
 * @param maps - Array of maps to categorize
 * @param userId - Current user ID
 * @param sharedMapIds - Set of map IDs that are shared with the user
 * @returns Object with ownedMaps and sharedMaps arrays
 */
export function categorizeMaps(maps: Map[], userId: string | null, sharedMapIds: Set<string>) {
  const ownedMaps: Map[] = []
  const sharedMaps: Map[] = []
  
  for (const map of maps) {
    if (map.createdBy === userId) {
      ownedMaps.push(map)
    } else if (sharedMapIds.has(map.id)) {
      sharedMaps.push(map)
    }
  }
  
  return { ownedMaps, sharedMaps }
}

/**
 * Hook to get all maps accessible to the current user.
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Automatically filters
 * results to only maps the user can view based on permissions:
 * - Maps created by the user (ownership)
 * - Maps shared with the user via shares or invitations
 * 
 * **Permission Filtering:**
 * InstantDB permissions automatically filter query results. The user will only
 * see maps they have read or write access to. No manual filtering is required.
 * 
 * **Soft Deletes:**
 * Soft-deleted maps (with `deletedAt` set) are automatically excluded from
 * the results.
 * 
 * **Real-time Updates:**
 * The hook subscribes to real-time updates, so the returned array will
 * automatically update when maps are created, modified, or shared.
 * 
 * @returns Array of maps created by or shared with the authenticated user
 * 
 * @example
 * ```tsx
 * import { useMaps } from '@/hooks/useMaps'
 * 
 * function MapList() {
 *   const maps = useMaps()
 *   
 *   return (
 *     <ul>
 *       {maps.map(map => (
 *         <li key={map.id}>{map.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useMaps() {
  const auth = db.useAuth()
  const userId = auth.user?.id

  // Query maps directly - permissions will automatically filter to only maps
  // the user can view (owned or shared with them via shares/invitations)
  const { data: mapsData } = db.useQuery(
    userId
      ? {
          maps: {
            creator: {},
          },
        }
      : null
  )

  const maps: Map[] = useMemo(
    () =>
      mapsData?.maps
        ?.filter((m: any) => !m.deletedAt) // Filter out soft-deleted maps
        .map((m: any) => ({
          id: m.id,
          name: m.name,
          createdBy: m.creator?.id || userId || '',
          createdAt: new Date(m.createdAt),
          updatedAt: new Date(m.updatedAt),
          deletedAt: m.deletedAt ? new Date(m.deletedAt) : null,
        })) || [],
    [mapsData?.maps, userId]
  )

  return maps
}

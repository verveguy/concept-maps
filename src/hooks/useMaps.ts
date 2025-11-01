/**
 * Hook for querying maps from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMemo } from 'react'
import type { Map } from '@/lib/schema'

/**
 * Hook to get all maps accessible to the current user (owned or shared).
 * Uses InstantDB useQuery() for real-time updates.
 * 
 * @returns Array of maps created by or shared with the authenticated user
 */
export function useMaps() {
  const auth = db.useAuth()

  const { data } = db.useQuery(
    auth.user?.id
      ? {
          maps: {
            $: {
              where: { createdBy: auth.user.id },
            },
          },
          sharedMaps: {
            $: {
              where: { userId: auth.user.id, status: 'active' },
            },
            map: {},
          },
        }
      : null
  )

  // Transform InstantDB data to schema format
  const ownedMaps: Map[] = useMemo(
    () =>
      data?.maps?.map((m: any) => ({
        id: m.id,
        name: m.name,
        createdBy: m.createdBy,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      })) || [],
    [data?.maps]
  )

  const sharedMaps: Map[] = useMemo(() => {
    if (!data?.sharedMaps) return []

    return data.sharedMaps
      .map((share: any) => share.map)
      .filter(Boolean)
      .map((map: any) => ({
        id: map.id,
        name: map.name,
        createdBy: map.createdBy,
        createdAt: new Date(map.createdAt),
        updatedAt: new Date(map.updatedAt),
      }))
  }, [data?.sharedMaps])

  const combinedMaps = useMemo(() => {
    const deduped = new Map<string, Map>()
    ownedMaps.forEach((map) => {
      deduped.set(map.id, map)
    })
    sharedMaps.forEach((map) => {
      deduped.set(map.id, map)
    })
    return Array.from(deduped.values())
  }, [ownedMaps, sharedMaps])

  return combinedMaps
}

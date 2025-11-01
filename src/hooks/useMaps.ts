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
  const userId = auth.user?.id

  const { data: ownedMapsData } = db.useQuery(
    userId
      ? {
          maps: {
            $: {
              where: { createdBy: userId },
            },
          },
        }
      : null
  )

  const { data: sharedMapsData } = db.useQuery(
    userId
      ? {
          shares: {
            $: {
              where: { userId, status: 'active' },
            },
            map: {},
          },
        }
      : null
  )

  const ownedMaps: Map[] = useMemo(
    () =>
      ownedMapsData?.maps?.map((m: any) => ({
        id: m.id,
        name: m.name,
        createdBy: m.createdBy,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      })) || [],
    [ownedMapsData?.maps]
  )

  const sharedMaps: Map[] = useMemo(() => {
    if (!sharedMapsData?.shares) return []

    return sharedMapsData.shares
      .map((share: any) => share.map)
      .filter(Boolean)
      .map((map: any) => ({
        id: map.id,
        name: map.name,
        createdBy: map.createdBy,
        createdAt: new Date(map.createdAt),
        updatedAt: new Date(map.updatedAt),
      }))
  }, [sharedMapsData?.shares])

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

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
 * Permissions automatically filter results to only maps the user can view.
 * 
 * @returns Array of maps created by or shared with the authenticated user
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

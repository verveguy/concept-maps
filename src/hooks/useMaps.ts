import { db } from '@/lib/instant'
import { useMemo } from 'react'
import type { Map } from '@/lib/schema'

/**
 * Hook to get all maps created by the current user
 * Uses InstantDB useQuery() for real-time updates
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
        }
      : null
  )

  // Transform InstantDB data to schema format
  const maps: Map[] = useMemo(
    () =>
      data?.maps?.map((m: any) => ({
        id: m.id,
        name: m.name,
        createdBy: m.createdBy,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      })) || [],
    [data]
  )

  return maps
}

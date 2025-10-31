import { db, tx, id } from '@/lib/instant'
import type { Share } from '@/lib/schema'

/**
 * Hook for managing map sharing and permissions
 * Uses db.useQuery() for reading shares and db.transact() for mutations
 */
export function useSharing(mapId: string | null) {
  // Query shares for this map
  const { data } = db.useQuery(
    mapId
      ? {
          shares: {
            $: {
              where: { mapId },
            },
          },
        }
      : null
  )

  // Transform InstantDB data to schema format
  const shares: Share[] =
    data?.shares?.map((s: any) => ({
      id: s.id,
      mapId: s.mapId,
      userId: s.userId,
      permission: s.permission as 'view' | 'edit',
      createdAt: new Date(s.createdAt),
    })) || []

  const shareMap = async (userId: string, permission: 'view' | 'edit') => {
    if (!mapId) throw new Error('Map ID is required')

    await db.transact([
      tx.shares[id()].update({
        mapId,
        userId,
        permission,
        createdAt: Date.now(),
      }),
    ])
  }

  const updateSharePermission = async (
    shareId: string,
    permission: 'view' | 'edit'
  ) => {
    await db.transact([
      tx.shares[shareId].update({
        permission,
      }),
    ])
  }

  const removeShare = async (shareId: string) => {
    await db.transact([tx.shares[shareId].delete()])
  }

  return {
    shares,
    shareMap,
    updateSharePermission,
    removeShare,
  }
}

/**
 * Generate a shareable link for a map
 * This creates a URL that can be used to access the map
 */
export function generateShareLink(mapId: string): string {
  const baseUrl = window.location.origin
  return `${baseUrl}/map/${mapId}`
}


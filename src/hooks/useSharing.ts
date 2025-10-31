import { db, tx, id } from '@/lib/instant'
import type { Share } from '@/lib/schema'
import { useEffect, useCallback, useMemo } from 'react'

/**
 * Hook for managing map sharing and permissions
 * Uses db.useQuery() for reading shares and db.transact() for mutations
 */
export function useSharing(mapId: string | null) {
  const currentUser = db.auth?.user
  const userId = currentUser?.id || null

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
      acceptedAt: s.acceptedAt ? new Date(s.acceptedAt) : null,
    })) || []

  const acceptShare = useCallback(async (shareId: string) => {
    await db.transact([
      tx.shares[shareId].update({
        acceptedAt: Date.now(),
      }),
    ])
  }, [])

  // Find unaccepted share for current user (memoized)
  const unacceptedShareId = useMemo(() => {
    if (!mapId || !userId) return null
    const userShare = shares.find((s) => s.userId === userId && !s.acceptedAt)
    return userShare?.id || null
  }, [mapId, userId, shares.length, shares.find((s) => s.userId === userId && !s.acceptedAt)?.id])

  // Auto-accept share when user accesses a shared map
  useEffect(() => {
    if (!unacceptedShareId) return

    // Automatically accept the share
    acceptShare(unacceptedShareId).catch((error) => {
      console.error('Failed to auto-accept share:', error)
    })
  }, [unacceptedShareId, acceptShare])

  const shareMap = async (userId: string, permission: 'view' | 'edit') => {
    if (!mapId) throw new Error('Map ID is required')

    await db.transact([
      tx.shares[id()].update({
        mapId,
        userId,
        permission,
        createdAt: Date.now(),
        acceptedAt: null, // Not accepted yet
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
    acceptShare,
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


/**
 * Hook for managing map sharing and permissions.
 * Provides functionality to share maps with other users and manage access permissions.
 * Uses db.useQuery() for reading shares and db.transact() for mutations.
 */

import { db, tx, id } from '@/lib/instant'
import type { Share } from '@/lib/schema'
import { useEffect, useCallback, useMemo } from 'react'
import { useShareToken } from './useShareToken'

/**
 * Hook for managing map sharing and permissions.
 * Uses db.useQuery() for reading shares and db.transact() for mutations.
 * 
 * @param mapId - ID of the map to manage sharing for, or null
 * @returns Object containing shares array and sharing management functions
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
      userId: s.userId || null,
      permission: s.permission as 'view' | 'edit',
      token: s.token || null,
      createdAt: new Date(s.createdAt),
      acceptedAt: s.acceptedAt ? new Date(s.acceptedAt) : null,
    })) || []

  /**
   * Accept a share invitation.
   * 
   * @param shareId - ID of the share to accept
   */
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

  // Get share token from URL
  const shareToken = useShareToken()

  // Find share by token if accessing via share link
  const shareByToken = useMemo(() => {
    if (!mapId || !shareToken) return null
    return shares.find((s) => s.token === shareToken && !s.acceptedAt) || null
  }, [mapId, shareToken, shares])

  // Auto-accept share when user accesses a shared map (by userId or token)
  useEffect(() => {
    if (!mapId || !userId) return

    // Accept share by userId if not already accepted
    if (unacceptedShareId) {
      acceptShare(unacceptedShareId).catch((error) => {
        console.error('Failed to auto-accept share:', error)
      })
      return
    }

    // Accept share by token if accessing via share link
    if (shareByToken && shareByToken.userId === null) {
      // Update share to accept it and associate with current user
      db.transact([
        tx.shares[shareByToken.id].update({
          userId,
          acceptedAt: Date.now(),
        }),
      ]).catch((error) => {
        console.error('Failed to auto-accept share via token:', error)
      })
    }
  }, [mapId, userId, unacceptedShareId, shareByToken, acceptShare])

  /**
   * Generate a unique share token.
   * Creates a cryptographically random token for link-based sharing.
   * 
   * @returns A unique share token string
   */
  const generateShareToken = (): string => {
    // Generate a random token using crypto API
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Share a map with a user.
   * Creates a share record with optional token for link-based access.
   * 
   * @param userId - ID of the user to share with (optional for link-based sharing)
   * @param permission - Permission level ('view' or 'edit')
   * @param generateToken - Whether to generate a token for link-based sharing (default: true)
   * @returns The created share object with token
   * @throws Error if mapId is not provided
   */
  const shareMap = async (
    userId: string | null,
    permission: 'view' | 'edit',
    generateToken: boolean = true
  ) => {
    if (!mapId) throw new Error('Map ID is required')

    const shareId = id()
    const token = generateToken ? generateShareToken() : undefined

    await db.transact([
      tx.shares[shareId].update({
        mapId,
        userId: userId || null,
        permission,
        token,
        createdAt: Date.now(),
        acceptedAt: null, // Not accepted yet
      }),
    ])

    return { id: shareId, token }
  }

  /**
   * Update the permission level for a share.
   * 
   * @param shareId - ID of the share to update
   * @param permission - New permission level ('view' or 'edit')
   */
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

  /**
   * Remove a share (revoke access).
   * 
   * @param shareId - ID of the share to remove
   */
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
 * Generate a shareable link for a map.
 * Creates a URL that includes a share token for InstantDB permission rules.
 * 
 * @param mapId - ID of the map to generate a link for
 * @param shareToken - Optional share token to include in the link
 * @returns URL string for accessing the map with share token
 */
export function generateShareLink(mapId: string, shareToken?: string): string {
  const baseUrl = window.location.origin
  if (shareToken) {
    return `${baseUrl}/map/${mapId}?shareToken=${encodeURIComponent(shareToken)}`
  }
  return `${baseUrl}/map/${mapId}`
}


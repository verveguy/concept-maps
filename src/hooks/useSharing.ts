/**
 * Hook for managing map sharing and permissions.
 * Provides functionality to share maps with other users and manage access permissions.
 * Uses db.useQuery() for reading shares and db.transact() for mutations.
 */

import { db, tx, id } from '@/lib/instant'
import type { Share, ShareInvitation } from '@/lib/schema'
import { useCallback, useMemo } from 'react'

/**
 * Hook for managing map sharing and permissions.
 * Uses db.useQuery() for reading shares and db.transact() for mutations.
 * 
 * @param mapId - ID of the map to manage sharing for, or null
 * @returns Object containing shares array and sharing management functions
 */
export function useSharing(mapId: string | null) {
  const auth = db.useAuth()
  const currentUser = auth.user || null
  const userId = currentUser?.id || null

  // Query share invitations and share records for the provided map
  const { data } = db.useQuery(
    mapId
      ? {
          shares: {
            $: {
              where: { mapId },
            },
          },
          shareInvitations: {
            $: {
              where: { mapId },
            },
          },
        }
      : null
  )

  // Transform InstantDB data to domain schema format
  const shares: Share[] = useMemo(
    () =>
      data?.shares?.map((s: any) => ({
        id: s.id,
        mapId: s.mapId,
        userId: s.userId,
        permission: s.permission as 'view' | 'edit',
        createdAt: new Date(s.createdAt),
        acceptedAt: s.acceptedAt ? new Date(s.acceptedAt) : null,
        status: (s.status ?? 'pending') as Share['status'],
        revokedAt: s.revokedAt ? new Date(s.revokedAt) : null,
        invitationId: s.invitationId ?? null,
      })) || [],
    [data?.shares]
  )

  const invitations: ShareInvitation[] = useMemo(
    () =>
      data?.shareInvitations?.map((inv: any) => ({
        id: inv.id,
        mapId: inv.mapId,
        invitedEmail: inv.invitedEmail,
        invitedUserId: inv.invitedUserId ?? null,
        permission: inv.permission as 'view' | 'edit',
        token: inv.token,
        status: inv.status as ShareInvitation['status'],
        createdBy: inv.createdBy,
        createdAt: new Date(inv.createdAt),
        expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : null,
        respondedAt: inv.respondedAt ? new Date(inv.respondedAt) : null,
        revokedAt: inv.revokedAt ? new Date(inv.revokedAt) : null,
      })) || [],
    [data?.shareInvitations]
  )

  /**
   * Create a new invitation for a map collaborator.
   * Generates a secure token and stores the invitation for later acceptance.
   *
   * @param targetEmail - Email address (and expected user identifier) of the invitee
   * @param permission - Requested permission level ('view' | 'edit')
   * @returns The invitation token for sharing with the invitee
   */
  const createInvitation = useCallback(
    async (targetEmail: string, permission: 'view' | 'edit'): Promise<string> => {
      if (!mapId) throw new Error('Map ID is required')
      if (!currentUser?.id) throw new Error('Current user must be authenticated')

      const invitationId = id()
      const token = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)

      await db.transact([
        tx.shareInvitations[invitationId].update({
          mapId,
          invitedEmail: targetEmail.toLowerCase(),
          invitedUserId: null,
          permission,
          token,
          status: 'pending',
          createdBy: currentUser.id,
          createdAt: Date.now(),
          expiresAt: null,
          respondedAt: null,
          revokedAt: null,
        }),
      ])

      return token
    },
    [mapId, currentUser?.id]
  )

  /**
   * Accept a collaboration invitation.
   * Updates the invitation record to accepted and creates an active share entry.
   *
   * @param invitationId - ID of the invitation to accept
   */
  const acceptInvitation = useCallback(
    async (invitationId: string) => {
      if (!userId) throw new Error('Authentication required to accept invitations')

      const invitation = invitations.find((inv) => inv.id === invitationId)
      if (!invitation) throw new Error('Invitation not found')
      if (invitation.status !== 'pending') {
        throw new Error('Only pending invitations can be accepted')
      }

      await db.transact([
        tx.shareInvitations[invitationId].update({
          status: 'accepted',
          invitedUserId: userId,
          respondedAt: Date.now(),
          revokedAt: null,
        }),
      ])

      await db.transact([
        tx.shares[invitation.id].update({
          mapId: invitation.mapId,
          userId,
          permission: invitation.permission,
          createdAt: Date.now(),
          acceptedAt: Date.now(),
          status: 'active',
          revokedAt: null,
          invitationId: invitation.id,
        }),
      ])
    },
    [invitations, userId]
  )

  /**
   * Decline a collaboration invitation.
   *
   * @param invitationId - ID of the invitation to decline
   */
  const declineInvitation = useCallback(
    async (invitationId: string) => {
      if (!userId) throw new Error('Authentication required to decline invitations')

      const invitation = invitations.find((inv) => inv.id === invitationId)
      if (!invitation) throw new Error('Invitation not found')
      if (invitation.status !== 'pending') {
        throw new Error('Only pending invitations can be declined')
      }

      await db.transact([
        tx.shareInvitations[invitationId].update({
          status: 'declined',
          invitedUserId: userId,
          respondedAt: Date.now(),
        }),
      ])
    },
    [invitations, userId]
  )

  /**
   * Revoke an invitation (owner action) and expire any linked shares.
   *
   * @param invitationId - ID of the invitation to revoke
   */
  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      if (!currentUser?.id) throw new Error('Authentication required to revoke invitations')

      const invitationShares = shares.filter((share) => share.invitationId === invitationId)

      await db.transact([
        tx.shareInvitations[invitationId].update({
          status: 'revoked',
          revokedAt: Date.now(),
        }),
        ...invitationShares.map((share) =>
          tx.shares[share.id].update({
            status: 'revoked',
            revokedAt: Date.now(),
          })
        ),
      ])
    },
    [currentUser?.id, shares]
  )

  /**
   * Update the permission level for an active share (owner action).
   *
   * @param shareId - ID of the share to update
   * @param permission - New permission level
   */
  const updateSharePermission = useCallback(
    async (shareId: string, permission: 'view' | 'edit') => {
      await db.transact([
        tx.shares[shareId].update({
          permission,
        }),
      ])
    },
    []
  )

  /**
   * Revoke a share (owner action) and flag the underlying invitation as revoked.
   *
   * @param shareId - ID of the share to revoke
   */
  const revokeShare = useCallback(
    async (shareId: string) => {
      const share = shares.find((s) => s.id === shareId)
      if (!share) throw new Error('Share not found')

      const updates = [
        tx.shares[shareId].update({
          status: 'revoked',
          revokedAt: Date.now(),
        }),
      ]

      if (share.invitationId) {
        updates.push(
          tx.shareInvitations[share.invitationId].update({
            status: 'revoked',
            revokedAt: Date.now(),
          })
        )
      }

      await db.transact(updates)
    },
    [shares]
  )

  return {
    currentUser,
    shares,
    invitations,
    createInvitation,
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    updateSharePermission,
    revokeShare,
  }
}

/**
 * Generate a shareable link for a map.
 * Creates a URL that can be used to access the map.
 * 
 * @param mapId - ID of the map to generate a link for
 * @param token - Invitation token that authenticates access to the invitation
 * @returns URL string for accessing the map
 */
export function generateShareLink(mapId: string, token: string): string {
  const baseUrl = window.location.origin
  const url = new URL(`${baseUrl}/map/${mapId}`)
  url.searchParams.set('inviteToken', token)
  return url.toString()
}


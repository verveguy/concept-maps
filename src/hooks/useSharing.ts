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
 * 
 * Provides functionality to share maps with other users and manage access permissions.
 * Uses `db.useQuery()` for reading shares and `db.transact()` for mutations.
 * 
 * **Features:**
 * - Create invitations by email
 * - Accept/decline invitations
 * - Revoke invitations and shares
 * - Update permission levels
 * - View active shares and pending invitations
 * 
 * **Invitation Flow:**
 * 1. Owner creates invitation with target email and permission level
 * 2. Secure token is generated (UUID)
 * 3. Shareable link is created with token
 * 4. Invitee clicks link and accepts (email validation)
 * 5. Share record is created and permissions are granted
 * 
 * **Permission Management:**
 * - `'view'`: Read-only access (readPermissions link)
 * - `'edit'`: Read-write access (writePermissions link)
 * - Permissions are updated atomically in transactions
 * 
 * **Email Validation:**
 * When accepting invitations, the authenticated user's email must match the
 * invitation's `invitedEmail` (case-insensitive comparison).
 * 
 * @param mapId - ID of the map to manage sharing for, or null
 * @returns Object containing:
 * - `currentUser`: Current authenticated user
 * - `shares`: Array of active shares
 * - `invitations`: Array of pending/accepted invitations
 * - `createInvitation`: Create a new invitation
 * - `acceptInvitation`: Accept an invitation
 * - `declineInvitation`: Decline an invitation
 * - `revokeInvitation`: Revoke an invitation (owner only)
 * - `updateSharePermission`: Update permission level (owner only)
 * - `revokeShare`: Revoke a share (owner only)
 * 
 * @example
 * ```tsx
 * import { useSharing } from '@/hooks/useSharing'
 * 
 * function ShareDialog({ mapId }) {
 *   const { shares, invitations, createInvitation } = useSharing(mapId)
 *   
 *   const handleInvite = async (email: string) => {
 *     const token = await createInvitation(email, 'edit')
 *     const link = generateShareLink(mapId, token)
 *     // Share the link with the user
 *   }
 *   
 *   return <ShareUI shares={shares} invitations={invitations} />
 * }
 * ```
 */
export function useSharing(mapId: string | null) {
  const auth = db.useAuth()
  const currentUser = auth.user || null
  const userId = currentUser?.id || null

  // Query the current user's email from the $users entity
  const { data: currentUserData } = db.useQuery(
    userId
      ? {
          $users: {
            $: { where: { id: userId } },
          },
        }
      : null
  )

  const currentUserEmail = currentUserData?.$users?.[0]?.email || null

  // Query share invitations and share records for the provided map
  // Include permission links for debugging and consistency
  // Include map link on shares so permission checks can traverse to map.creator
  const { data } = db.useQuery(
    mapId
      ? {
          maps: {
            $: { where: { id: mapId } },
            shares: {
              user: {},
              map: {
                creator: {},
              },
              creator: {},
            },
            shareInvitations: {
              creator: {},
            },
            writePermissions: {},
            readPermissions: {},
          },
        }
      : null
  )

  // Transform InstantDB data to domain schema format
  const invitations: ShareInvitation[] = useMemo(
    () =>
      data?.maps?.[0]?.shareInvitations?.map((inv: any) => ({
        id: inv.id,
        mapId: inv.map?.id || mapId || '',
        invitedEmail: inv.invitedEmail,
        invitedUserId: inv.invitedUserId ?? null,
        permission: inv.permission as 'view' | 'edit',
        token: inv.token,
        status: inv.status as ShareInvitation['status'],
        createdBy: inv.creator?.id || '',
        createdAt: new Date(inv.createdAt),
        expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : null,
        respondedAt: inv.respondedAt ? new Date(inv.respondedAt) : null,
        revokedAt: inv.revokedAt ? new Date(inv.revokedAt) : null,
      })) || [],
    [data?.maps, mapId]
  )

  const shares: Share[] = useMemo(() => {
    const sharesData = data?.maps?.[0]?.shares || []
    return sharesData.map((s: any) => {
      const userId = s.user?.id || ''
      // Shares created from invitations use the invitation ID as the share ID
      // So we can match directly by ID, or fall back to matching by userId
      const matchingInvitation = invitations.find(
        (inv) => inv.id === s.id || (inv.invitedUserId === userId && inv.status === 'accepted')
      )
      
      // Get email from user object if available, otherwise from matching invitation
      const userEmail = s.user?.email || matchingInvitation?.invitedEmail || null

      return {
        id: s.id,
        mapId: s.map?.id || mapId || '',
        userId,
        userEmail,
        permission: s.permission as 'view' | 'edit',
        createdAt: new Date(s.createdAt),
        acceptedAt: s.acceptedAt ? new Date(s.acceptedAt) : null,
        status: (s.status ?? 'pending') as Share['status'],
        revokedAt: s.revokedAt ? new Date(s.revokedAt) : null,
        invitationId: null, // No longer tracked as attribute
      }
    })
  }, [data?.maps, mapId, invitations])

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
        tx.shareInvitations[invitationId]
          .update({
            invitedEmail: targetEmail.toLowerCase(),
            invitedUserId: null,
            permission,
            token,
            status: 'pending',
            createdAt: Date.now(),
            expiresAt: null,
            respondedAt: null,
            revokedAt: null,
          })
          .link({
            creator: currentUser.id,
            map: mapId,
          }),
      ])

      return token
    },
    [mapId, currentUser?.id]
  )

  /**
   * Accept a collaboration invitation.
   * Updates the invitation record to accepted and creates an active share entry.
   * All operations are performed in a single atomic transaction.
   * Validates that the authenticated user's email matches the invited email.
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

      // Validate that the authenticated user's email matches the invited email
      if (!currentUserEmail) {
        throw new Error('Unable to verify your email address. Please ensure your account has an email associated with it.')
      }
      
      // Compare emails case-insensitively (invitedEmail is stored lowercase)
      const invitedEmailLower = invitation.invitedEmail.toLowerCase()
      const currentEmailLower = currentUserEmail.toLowerCase()
      
      if (invitedEmailLower !== currentEmailLower) {
        throw new Error(`This invitation was sent to ${invitation.invitedEmail}, but you are signed in as ${currentUserEmail}. Please sign in with the correct email address.`)
      }

      // Get the map owner (invitation creator) from the raw query data
      const invitationRecord = data?.maps?.[0]?.shareInvitations?.find((inv: any) => inv.id === invitationId)
      const mapOwnerId = invitationRecord?.creator?.id || invitation.createdBy

      if (!mapOwnerId) {
        throw new Error('Map owner information is missing. Cannot create share.')
      }

      // Single atomic transaction combining all operations
      await db.transact([
        tx.shareInvitations[invitationId].update({
          status: 'accepted',
          invitedUserId: userId,
          respondedAt: Date.now(),
          revokedAt: null,
        }),
        tx.shares[invitation.id]
          .update({
            permission: invitation.permission,
            createdAt: Date.now(),
            acceptedAt: Date.now(),
            status: 'active',
            revokedAt: null,
          })
          .link({
            user: userId,
            map: invitation.mapId,
            creator: mapOwnerId, // Link creator to map owner for permission checks
          }),
        // Create permission links based on the invitation permission
        ...(invitation.permission === 'edit'
          ? [tx.maps[invitation.mapId].link({ writePermissions: userId })]
          : [tx.maps[invitation.mapId].link({ readPermissions: userId })]),
      ])
    },
    [invitations, userId, data, currentUserEmail]
  )

  /**
   * Decline a collaboration invitation.
   * Validates that the authenticated user's email matches the invited email.
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

      // Validate that the authenticated user's email matches the invited email
      if (!currentUserEmail) {
        throw new Error('Unable to verify your email address. Please ensure your account has an email associated with it.')
      }
      
      // Compare emails case-insensitively (invitedEmail is stored lowercase)
      const invitedEmailLower = invitation.invitedEmail.toLowerCase()
      const currentEmailLower = currentUserEmail.toLowerCase()
      
      if (invitedEmailLower !== currentEmailLower) {
        throw new Error(`This invitation was sent to ${invitation.invitedEmail}, but you are signed in as ${currentUserEmail}. Please sign in with the correct email address.`)
      }

      await db.transact([
        tx.shareInvitations[invitationId].update({
          status: 'declined',
          invitedUserId: userId,
          respondedAt: Date.now(),
        }),
      ])
    },
    [invitations, userId, currentUserEmail]
  )

  /**
   * Revoke an invitation (owner action) and expire any linked shares.
   * Also removes permission links if the invitation was already accepted.
   *
   * @param invitationId - ID of the invitation to revoke
   */
  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      if (!currentUser?.id) throw new Error('Authentication required to revoke invitations')

      const invitation = invitations.find((inv) => inv.id === invitationId)
      if (!invitation) throw new Error('Invitation not found')

      // Find associated share - shares created from invitations use the invitation ID as the share ID
      const sharesData = data?.maps?.[0]?.shares || []
      const associatedShare = sharesData.find((s: any) => s.id === invitationId)

      const operations: any[] = [
        tx.shareInvitations[invitationId].update({
          status: 'revoked',
          revokedAt: Date.now(),
        }),
      ]

      // If there's an associated share that was accepted, revoke it and remove permission links
      if (associatedShare && associatedShare.status === 'active') {
        operations.push(
          tx.shares[invitationId].update({
            status: 'revoked',
            revokedAt: Date.now(),
          })
        )

        // Remove permission links
        const userId = associatedShare.user?.id || invitation.invitedUserId
        if (userId) {
          operations.push(
            ...(invitation.permission === 'edit'
              ? [tx.maps[invitation.mapId].unlink({ writePermissions: userId })]
              : [tx.maps[invitation.mapId].unlink({ readPermissions: userId })])
          )
        }
      }

      await db.transact(operations)
    },
    [currentUser?.id, invitations, data]
  )

  /**
   * Update the permission level for an active share (owner action).
   * Updates the permission links accordingly. Operations are idempotent - always
   * unlinks from both permission types before linking to the correct one.
   *
   * @param shareId - ID of the share to update
   * @param permission - New permission level
   */
  const updateSharePermission = useCallback(
    async (shareId: string, permission: 'view' | 'edit') => {
      // Find the share in the raw query data to access the user link directly
      const sharesData = data?.maps?.[0]?.shares || []
      const shareRecord = sharesData.find((s: any) => s.id === shareId)
      
      if (!shareRecord) throw new Error('Share not found')
      if (shareRecord.status !== 'active') {
        throw new Error('Can only update permissions for active shares')
      }
      
      const share = shares.find((s) => s.id === shareId)
      if (!share) throw new Error('Share not found')
      if (!share.mapId) throw new Error('Share map ID is required')
      
      // Get userId from link - try shareRecord first, then fallback to transformed share.userId
      // The transformed share.userId comes from the same query data, so if one is missing, both will be
      // But we try both in case of timing/refresh issues
      let userId: string | null = shareRecord.user?.id || share.userId || null
      if (!userId || userId.trim() === '') {
        // Last resort: try to get from the invitation if this share was created from one
        const matchingInvitation = invitations.find(
          (inv) => inv.id === shareId && inv.status === 'accepted'
        )
        userId = matchingInvitation?.invitedUserId || null
      }
      
      if (!userId || userId.trim() === '') {
        console.error('Share data:', { shareRecord, share, sharesData })
        throw new Error(
          'Share is missing user link. Share may not have been fully loaded. ' +
          'Please refresh the page and try again.'
        )
      }
      
      if (share.permission === permission) return // No change needed

      // Get the creator ID from the share record (map owner) - needed for permission check
      const creatorId = shareRecord.creator?.id || shareRecord.map?.creator?.id
      if (!creatorId) {
        throw new Error('Share creator information is missing. Cannot update permission.')
      }

      // Idempotent update: unlink from both permission types, then link to correct one
      // Ensure map and creator links are maintained in transaction for permission checks
      await db.transact([
        tx.shares[shareId]
          .update({
            permission,
          })
          .link({
            map: share.mapId,
            creator: creatorId, // Maintain creator link for permission evaluation
          }),
        // Unlink from old permission type (idempotent - safe if already unlinked)
        ...(share.permission === 'edit'
          ? [tx.maps[share.mapId].unlink({ writePermissions: userId })]
          : [tx.maps[share.mapId].unlink({ readPermissions: userId })]),
        // Link to new permission type
        ...(permission === 'edit'
          ? [tx.maps[share.mapId].link({ writePermissions: userId })]
          : [tx.maps[share.mapId].link({ readPermissions: userId })]),
      ])
    },
    [shares, data, invitations]
  )

  /**
   * Revoke a share (owner action) and remove permission links.
   *
   * @param shareId - ID of the share to revoke
   */
  const revokeShare = useCallback(
    async (shareId: string) => {
      // Find the share in the raw query data to access the user link directly
      const sharesData = data?.maps?.[0]?.shares || []
      const shareRecord = sharesData.find((s: any) => s.id === shareId)
      
      if (!shareRecord) throw new Error('Share not found')
      if (shareRecord.status === 'revoked') {
        return // Already revoked, nothing to do
      }
      
      const share = shares.find((s) => s.id === shareId)
      if (!share) throw new Error('Share not found')
      if (!share.mapId) throw new Error('Share map ID is required')
      
      // Get userId from link - should always exist for active shares
      const userId = shareRecord.user?.id
      if (!userId) {
        throw new Error('Share is missing user link. Cannot revoke.')
      }

      const operations: any[] = [
        tx.shares[shareId].update({
          status: 'revoked',
          revokedAt: Date.now(),
        }),
      ]

      // Remove permission links based on current permission
      operations.push(
        ...(share.permission === 'edit'
          ? [tx.maps[share.mapId].unlink({ writePermissions: userId })]
          : [tx.maps[share.mapId].unlink({ readPermissions: userId })])
      )

      await db.transact(operations)
    },
    [shares, data]
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
 * 
 * Creates a URL that can be used to access the map via an invitation token.
 * The link includes the map ID and invitation token as query parameters.
 * 
 * **Link Format:**
 * `{origin}{basePath}/map/{mapId}?inviteToken={token}`
 * 
 * **Use Case:**
 * After creating an invitation, generate a shareable link to send to the invitee.
 * When they click the link, the InvitationPage component will detect the token
 * and prompt them to accept the invitation.
 * 
 * @param mapId - ID of the map to generate a link for
 * @param token - Invitation token that authenticates access to the invitation
 * @returns URL string for accessing the map with the invitation token
 * 
 * @example
 * ```tsx
 * import { generateShareLink } from '@/hooks/useSharing'
 * 
 * const token = await createInvitation(email, 'edit')
 * const shareLink = generateShareLink(mapId, token)
 * // Share shareLink with the invitee
 * ```
 */
export function generateShareLink(mapId: string, token: string): string {
  const baseUrl = window.location.origin
  // Use import.meta.env.BASE_URL which includes the base path from vite config
  // BASE_URL always ends with a slash, so we remove it before appending our path
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  const url = new URL(`${baseUrl}${basePath}/map/${mapId}`)
  url.searchParams.set('inviteToken', token)
  return url.toString()
}


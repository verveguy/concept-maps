/**
 * Hook for querying pending invitations for a specific map and user.
 * Used to detect if a logged-in user has a pending invitation for a map
 * they're trying to view.
 */

import { db } from '@/lib/instant'
import { useMemo } from 'react'
import type { ShareInvitation } from '@/lib/schema'

/**
 * Hook to get a pending invitation for the current map and user's email.
 * 
 * Queries shareInvitations filtered by:
 * - mapId matches the provided mapId
 * - invitedEmail matches the current user's email (case-insensitive)
 * - status is 'pending'
 * 
 * **Use Case:**
 * When a user views a map they don't have permissions for yet, this hook
 * checks if there's a pending invitation they can accept.
 * 
 * **Real-time Updates:**
 * Uses InstantDB `useQuery()` for real-time updates. The returned invitation
 * will automatically update when the invitation status changes.
 * 
 * @param mapId - ID of the map to check for pending invitations, or null
 * @returns The pending invitation object, or null if none exists
 * 
 * @example
 * ```tsx
 * import { usePendingInvitation } from '@/hooks/usePendingInvitation'
 * 
 * function MapPage() {
 *   const { map } = useMap()
 *   const pendingInvitation = usePendingInvitation(map?.id)
 *   
 *   if (pendingInvitation) {
 *     return <InvitationAcceptScreen invitation={pendingInvitation} />
 *   }
 * }
 * ```
 */
export function usePendingInvitation(mapId: string | null) {
  const auth = db.useAuth()
  const userId = auth.user?.id

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

  // Query shareInvitations through the map entity
  // We filter by status and email in the useMemo since InstantDB doesn't support
  // case-insensitive email matching in the where clause
  const { data: invitationsData, isLoading } = db.useQuery(
    mapId && currentUserEmail
      ? {
          maps: {
            $: { where: { id: mapId } },
            shareInvitations: {
              creator: {},
              map: {
                creator: {},
              },
            },
          },
        }
      : null
  )

  // Find invitations that match the current user's email (case-insensitive)
  // Return pending invitation if available, otherwise return accepted invitation
  const pendingInvitation: (ShareInvitation & { map?: { id: string; name: string; createdBy: string } }) | null = useMemo(() => {
    if (!invitationsData?.maps?.[0]?.shareInvitations || !currentUserEmail) return null

    const rawInvitations = invitationsData.maps[0].shareInvitations
    
    // Find all invitations where invitedEmail matches current user's email (case-insensitive)
    const matchingInvitations = rawInvitations.filter((inv: any) => {
      const invitedEmailLower = inv.invitedEmail?.toLowerCase() || ''
      const currentEmailLower = currentUserEmail.toLowerCase()
      return invitedEmailLower === currentEmailLower
    })

    if (matchingInvitations.length === 0) return null

    // Prefer pending invitation, but also return accepted invitation if no pending one exists
    // This helps handle the case where invitation was just accepted but permissions haven't propagated yet
    const pendingInv = matchingInvitations.find((inv: any) => inv.status === 'pending')
    const acceptedInv = matchingInvitations.find((inv: any) => inv.status === 'accepted')
    const matchingInvitation = pendingInv || acceptedInv

    if (!matchingInvitation) return null

    const map = matchingInvitation.map

    return {
      id: matchingInvitation.id,
      mapId: map?.id || mapId || '',
      invitedEmail: matchingInvitation.invitedEmail,
      invitedUserId: matchingInvitation.invitedUserId ?? null,
      permission: matchingInvitation.permission as ShareInvitation['permission'],
      token: matchingInvitation.token,
      status: matchingInvitation.status as ShareInvitation['status'],
      createdBy: matchingInvitation.creator?.id || '',
      createdAt: new Date(matchingInvitation.createdAt),
      expiresAt: matchingInvitation.expiresAt ? new Date(matchingInvitation.expiresAt) : null,
      respondedAt: matchingInvitation.respondedAt ? new Date(matchingInvitation.respondedAt) : null,
      revokedAt: matchingInvitation.revokedAt ? new Date(matchingInvitation.revokedAt) : null,
      map: map
        ? {
            id: map.id,
            name: map.name,
            createdBy: map.creator?.id || '',
          }
        : undefined,
    }
  }, [invitationsData?.maps, currentUserEmail, mapId])

  return {
    invitation: pendingInvitation,
    isLoading,
  }
}


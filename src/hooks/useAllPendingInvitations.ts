/**
 * Hook for querying all pending invitations for the logged-in user across all maps.
 * Used to display pending invitations in the sidebar "Shared with me" section.
 */

import { db } from '@/lib/instant'
import { useMemo } from 'react'
import type { ShareInvitation } from '@/lib/schema'

/**
 * Hook to get all pending invitations for the current user's email across all maps.
 * 
 * Queries all shareInvitations and filters by:
 * - invitedEmail matches the current user's email (case-insensitive)
 * - status is 'pending'
 * 
 * **Use Case:**
 * Display pending invitations in the sidebar so users can see and accept invitations
 * without needing to navigate to specific maps.
 * 
 * **Real-time Updates:**
 * Uses InstantDB `useQuery()` for real-time updates. The returned invitations
 * will automatically update when invitation status changes.
 * 
 * @returns Array of pending invitation objects with map information, or empty array if none exist
 * 
 * @example
 * ```tsx
 * import { useAllPendingInvitations } from '@/hooks/useAllPendingInvitations'
 * 
 * function Sidebar() {
 *   const pendingInvitations = useAllPendingInvitations()
 *   
 *   return (
 *     <div>
 *       {pendingInvitations.map(inv => (
 *         <InvitationEntry key={inv.id} invitation={inv} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useAllPendingInvitations(): (ShareInvitation & { map?: { id: string; name: string; createdBy: string } })[] {
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

  // Query all shareInvitations across all maps
  // We filter by status and email in the useMemo since InstantDB doesn't support
  // case-insensitive email matching in the where clause
  const { data: invitationsData } = db.useQuery(
    currentUserEmail
      ? {
          shareInvitations: {
            creator: {},
            map: {
              creator: {},
            },
          },
        }
      : null
  )

  // Find all pending invitations that match the current user's email (case-insensitive)
  const pendingInvitations = useMemo(() => {
    if (!invitationsData?.shareInvitations || !currentUserEmail) return []

    const rawInvitations = invitationsData.shareInvitations
    
    // Type for raw invitation data from InstantDB query
    type RawInvitation = {
      id: string
      invitedEmail: string
      invitedUserId?: string | undefined
      permission: string
      token: string
      status: string
      createdAt: number
      expiresAt?: number | undefined
      respondedAt?: number | undefined
      revokedAt?: number | undefined
      creator?: { id: string } | undefined
      map?: { id: string; name: string; creator?: { id: string } | undefined } | undefined
    }
    
    // Find all pending invitations where invitedEmail matches current user's email (case-insensitive)
    const matchingInvitations = rawInvitations.filter((inv: RawInvitation) => {
      const invitedEmailLower = inv.invitedEmail?.toLowerCase() || ''
      const currentEmailLower = currentUserEmail.toLowerCase()
      return invitedEmailLower === currentEmailLower && inv.status === 'pending'
    })

    return matchingInvitations.map((inv: RawInvitation) => {
      const map = inv.map

      return {
        id: inv.id,
        mapId: map?.id || '',
        invitedEmail: inv.invitedEmail,
        invitedUserId: inv.invitedUserId ?? null,
        permission: inv.permission as ShareInvitation['permission'],
        token: inv.token,
        status: inv.status as ShareInvitation['status'],
        createdBy: inv.creator?.id || '',
        createdAt: new Date(inv.createdAt),
        expiresAt: inv.expiresAt ? new Date(inv.expiresAt) : null,
        respondedAt: inv.respondedAt ? new Date(inv.respondedAt) : null,
        revokedAt: inv.revokedAt ? new Date(inv.revokedAt) : null,
        map: map
          ? {
              id: map.id,
              name: map.name,
              createdBy: map.creator?.id || '',
            }
          : undefined,
      }
    })
  }, [invitationsData?.shareInvitations, currentUserEmail])

  return pendingInvitations
}


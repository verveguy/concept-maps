/**
 * Hook for filtering and deduplicating users editing a specific concept node.
 * 
 * Filters presence data to find users currently editing a specific node,
 * ensuring unique userIds and valid presence data.
 * 
 * @param otherUsersPresence - Array of other users' presence data
 * @param nodeId - ID of the concept node to filter by
 * @returns Array of unique users editing the specified node
 * 
 * @example
 * ```tsx
 * import { useConceptNodeCollaboration } from '@/hooks/useConceptNodeCollaboration'
 * import { usePresence } from '@/hooks/usePresence'
 * 
 * function ConceptNode({ concept }) {
 *   const { otherUsersPresence } = usePresence()
 *   const editingUsers = useConceptNodeCollaboration(otherUsersPresence, concept.id)
 *   
 *   return (
 *     <div>
 *       {editingUsers.map(user => (
 *         <Avatar key={user.userId} user={user} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */

import { useMemo } from 'react'
import type { PresenceData } from '@/lib/presence'

/**
 * Hook to get users editing a specific node.
 * 
 * Filters presence data to find users editing the specified node,
 * ensuring unique userIds and valid presence data (userName, color, userId required).
 * 
 * @param otherUsersPresence - Array of other users' presence data
 * @param nodeId - ID of the concept node to filter by
 * @returns Array of unique users editing the specified node
 */
export function useConceptNodeCollaboration(
  otherUsersPresence: PresenceData[],
  nodeId: string
): PresenceData[] {
  return useMemo(() => {
    return otherUsersPresence
      .filter((p) => p.editingNodeId === nodeId && p.userName && p.color && p.userId)
      .filter((presence, index, self) => 
        // Ensure unique userIds
        index === self.findIndex((p) => p.userId === presence.userId)
      )
  }, [otherUsersPresence, nodeId])
}


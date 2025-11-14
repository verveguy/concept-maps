/**
 * Component for displaying collaboration indicators on concept nodes.
 * 
 * Shows avatars and editing highlights for users currently editing this node.
 * Provides visual feedback for real-time collaborative editing.
 * 
 * @param editingUsers - Array of users currently editing this node
 * @param nodeId - ID of the concept node
 * 
 * @example
 * ```tsx
 * import { ConceptNodeCollaboration } from '@/components/concept/ConceptNodeCollaboration'
 * 
 * function ConceptNode({ concept, editingUsers }) {
 *   return (
 *     <div>
 *       <ConceptNodeCollaboration editingUsers={editingUsers} nodeId={concept.id} />
 *     </div>
 *   )
 * }
 * ```
 */

import { EditingHighlight } from '@/components/presence/EditingHighlight'
import { PresenceAvatar } from '@/components/presence/PresenceAvatar'
import type { PresenceData } from '@/lib/presence'

/**
 * Props for ConceptNodeCollaboration component
 */
export interface ConceptNodeCollaborationProps {
  /** Array of users currently editing this node */
  editingUsers: PresenceData[]
  /** ID of the concept node */
  nodeId: string
}

/**
 * Component to display collaboration indicators (avatars and highlights).
 * 
 * @param props - Component props
 * @returns Collaboration indicators JSX
 */
export function ConceptNodeCollaboration({ editingUsers, nodeId }: ConceptNodeCollaborationProps) {
  return (
    <>
      {/* Editing highlights from other users */}
      {editingUsers.map((presence) => (
        <EditingHighlight
          key={presence.userId}
          presence={{
            userId: presence.userId,
            userName: presence.userName,
            email: presence.email || null,
            cursor: null,
            editingNodeId: presence.editingNodeId,
            editingEdgeId: null,
            color: presence.color,
            avatarUrl: presence.avatarUrl || null,
          }}
          nodeId={nodeId}
        />
      ))}
      
      {/* Avatars for users editing this node */}
      {editingUsers.length > 0 && (
        <div className="absolute -top-2 -right-2 flex gap-1">
          {editingUsers.map((presence) => (
            <PresenceAvatar
              key={presence.userId}
              presence={{
                userId: presence.userId,
                userName: presence.userName,
                email: presence.email || null,
                cursor: null,
                editingNodeId: presence.editingNodeId,
                editingEdgeId: null,
                color: presence.color,
                avatarUrl: presence.avatarUrl || null,
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}


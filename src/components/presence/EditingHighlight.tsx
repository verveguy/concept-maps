/**
 * Component to highlight nodes/areas being edited by other users.
 * Provides visual feedback for collaborative editing.
 */

import type { PresenceData } from '@/lib/presence'

/**
 * Component to highlight nodes/areas being edited by other users.
 * 
 * Provides visual feedback for collaborative editing by highlighting concepts
 * or relationships that are currently being edited by other users. This helps
 * prevent conflicts and shows what others are working on.
 * 
 * **Visual Design:**
 * - Colored border/outline matching the editing user's presence color
 * - Subtle animation or pulsing effect (if implemented)
 * - Positioned to highlight the specific node or edge being edited
 * 
 * **Editing Detection:**
 * Checks the presence data's `editingNodeId` or `editingEdgeId` fields to
 * determine if this user is editing the current node/edge.
 * 
 * **Rendering:**
 * Only renders if the presence data indicates the user is editing this specific
 * node or edge. Returns `null` if not editing or if the node/edge IDs don't match.
 * 
 * @param props - Component props
 * @param props.presence - Presence data containing editing state (editingNodeId, editingEdgeId, color)
 * @param props.nodeId - ID of the node to check for editing (optional)
 * @param props.edgeId - ID of the edge to check for editing (optional)
 * @returns The highlight component JSX, or null if not editing
 * 
 * @example
 * ```tsx
 * import { EditingHighlight } from '@/components/presence/EditingHighlight'
 * import { usePresence } from '@/hooks/usePresence'
 * 
 * function ConceptNode({ concept }) {
 *   const { otherUsersPresence } = usePresence()
 *   
 *   return (
 *     <div>
 *       {otherUsersPresence.map(presence => (
 *         <EditingHighlight
 *           key={presence.userId}
 *           presence={presence}
 *           nodeId={concept.id}
 *         />
 *       ))}
 *       <NodeContent concept={concept} />
 *     </div>
 *   )
 * }
 * ```
 */
export function EditingHighlight({
  presence,
  nodeId,
  edgeId,
}: {
  presence: PresenceData
  nodeId?: string
  edgeId?: string
}) {
  // Only show highlight if this presence is editing this specific node/edge
  const isEditing =
    (nodeId && presence.editingNodeId === nodeId) ||
    (edgeId && presence.editingEdgeId === edgeId)
  
  if (!isEditing) return null
  
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded border-2"
      style={{
        borderColor: presence.color,
        boxShadow: `0 0 8px ${presence.color}40`,
      }}
    />
  )
}


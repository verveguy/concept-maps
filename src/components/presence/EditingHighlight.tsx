/**
 * Component to highlight nodes/areas being edited by other users.
 * Provides visual feedback for collaborative editing.
 */

import type { PresenceData } from '@/lib/presence'

/**
 * Component to highlight nodes/areas being edited by other users.
 * 
 * @param presence - Presence data containing editing state
 * @param nodeId - Optional node ID to check if being edited
 * @param edgeId - Optional edge ID to check if being edited
 * @returns The highlight component JSX, or null if not editing
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


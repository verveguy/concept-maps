import type { PresenceData } from '@/hooks/usePresence'

/**
 * Component to highlight nodes/areas being edited by other users
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


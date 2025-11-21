/**
 * Shared Maps section component for the sidebar.
 * Displays all maps shared with the current user and pending invitations.
 */

import { memo } from 'react'
import type { Map } from '@/lib/schema'
import { MapEntry } from './MapEntry'
import { SectionHeader } from './SectionHeader'
import { PendingInvitationEntry } from './PendingInvitationEntry'
import { useAllPendingInvitations } from '@/hooks/useAllPendingInvitations'

interface Perspective {
  id: string
  mapId: string
  name: string
  conceptIds: string[]
  relationshipIds: string[]
  createdBy: string
  createdAt: Date
}

interface SharedMapsSectionProps {
  maps: Map[]
  allPerspectives: Perspective[]
  isExpanded: boolean
  expandedMaps: Set<string>
  draggedMapId: string | null
  currentMapId: string | null
  currentPerspectiveId: string | null
  userId: string | null
  onToggleSection: () => void
  onToggleMapExpanded: (mapId: string) => void
  onSelectMap: (mapId: string) => void
  onSelectPerspective: (perspectiveId: string, mapId: string, e: React.MouseEvent) => void
  onDeleteMap: (mapId: string, mapName: string, e: React.MouseEvent) => void
  onDeletePerspective: (perspectiveId: string, perspectiveName: string, mapId: string, e: React.MouseEvent) => void
  onCreatePerspective: (mapId: string) => void
  onDragStart: (e: React.DragEvent, mapId: string) => void
  onDragEnd: () => void
}

export const SharedMapsSection = memo(({
  maps,
  allPerspectives,
  isExpanded,
  expandedMaps,
  draggedMapId,
  currentMapId,
  currentPerspectiveId,
  userId,
  onToggleSection,
  onToggleMapExpanded,
  onSelectMap,
  onSelectPerspective,
  onDeleteMap,
  onDeletePerspective,
  onCreatePerspective,
  onDragStart,
  onDragEnd,
}: SharedMapsSectionProps) => {
  // Get all pending invitations for the current user
  const pendingInvitations = useAllPendingInvitations()
  const hasPendingInvitations = pendingInvitations.length > 0

  // Show section if there are shared maps OR pending invitations
  if (maps.length === 0 && !hasPendingInvitations) return null

  return (
    <div>
      <SectionHeader 
        title="Shared with me" 
        isExpanded={isExpanded} 
        onToggle={onToggleSection}
        showNotificationDot={hasPendingInvitations}
      />
      {isExpanded && (
        <div className="pl-3">
          <ul className="divide-y">
            {/* Show pending invitations first */}
            {pendingInvitations.map((invitation) => (
              <PendingInvitationEntry
                key={invitation.id}
                invitation={invitation}
                onSelectMap={onSelectMap}
              />
            ))}
            {/* Then show shared maps */}
            {maps.map((map) => {
              const perspectives = allPerspectives
                .filter((p) => p.mapId === map.id)
                .map((p) => ({
                  id: p.id,
                  mapId: p.mapId,
                  name: p.name,
                  createdBy: p.createdBy,
                }))
              const isMapExpanded = expandedMaps.has(map.id)
              const isMapSelected = currentMapId === map.id && !currentPerspectiveId
              const hasActivePerspective = Boolean(currentPerspectiveId && perspectives.some((p) => p.id === currentPerspectiveId))
              const isSelected = isMapSelected || hasActivePerspective

              return (
                <MapEntry
                  key={map.id}
                  map={map}
                  perspectives={perspectives}
                  isExpanded={isMapExpanded}
                  isSelected={isSelected}
                  currentPerspectiveId={currentPerspectiveId}
                  userId={userId}
                  draggedMapId={draggedMapId}
                  onToggleExpanded={(mapId: string) => onToggleMapExpanded(mapId)}
                  onSelectMap={onSelectMap}
                  onSelectPerspective={onSelectPerspective}
                  onDeleteMap={onDeleteMap}
                  onDeletePerspective={(perspectiveId, perspectiveName, e) =>
                    onDeletePerspective(perspectiveId, perspectiveName, map.id, e)
                  }
                  onCreatePerspective={onCreatePerspective}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
})

SharedMapsSection.displayName = 'SharedMapsSection'


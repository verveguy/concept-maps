/**
 * My Maps section component for the sidebar.
 * Displays all maps owned by the current user.
 */

import { memo } from 'react'
import type { Map } from '@/lib/schema'
import { MapEntry } from './MapEntry'
import { SectionHeader } from './SectionHeader'

interface Perspective {
  id: string
  mapId: string
  name: string
  conceptIds: string[]
  relationshipIds: string[]
  createdBy: string
  createdAt: Date
}

interface MyMapsSectionProps {
  maps: Map[]
  allPerspectives: Perspective[]
  isExpanded: boolean
  expandedMaps: Set<string>
  draggedMapId: string | null
  currentMapId: string | null
  currentPerspectiveId: string | null
  userId: string | null
  isCreatingMap: boolean
  onToggleSection: () => void
  onToggleMapExpanded: (mapId: string) => void
  onSelectMap: (mapId: string) => void
  onSelectPerspective: (perspectiveId: string, mapId: string, e: React.MouseEvent) => void
  onDeleteMap: (mapId: string, mapName: string, e: React.MouseEvent) => void
  onDeletePerspective: (perspectiveId: string, perspectiveName: string, mapId: string, e: React.MouseEvent) => void
  onCreatePerspective: (mapId: string) => void
  onCreateMap: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent, mapId: string) => void
  onDragEnd: () => void
}

export const MyMapsSection = memo(({
  maps,
  allPerspectives,
  isExpanded,
  expandedMaps,
  draggedMapId,
  currentMapId,
  currentPerspectiveId,
  userId,
  isCreatingMap,
  onToggleSection,
  onToggleMapExpanded,
  onSelectMap,
  onSelectPerspective,
  onDeleteMap,
  onDeletePerspective,
  onCreatePerspective,
  onCreateMap,
  onDragStart,
  onDragEnd,
}: MyMapsSectionProps) => {
  return (
    <div>
      <SectionHeader
        title="My Maps"
        isExpanded={isExpanded}
        onToggle={onToggleSection}
        actionButton={{
          onClick: onCreateMap,
          disabled: isCreatingMap,
          title: 'Create Map',
        }}
      />
      {isExpanded && (
        <div className="pl-3">
          <ul className="divide-y">
            {maps.length > 0 &&
              maps.map((map) => {
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
            {maps.length === 0 && (
              <li>
                <div className="px-3 py-2 text-xs text-muted-foreground">No maps yet</div>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
})

MyMapsSection.displayName = 'MyMapsSection'


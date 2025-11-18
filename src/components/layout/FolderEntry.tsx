/**
 * FolderEntry component for rendering folder items in the sidebar.
 * Handles folder expansion, drag-and-drop, and displays maps within folders.
 */

import { memo } from 'react'
import { ChevronRight, ChevronDown, Trash2 } from 'lucide-react'
import type { Folder } from '@/lib/schema'
import type { Map } from '@/lib/schema'
import { MapEntry } from './MapEntry'

interface Perspective {
  id: string
  mapId: string
  name: string
}

interface FolderEntryProps {
  folder: Folder
  maps: Map[]
  allPerspectives: Perspective[]
  isExpanded: boolean
  isDragOver: boolean
  currentMapId: string | null
  currentPerspectiveId: string | null
  isCreatingPerspective: string | null
  newPerspectiveName: string
  userId: string | null
  draggedMapId: string | null
  onToggleFolder: (folderId: string) => void
  onDeleteFolder: (folderId: string, folderName: string) => void
  onSelectMap: (mapId: string) => void
  onSelectPerspective: (perspectiveId: string, mapId: string, e: React.MouseEvent) => void
  onDeleteMap: (mapId: string, mapName: string, e: React.MouseEvent) => void
  onCreatePerspective: (e: React.FormEvent, mapId: string) => void
  onSetCreatingPerspective: (mapId: string | null) => void
  onSetNewPerspectiveName: (name: string) => void
  onToggleMapExpanded: (mapId: string) => void
  expandedMaps: Set<string>
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragStart: (e: React.DragEvent, mapId: string) => void
  onDragEnd: () => void
}

export const FolderEntry = memo(({
  folder,
  maps,
  allPerspectives,
  isExpanded,
  isDragOver,
  currentMapId,
  currentPerspectiveId,
  isCreatingPerspective,
  newPerspectiveName,
  userId,
  draggedMapId,
  onToggleFolder,
  onDeleteFolder,
  onSelectMap,
  onSelectPerspective,
  onDeleteMap,
  onCreatePerspective,
  onSetCreatingPerspective,
  onSetNewPerspectiveName,
  onToggleMapExpanded,
  expandedMaps,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
}: FolderEntryProps) => {
  return (
    <li>
      <div 
        className={`group relative flex items-center ${isDragOver ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <button
          onClick={() => onToggleFolder(folder.id)}
          className="flex-shrink-0 p-2 hover:bg-accent transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={() => onToggleFolder(folder.id)}
          className="flex-1 text-left px-1 py-2 hover:bg-accent transition-colors flex items-center gap-2"
        >
          <div className="flex-1 text-sm font-medium flex items-center gap-1.5">
            {folder.name}
          </div>
          <span className="text-xs text-muted-foreground">{maps.length}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDeleteFolder(folder.id, folder.name)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete folder"
          aria-label={`Delete ${folder.name}`}
        >
          <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
        </button>
      </div>
      {isExpanded && (
        <div className="pl-3">
          <ul className="bg-muted/20 divide-y">
            {maps.length === 0 ? (
              <li className="px-6 py-2 text-xs text-muted-foreground">No maps in this folder</li>
            ) : (
              maps.map((map) => {
                const perspectives = allPerspectives.filter((p) => p.mapId === map.id)
                const isMapExpanded = expandedMaps.has(map.id)
                const isMapSelected = currentMapId === map.id && !currentPerspectiveId
                const hasActivePerspective = currentPerspectiveId && perspectives.some(p => p.id === currentPerspectiveId)
                const isSelected = isMapSelected || hasActivePerspective

                return (
                  <MapEntry
                    key={map.id}
                    map={map}
                    perspectives={perspectives}
                    isExpanded={isMapExpanded}
                    isSelected={isSelected}
                    currentPerspectiveId={currentPerspectiveId}
                    isCreatingPerspective={isCreatingPerspective}
                    newPerspectiveName={newPerspectiveName}
                    userId={userId}
                    draggedMapId={draggedMapId}
                    onToggleExpanded={onToggleMapExpanded}
                    onSelectMap={onSelectMap}
                    onSelectPerspective={onSelectPerspective}
                    onDeleteMap={onDeleteMap}
                    onCreatePerspective={onCreatePerspective}
                    onSetCreatingPerspective={onSetCreatingPerspective}
                    onSetNewPerspectiveName={onSetNewPerspectiveName}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                )
              })
            )}
          </ul>
        </div>
      )}
    </li>
  )
})

FolderEntry.displayName = 'FolderEntry'


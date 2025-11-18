/**
 * Folders section component for the sidebar.
 * Displays folders with their maps and handles folder creation.
 */

import { memo } from 'react'
import type { Folder, Map as MapType } from '@/lib/schema'
import { FolderEntry } from './FolderEntry'
import { SectionHeader } from './SectionHeader'
import { CreateFolderForm } from './CreateFolderForm'

interface Perspective {
  id: string
  mapId: string
  name: string
  conceptIds: string[]
  relationshipIds: string[]
  createdBy: string
  createdAt: Date
}

interface FoldersSectionProps {
  folders: Folder[]
  mapsByFolder: Map<string, MapType[]>
  allPerspectives: Perspective[]
  isExpanded: boolean
  expandedFolders: Set<string>
  draggedMapId: string | null
  dragOverFolderId: string | null
  currentMapId: string | null
  currentPerspectiveId: string | null
  userId: string | null
  expandedMaps: Set<string>
  isCreatingFolder: boolean
  newFolderName: string
  onToggleSection: () => void
  onToggleFolder: (folderId: string) => void
  onToggleMapExpanded: (mapId: string) => void
  onSelectMap: (mapId: string) => void
  onSelectPerspective: (perspectiveId: string, mapId: string, e: React.MouseEvent) => void
  onDeleteMap: (mapId: string, mapName: string, e: React.MouseEvent) => void
  onDeletePerspective: (perspectiveId: string, perspectiveName: string, mapId: string, e: React.MouseEvent) => void
  onCreatePerspective: (mapId: string) => void
  onDeleteFolder: (folderId: string, folderName: string) => void
  onDragOver: (e: React.DragEvent, folderId: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, folderId: string) => void
  onDragStart: (e: React.DragEvent, mapId: string) => void
  onDragEnd: () => void
  onCreateFolderClick: (e: React.MouseEvent) => void
  onCreateFolder: (e: React.FormEvent) => void
  onFolderNameChange: (name: string) => void
  onCancelCreateFolder: () => void
}

export const FoldersSection = memo(({
  folders,
  mapsByFolder,
  allPerspectives,
  isExpanded,
  expandedFolders,
  draggedMapId,
  dragOverFolderId,
  currentMapId,
  currentPerspectiveId,
  userId,
  expandedMaps,
  isCreatingFolder,
  newFolderName,
  onToggleSection,
  onToggleFolder,
  onToggleMapExpanded,
  onSelectMap,
  onSelectPerspective,
  onDeleteMap,
  onDeletePerspective,
  onCreatePerspective,
  onDeleteFolder,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onCreateFolderClick,
  onCreateFolder,
  onFolderNameChange,
  onCancelCreateFolder,
}: FoldersSectionProps) => {
  return (
    <div>
      <SectionHeader
        title="Folders"
        isExpanded={isExpanded}
        onToggle={onToggleSection}
        actionButton={
          isCreatingFolder
            ? undefined
            : {
                onClick: onCreateFolderClick,
                title: 'New Folder',
              }
        }
      />
      {isCreatingFolder && (
        <CreateFolderForm
          folderName={newFolderName}
          onFolderNameChange={onFolderNameChange}
          onSubmit={onCreateFolder}
          onCancel={onCancelCreateFolder}
        />
      )}
      {isExpanded && (
        <div className="pl-3">
          {folders.length > 0 && (
            <ul className="divide-y">
              {folders.map((folder) => {
                const folderMaps = mapsByFolder.get(folder.id) || []
                const isFolderExpanded = expandedFolders.has(folder.id)
                const isDragOver = dragOverFolderId === folder.id && draggedMapId !== null

                return (
                  <FolderEntry
                    key={folder.id}
                    folder={folder}
                    maps={folderMaps}
                    allPerspectives={allPerspectives}
                    isExpanded={isFolderExpanded}
                    isDragOver={isDragOver}
                    currentMapId={currentMapId}
                    currentPerspectiveId={currentPerspectiveId}
                    userId={userId}
                    draggedMapId={draggedMapId}
                    onToggleFolder={onToggleFolder}
                    onDeleteFolder={onDeleteFolder}
                    onSelectMap={onSelectMap}
                    onSelectPerspective={onSelectPerspective}
                    onDeleteMap={onDeleteMap}
                    onDeletePerspective={onDeletePerspective}
                    onCreatePerspective={onCreatePerspective}
                    onToggleMapExpanded={onToggleMapExpanded}
                    expandedMaps={expandedMaps}
                    onDragOver={(e) => onDragOver(e, folder.id)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, folder.id)}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                )
              })}
            </ul>
          )}
          {folders.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No folders yet</div>
          )}
        </div>
      )}
    </div>
  )
})

FoldersSection.displayName = 'FoldersSection'


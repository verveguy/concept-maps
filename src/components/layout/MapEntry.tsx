/**
 * MapEntry component for rendering individual map items in the sidebar.
 * Handles map selection, expansion, perspective display, and drag-and-drop.
 */

import { memo } from 'react'
import { ChevronRight, ChevronDown, Eye, Trash2 } from 'lucide-react'
import type { Map } from '@/lib/schema'
import { IconButton } from '@/components/ui/IconButton'

interface Perspective {
  id: string
  mapId: string
  name: string
  createdBy?: string
}

interface MapEntryProps {
  map: Map
  perspectives: Perspective[]
  isExpanded: boolean
  isSelected: boolean
  currentPerspectiveId: string | null
  userId: string | null
  draggedMapId: string | null
  onToggleExpanded: (mapId: string) => void
  onSelectMap: (mapId: string) => void
  onSelectPerspective: (perspectiveId: string, mapId: string, e: React.MouseEvent) => void
  onDeleteMap: (mapId: string, mapName: string, e: React.MouseEvent) => void
  onDeletePerspective: (perspectiveId: string, perspectiveName: string, e: React.MouseEvent) => void
  onCreatePerspective: (mapId: string) => void
  onDragStart: (e: React.DragEvent, mapId: string) => void
  onDragEnd: () => void
}

export const MapEntry = memo(({
  map,
  perspectives,
  isExpanded,
  isSelected,
  currentPerspectiveId,
  userId,
  draggedMapId,
  onToggleExpanded,
  onSelectMap,
  onSelectPerspective,
  onDeleteMap,
  onDeletePerspective,
  onCreatePerspective,
  onDragStart,
  onDragEnd,
}: MapEntryProps) => {
  const isDragging = draggedMapId === map.id

  return (
    <li>
      <div>
        {/* Map Header */}
        <div 
          className={`group relative flex items-center ${isDragging ? 'opacity-50' : ''}`}
          draggable={true}
          onDragStart={(e) => {
            // Allow dragging any map (owned or shared) into folders
            onDragStart(e, map.id)
          }}
          onDragEnd={onDragEnd}
        >
          
            <div className="shrink-0 w-2"></div>
          
          <button
            onClick={() => {
              onSelectMap(map.id)
            }}
            className={`flex-1 text-left px-1 py-2 hover:bg-accent transition-colors flex items-center gap-2 ${
              isSelected 
                ? 'bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 font-semibold text-black dark:text-white' 
                : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">
                {map.name}
                
              </div>
              {perspectives.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpanded(map.id)
              }}
              className="shrink-0 w-8 p-2 hover:bg-accent transition-colors flex items-center justify-center relative z-10"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="shrink-0 w-8"></div>
          )}
            </div>
            </div>
            {/* Chevron button - positioned after map name */}
          
          </button>
          
          {/* Button bar - shows on hover, absolutely positioned to overlay */}
          <div className="absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {/* Add Perspective button */}
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                onCreatePerspective(map.id)
              }}
              title="Add Perspective"
              size="icon"
              className="h-7 w-7 pointer-events-auto bg-background/90 backdrop-blur-sm"
            >
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </IconButton>
            {/* Delete button */}
            {map.createdBy === userId && (
              <IconButton
                onClick={(e) => onDeleteMap(map.id, map.name, e)}
                title="Delete map"
                aria-label={`Delete ${map.name}`}
                size="icon"
                className="h-7 w-7 pointer-events-auto bg-background/90 backdrop-blur-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && perspectives.length > 0 && (
          <div className="bg-muted/20">
            {/* Perspectives List */}
            <ul className="bg-muted/30 divide-y">
              {perspectives.map((perspective) => {
                const isPerspectiveSelected = currentPerspectiveId === perspective.id
                return (
                  <li key={perspective.id}>
                    <div className="flex">
                      {/* Spacer div to align with map name text (chevron width + padding) */}
                      <div className="w-6 shrink-0"></div>
                      {/* Perspective content with highlight */}
                      <div className={`group/perspective relative flex-1 pr-3 ${isPerspectiveSelected ? 'bg-blue-50 dark:bg-blue-900' : ''}`}>
                        <button
                          onClick={(e) => onSelectPerspective(perspective.id, map.id, e)}
                          className={`w-full text-left py-1.5 hover:bg-accent transition-colors flex items-center gap-2 ${
                            isPerspectiveSelected 
                              ? 'border-l-4 border-blue-500 font-semibold text-black dark:text-white' 
                              : ''
                          }`}
                          title={`Click to view/edit perspective`}
                        >
                          <div className="flex-1 pl-1 min-w-0">
                            <div className="text-sm font-medium">{perspective.name}</div>
                          </div>
                        </button>
                        {/* Delete button - shows on hover */}
                        {perspective.createdBy === userId && (
                          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-1 opacity-0 group-hover/perspective:opacity-100 transition-opacity pointer-events-none">
                            <IconButton
                              onClick={(e) => onDeletePerspective(perspective.id, perspective.name, e)}
                              title="Delete perspective"
                              aria-label={`Delete ${perspective.name}`}
                              size="icon"
                              className="h-7 w-7 pointer-events-auto bg-background/90 backdrop-blur-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconButton>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </li>
  )
})

MapEntry.displayName = 'MapEntry'


/**
 * Sidebar component for browsing maps and perspectives.
 * 
 * Provides the main navigation interface for the application, displaying maps,
 * perspectives, and user controls. The sidebar can be collapsed/expanded and
 * includes various utility features.
 * 
 * **Features:**
 * - Map list with creation and selection
 * - Perspective management (create, edit, delete, select)
 * - User avatar and profile
 * - Theme toggle (light/dark mode)
 * - Documentation link
 * - Video tutorial link
 * - Empty trash functionality
 * - Collapsible/expandable sections
 * 
 * **Map Management:**
 * - Lists all accessible maps (owned or shared)
 * - Create new maps with name input
 * - Select map to view/edit
 * - Delete maps (with confirmation)
 * - Shows map creation date
 * 
 * **Perspective Management:**
 * - Lists perspectives for the current map
 * - Create new perspectives
 * - Edit perspective (toggle concepts/relationships)
 * - Delete perspectives
 * - Select perspective to filter view
 * 
 * **Performance:**
 * Uses memoized sub-components to prevent unnecessary re-renders when presence
 * updates occur. Only the UserAvatarSection re-renders on presence changes.
 * 
 * @returns The sidebar JSX component
 * 
 * @example
 * ```tsx
 * import { Sidebar } from '@/components/layout/Sidebar'
 * 
 * function App() {
 *   return (
 *     <div className="flex">
 *       <Sidebar />
 *       <MainContent />
 *     </div>
 *   )
 * }
 * ```
 */

import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { X, Plus, Play, ChevronRight, ChevronDown, Eye, Settings, Sun, Moon, BookOpen, Trash2 } from 'lucide-react'
import { useMaps } from '@/hooks/useMaps'
import { useMapActions } from '@/hooks/useMapActions'
import { usePerspectiveCommands } from '@/hooks/usePerspectiveCommands'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { db } from '@/lib/instant'
import { navigateToMap } from '@/utils/navigation'
import { format } from 'date-fns'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { UserAvatarSection } from './UserAvatarSection'

/**
 * Memoized video popover component.
 * Extracted to prevent re-renders when parent Sidebar re-renders due to presence updates.
 */
const VideoPopover = memo(() => {
  return (
    <div className="p-4 border-t">
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-2">
            <Play className="h-4 w-4" />
            Watch James Ross Video
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[800px] max-w-[90vw] p-0" align="start">
          <div className="relative aspect-video w-full">
            <iframe
              className="absolute inset-0 w-full h-full rounded-lg"
              src="https://www.youtube.com/embed/0tsUpOmUv88"
              title="James Ross Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
})
VideoPopover.displayName = 'VideoPopover'

/**
 * Memoized documentation link component.
 * Extracted to prevent re-renders when parent Sidebar re-renders due to presence updates.
 */
const DocumentationLink = memo(() => {
  return (
    <div className="p-4 border-t">
      <a
        href={import.meta.env.PROD ? '/concept-maps/docs/' : 'http://localhost:3000/concept-maps/docs/'}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-2"
        title="Open documentation in a new tab"
      >
        <BookOpen className="h-4 w-4" />
        Documentation
      </a>
    </div>
  )
})
DocumentationLink.displayName = 'DocumentationLink'

/**
 * Memoized theme toggle component.
 * Extracted to prevent re-renders when parent Sidebar re-renders due to presence updates.
 * 
 * @param isDarkMode - Current dark mode state
 * @param toggleTheme - Function to toggle theme
 */
const ThemeToggle = memo(({ isDarkMode, toggleTheme }: { isDarkMode: boolean; toggleTheme: () => void }) => {
  return (
    <div className="p-4 border-t">
      <button
        onClick={toggleTheme}
        className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors flex items-center gap-2"
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? (
          <>
            <Sun className="h-4 w-4" />
            Light Mode
          </>
        ) : (
          <>
            <Moon className="h-4 w-4" />
            Dark Mode
          </>
        )}
      </button>
    </div>
  )
})
ThemeToggle.displayName = 'ThemeToggle'

/**
 * Sidebar component for browsing maps and perspectives.
 * Displays list of maps, allows creating new maps, and selecting a map.
 * 
 * @returns The sidebar JSX
 */
export const Sidebar = () => {
  const { createMap, deleteMap } = useMapActions()
  const { createPerspective } = usePerspectiveCommands()
  const { currentMapId, currentPerspectiveId, setCurrentMapId, setCurrentPerspectiveId } = useMapStore()
  const { setSidebarOpen } = useUIStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [expandedMaps, setExpandedMaps] = useState<Set<string>>(new Set([currentMapId || '']))
  const [isCreatingPerspective, setIsCreatingPerspective] = useState<string | null>(null)
  const [newPerspectiveName, setNewPerspectiveName] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null)

  const maps = useMaps()
  // Get all perspectives for all maps (not filtered by currentMapId)
  const { data: perspectivesData } = db.useQuery({
    perspectives: {
      creator: {},
      map: {},
    },
  })
  // Memoize allPerspectives to avoid creating new array/object references on every render
  // This prevents unnecessary re-renders when component parent re-renders
  const allPerspectives = useMemo(() => {
    return (perspectivesData?.perspectives || []).map((p: any) => ({
      id: p.id,
      mapId: p.map?.id || '',
      name: p.name,
      conceptIds: p.conceptIds ? JSON.parse(p.conceptIds) : [],
      relationshipIds: p.relationshipIds ? JSON.parse(p.relationshipIds) : [],
      createdBy: p.creator?.id || '',
      createdAt: new Date(p.createdAt),
    }))
  }, [perspectivesData])

  
  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark)
    
    setIsDarkMode(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Toggle theme - wrapped in useCallback to maintain stable reference for memoized ThemeToggle component
  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => {
      const newIsDark = !prev
      
      if (newIsDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      
      return newIsDark
    })
  }, [])

  // Auto-expand map when a perspective is selected
  useEffect(() => {
    if (currentPerspectiveId && currentMapId) {
      setExpandedMaps((prev) => new Set([...prev, currentMapId]))
    }
  }, [currentPerspectiveId, currentMapId])

  const handleCreateMap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMapName.trim()) return

    setIsCreating(true)
    try {
      await createMap(newMapName.trim())
      setNewMapName('')
    } catch (error) {
      console.error('Failed to create map:', error)
      alert('Failed to create map. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreatePerspective = async (e: React.FormEvent, mapId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!newPerspectiveName.trim()) return

    setIsCreatingPerspective(mapId)
    try {
      await createPerspective({
        mapId,
        name: newPerspectiveName.trim(),
        conceptIds: [],
        relationshipIds: [],
      })
      setNewPerspectiveName('')
      setIsCreatingPerspective(null)
      // Expand the map to show the new perspective
      setExpandedMaps(new Set([...expandedMaps, mapId]))
    } catch (error) {
      console.error('Failed to create perspective:', error)
      alert('Failed to create perspective. Please try again.')
    } finally {
      setIsCreatingPerspective(null)
    }
  }

  const toggleMapExpanded = (mapId: string) => {
    const newExpanded = new Set(expandedMaps)
    if (newExpanded.has(mapId)) {
      newExpanded.delete(mapId)
    } else {
      newExpanded.add(mapId)
    }
    setExpandedMaps(newExpanded)
  }

  /**
   * Handle selecting a map.
   * Navigates to the map URL and clears the current perspective.
   * 
   * @param mapId - ID of the map to select
   */
  const handleSelectMap = (mapId: string) => {
    navigateToMap(mapId)
    setCurrentPerspectiveId(null) // Clear perspective when selecting map
  }

  /**
   * Handle selecting a perspective.
   * Navigates to the map URL and sets the selected perspective.
   * 
   * @param perspectiveId - ID of the perspective to select
   * @param mapId - ID of the map containing the perspective
   * @param e - Mouse event to stop propagation
   */
  const handleSelectPerspective = (perspectiveId: string, mapId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigateToMap(mapId)
    setCurrentPerspectiveId(perspectiveId)
  }

  /**
   * Open the delete confirmation dialog for a map.
   * 
   * @param mapId - ID of the map to delete
   * @param mapName - Name of the map (for confirmation message)
   * @param e - Mouse event to stop propagation
   */
  const handleDeleteMapClick = (mapId: string, mapName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setMapToDelete({ id: mapId, name: mapName })
  }

  /**
   * Handle map deletion after confirmation.
   * Soft deletes the map and clears selection if it's the current map.
   */
  const handleConfirmDelete = async () => {
    if (!mapToDelete) return

    try {
      await deleteMap(mapToDelete.id)
      // If the deleted map is the current map, clear the selection
      if (currentMapId === mapToDelete.id) {
        setCurrentMapId(null)
        setCurrentPerspectiveId(null)
      }
      setMapToDelete(null)
    } catch (error) {
      console.error('Failed to delete map:', error)
      alert('Failed to delete map. Please try again.')
      setMapToDelete(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Maps</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Create Map Form */}
      <div className="p-4 border-b">
        <form onSubmit={handleCreateMap} className="space-y-2">
          <input
            type="text"
            value={newMapName}
            onChange={(e) => setNewMapName(e.target.value)}
            placeholder="New map name..."
            className="w-full px-3 py-2 text-sm border rounded-md"
            disabled={isCreating}
            autoFocus
          />
          <button
            type="submit"
            disabled={isCreating || !newMapName.trim()}
            className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? 'Creating...' : 'Create Map'}
          </button>
        </form>
      </div>

      {/* Maps List */}
      <div className="flex-1 overflow-y-auto">
        {maps.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No maps yet. Create your first map above!
          </div>
        ) : (
          <ul className="divide-y">
            {maps.map((map) => {
              const perspectives = allPerspectives.filter((p) => p.mapId === map.id)
              const isExpanded = expandedMaps.has(map.id)
              // Map is selected if it's the current map and no perspective is selected
              // OR if a perspective from this map is selected
              const isMapSelected = currentMapId === map.id && !currentPerspectiveId
              const hasActivePerspective = currentPerspectiveId && perspectives.some(p => p.id === currentPerspectiveId)
              const isSelected = isMapSelected || hasActivePerspective
              const isCreatingPerspectiveForThisMap = isCreatingPerspective === map.id

              return (
                <li key={map.id}>
                  <div>
                    {/* Map Header */}
                    <div className="group relative">
                      <button
                        onClick={() => {
                          toggleMapExpanded(map.id)
                          handleSelectMap(map.id)
                        }}
                        className={`w-full text-left p-4 hover:bg-accent transition-colors flex items-center gap-2 ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 font-semibold text-black dark:text-white' 
                            : ''
                        }`}
                      >
                        {perspectives.length > 0 && (
                          <div className="flex-shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{map.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Updated {format(map.updatedAt, 'MMM d, yyyy')}
                            {perspectives.length > 0 && ` ? ${perspectives.length} perspective${perspectives.length === 1 ? '' : 's'}`}
                          </div>
                        </div>
                      </button>
                      {/* Delete button - shows on hover only */}
                      <button
                        onClick={(e) => handleDeleteMapClick(map.id, map.name, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete map"
                        aria-label={`Delete ${map.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      </button>
                    </div>

                    {/* Perspectives List */}
                    {isExpanded && perspectives.length > 0 && (
                      <ul className="bg-muted/30">
                        {perspectives.map((perspective) => {
                          const isPerspectiveSelected = currentPerspectiveId === perspective.id
                          return (
                            <li key={perspective.id}>
                              <button
                                onClick={(e) => handleSelectPerspective(perspective.id, map.id, e)}
                                className={`w-full text-left pl-12 pr-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 group ${
                                  isPerspectiveSelected 
                                    ? 'bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 font-semibold text-black dark:text-white' 
                                    : ''
                                }`}
                                title={`Click to ${isPerspectiveSelected ? 'view/edit' : 'edit'} perspective`}
                              >
                                <Eye className={`h-3 w-3 flex-shrink-0 ${
                                  isPerspectiveSelected ? 'text-blue-600 dark:text-blue-300' : 'text-muted-foreground'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">{perspective.name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {perspective.conceptIds.length} concept{perspective.conceptIds.length === 1 ? '' : 's'} ? {perspective.relationshipIds.length} relationship{perspective.relationshipIds.length === 1 ? '' : 's'}
                                  </div>
                                </div>
                                <Settings className={`h-3 w-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                                  isPerspectiveSelected ? 'opacity-100' : ''
                                }`} />
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    {/* Create Perspective Form */}
                    {isExpanded && (
                      <div className="px-4 py-2 bg-muted/20">
                        {isCreatingPerspectiveForThisMap ? (
                          <form
                            onSubmit={(e) => handleCreatePerspective(e, map.id)}
                            className="space-y-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={newPerspectiveName}
                              onChange={(e) => setNewPerspectiveName(e.target.value)}
                              placeholder="New perspective name..."
                              className="w-full px-2 py-1.5 text-xs border rounded-md"
                              autoFocus
                              onBlur={() => {
                                if (!newPerspectiveName.trim()) {
                                  setIsCreatingPerspective(null)
                                  setNewPerspectiveName('')
                                }
                              }}
                            />
                            <div className="flex gap-1">
                              <button
                                type="submit"
                                disabled={!newPerspectiveName.trim()}
                                className="flex-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                              >
                                Create
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingPerspective(null)
                                  setNewPerspectiveName('')
                                }}
                                className="px-2 py-1 text-xs border rounded-md hover:bg-accent"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsCreatingPerspective(map.id)
                            }}
                            className="w-full text-left pl-12 pr-4 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors flex items-center gap-2"
                          >
                            <Plus className="h-3 w-3" />
                            Add Perspective
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Video Link - Memoized to prevent re-renders */}
      <VideoPopover />

      {/* Documentation Link - Memoized to prevent re-renders */}
      <DocumentationLink />

      {/* Theme Toggle - Memoized to prevent re-renders */}
      <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

      {/* User Avatar - Isolated component with its own hook, won't cause Sidebar re-renders */}
      <UserAvatarSection />

      {/* Delete Map Confirmation Dialog */}
      <AlertDialog open={!!mapToDelete} onOpenChange={(open) => !open && setMapToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Map</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{mapToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
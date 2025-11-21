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
import { X, Plus, Play, Sun, Moon, BookOpen } from 'lucide-react'
import { useMaps, categorizeMaps } from '@/hooks/useMaps'
import { useMapActions } from '@/hooks/useMapActions'
import { usePerspectiveActions } from '@/hooks/usePerspectiveActions'
import { useFolders, createFolder, deleteFolder, addMapToFolder, removeMapFromFolder } from '@/hooks/useFolders'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { useUndoStore } from '@/stores/undoStore'
import type { CreateMapCommand, CreatePerspectiveCommand, DeletePerspectiveCommand } from '@/stores/undoStore'
import { db } from '@/lib/instant'
import { navigateToMap } from '@/utils/navigation'
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
import { MapEntry } from './MapEntry'
import { FolderEntry } from './FolderEntry'

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
  const { createPerspective, deletePerspective } = usePerspectiveActions()
  const { currentMapId, currentPerspectiveId, setCurrentMapId, setCurrentPerspectiveId, setNewlyCreatedMapId, setNewlyCreatedPerspectiveId } = useMapStore()
  const { setSidebarOpen } = useUIStore()
  const { recordMutation, startOperation, endOperation } = useUndoStore()
  const [isCreatingMap, setIsCreatingMap] = useState(false)
  // Track expansion state per section: 'folders', 'myMaps', 'shared'
  const [expandedMaps, setExpandedMaps] = useState<Map<string, Set<string>>>(new Map([
    ['folders', new Set()],
    ['myMaps', new Set()],
    ['shared', new Set()],
  ]))
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null)
  const [perspectiveToDelete, setPerspectiveToDelete] = useState<{ id: string; name: string; mapId: string } | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<'folders' | 'myMaps' | 'shared'>>(
    new Set(['folders', 'myMaps', 'shared'])
  )
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null)
  
  // Drag and drop state
  const [draggedMapId, setDraggedMapId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  const auth = db.useAuth()
  const userId = auth.user?.id || null
  const maps = useMaps()
  const folders = useFolders()
  
  // Query folders with their maps
  const { data: foldersData } = db.useQuery(
    userId
      ? {
          folders: {
            creator: {},
            maps: {},
          },
        }
      : null
  )
  
  // Query shares to identify shared maps
  const { data: sharesData } = db.useQuery(
    userId
      ? {
          shares: {
            user: {},
            map: {},
          },
        }
      : null
  )
  
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
  
  // Get shared map IDs from shares
  const sharedMapIds = useMemo(() => {
    const ids = new Set<string>()
    if (sharesData?.shares) {
      for (const share of sharesData.shares) {
        if (share.map?.id && share.status === 'active') {
          ids.add(share.map.id)
        }
      }
    }
    return ids
  }, [sharesData])
  
  // Categorize maps into owned and shared
  const { ownedMaps, sharedMaps } = useMemo(() => {
    return categorizeMaps(maps, userId, sharedMapIds)
  }, [maps, userId, sharedMapIds])
  
  // Build map of folder ID to map IDs
  const folderMapIds = useMemo(() => {
    const map = new Map<string, Set<string>>()
    if (foldersData?.folders) {
      for (const folder of foldersData.folders) {
        if (!folder.deletedAt && folder.maps) {
          const mapIds = new Set<string>()
          for (const mapItem of folder.maps) {
            if (mapItem?.id) {
              mapIds.add(mapItem.id)
            }
          }
          map.set(folder.id, mapIds)
        }
      }
    }
    return map
  }, [foldersData])
  
  // Get all maps (owned + shared) for folder organization
  const allMapsForFolders = useMemo(() => {
    return [...ownedMaps, ...sharedMaps]
  }, [ownedMaps, sharedMaps])

  // Get maps organized by folder (includes both owned and shared maps)
  const mapsByFolder = useMemo(() => {
    const byFolder = new Map<string, typeof allMapsForFolders>()
    const mapsInFolders = new Set<string>()
    
    // Group maps by folder (both owned and shared)
    for (const folder of folders) {
      const folderMaps: typeof allMapsForFolders = []
      const mapIds = folderMapIds.get(folder.id) || new Set()
      for (const map of allMapsForFolders) {
        if (mapIds.has(map.id)) {
          folderMaps.push(map)
          mapsInFolders.add(map.id)
        }
      }
      if (folderMaps.length > 0) {
        byFolder.set(folder.id, folderMaps)
      }
    }
    
    return byFolder
  }, [folders, allMapsForFolders, folderMapIds])

  // My Maps and Shared with Me show ALL maps in those categories (regardless of folder membership)
  // Maps can appear in both their folder AND their category section
  
  const toggleSection = (section: 'folders' | 'myMaps' | 'shared') => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }
  
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }
  
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim() || !userId) return
    
    setIsCreatingFolder(true)
    try {
      await createFolder(newFolderName.trim(), userId)
      setNewFolderName('')
      setIsCreatingFolder(false)
    } catch (error) {
      console.error('Failed to create folder:', error)
      alert('Failed to create folder. Please try again.')
      setIsCreatingFolder(false)
    }
  }
  
  const handleDeleteFolder = async () => {
    if (!folderToDelete) return
    
    try {
      await deleteFolder(folderToDelete.id)
      setFolderToDelete(null)
    } catch (error) {
      console.error('Failed to delete folder:', error)
      alert('Failed to delete folder. Please try again.')
      setFolderToDelete(null)
    }
  }
  
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


  const handleCreateMap = async () => {
    setIsCreatingMap(true)
    try {
      // Start operation for undo tracking
      startOperation()
      
      const newMap = await createMap('Untitled')
      // Select the newly created map and mark it as newly created
      if (newMap?.id) {
        // Record mutation for undo
        const command: CreateMapCommand = {
          type: 'createMap',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          mapId: newMap.id,
          name: 'Untitled',
        }
        recordMutation(command)
        
        setNewlyCreatedMapId(newMap.id)
        setCurrentPerspectiveId(null)
        // Navigate to the map (this will also set currentMapId)
        navigateToMap(newMap.id)
      }
      
      // End operation
      endOperation()
    } catch (error) {
      console.error('Failed to create map:', error)
      alert('Failed to create map. Please try again.')
      // End operation even on error
      endOperation()
    } finally {
      setIsCreatingMap(false)
    }
  }

  const handleCreatePerspective = async (mapId: string) => {
    try {
      // Start operation for undo tracking
      startOperation()
      
      const newPerspective = await createPerspective({
        mapId,
        name: 'Untitled',
        conceptIds: [],
        relationshipIds: [],
      })
      // Select the newly created perspective and mark it as newly created
      if (newPerspective?.id) {
        // Record mutation for undo
        const command: CreatePerspectiveCommand = {
          type: 'createPerspective',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          perspectiveId: newPerspective.id,
          mapId,
          name: 'Untitled',
          conceptIds: [],
          relationshipIds: [],
        }
        recordMutation(command)
        
        setNewlyCreatedPerspectiveId(newPerspective.id)
        setCurrentPerspectiveId(newPerspective.id)
        // Navigate to the map (perspective is set via store)
        navigateToMap(mapId)
      }
      
      // End operation
      endOperation()
    } catch (error) {
      console.error('Failed to create perspective:', error)
      alert('Failed to create perspective. Please try again.')
      // End operation even on error
      endOperation()
    }
  }

  const toggleMapExpanded = useCallback((mapId: string, section: 'folders' | 'myMaps' | 'shared') => {
    setExpandedMaps((prev) => {
      const newMap = new Map(prev)
      const sectionSet = new Set(newMap.get(section) || [])
      if (sectionSet.has(mapId)) {
        sectionSet.delete(mapId)
      } else {
        sectionSet.add(mapId)
      }
      newMap.set(section, sectionSet)
      return newMap
    })
  }, [])

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

  /**
   * Handle perspective deletion click - opens confirmation dialog.
   */
  const handleDeletePerspectiveClick = (perspectiveId: string, perspectiveName: string, mapId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPerspectiveToDelete({ id: perspectiveId, name: perspectiveName, mapId })
  }

  /**
   * Handle perspective deletion after confirmation.
   * Deletes the perspective and clears selection if it's the current perspective.
   */
  const handleConfirmDeletePerspective = async () => {
    if (!perspectiveToDelete) return

    try {
      // Start operation for undo tracking
      startOperation()
      
      await deletePerspective(perspectiveToDelete.id)
      
      // Record mutation for undo
      const command: DeletePerspectiveCommand = {
        type: 'deletePerspective',
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
        perspectiveId: perspectiveToDelete.id,
      }
      recordMutation(command)
      
      // If the deleted perspective is the current perspective, clear the selection
      if (currentPerspectiveId === perspectiveToDelete.id) {
        setCurrentPerspectiveId(null)
      }
      
      // End operation
      endOperation()
      
      setPerspectiveToDelete(null)
    } catch (error) {
      console.error('Failed to delete perspective:', error)
      alert('Failed to delete perspective. Please try again.')
      // End operation even on error
      endOperation()
      setPerspectiveToDelete(null)
    }
  }

  /**
   * Handle dropping a map into a folder.
   */
  const handleDropMap = useCallback(async (mapId: string, targetFolderId: string | null) => {
    if (!userId) return
    
    try {
      // Get current folders for this map
      const currentFolders = Array.from(folderMapIds.entries())
        .filter(([_, mapIds]) => mapIds.has(mapId))
        .map(([folderId]) => folderId)
      
      // Remove from all current folders
      for (const folderId of currentFolders) {
        await removeMapFromFolder(mapId, folderId)
      }
      
      // Add to target folder if specified (null means "Uncategorized")
      if (targetFolderId) {
        await addMapToFolder(mapId, targetFolderId)
      }
    } catch (error) {
      console.error('Failed to move map:', error)
      alert('Failed to move map. Please try again.')
    }
  }, [userId, folderMapIds])

  // Drag handlers for map entries
  const handleDragStart = useCallback((e: React.DragEvent, mapId: string) => {
    setDraggedMapId(mapId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', mapId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedMapId(null)
    setDragOverFolderId(null)
  }, [])

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


      {/* Maps List */}
      <div className="flex-1 overflow-y-auto">
        {maps.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No maps yet. Create your first map above!
          </div>
        ) : (
          <>
            {/* Folders Section */}
            <div>
              <div className="flex items-center">
                <button
                  onClick={() => toggleSection('folders')}
                  className="flex-1 text-left px-3 py-2 hover:bg-accent transition-colors text-xs font-semibold text-muted-foreground uppercase"
                >
                  Folders
                </button>
                {isCreatingFolder ? (
                  <div className="px-2">
                    <form onSubmit={handleCreateFolder} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name..."
                        className="px-2 py-1 text-xs border rounded-md w-32"
                        autoFocus
                        onBlur={() => {
                          if (!newFolderName.trim()) {
                            setIsCreatingFolder(false)
                            setNewFolderName('')
                          }
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!newFolderName.trim()}
                        className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingFolder(false)
                          setNewFolderName('')
                        }}
                        className="px-2 py-1 text-xs border rounded-md hover:bg-accent"
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsCreatingFolder(true)
                    }}
                    className="p-2 hover:bg-accent transition-colors rounded"
                    title="New Folder"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              {expandedSections.has('folders') && (
                <div className="pl-3">
                  {/* Folders */}
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
                            onToggleFolder={toggleFolder}
                            onDeleteFolder={(id, name) => setFolderToDelete({ id, name })}
                            onSelectMap={handleSelectMap}
                            onSelectPerspective={handleSelectPerspective}
                            onDeleteMap={handleDeleteMapClick}
                            onDeletePerspective={(perspectiveId, perspectiveName, mapId, e) => handleDeletePerspectiveClick(perspectiveId, perspectiveName, mapId, e)}
                            onCreatePerspective={handleCreatePerspective}
                            onToggleMapExpanded={(mapId: string) => toggleMapExpanded(mapId, 'folders')}
                            expandedMaps={expandedMaps.get('folders') || new Set()}
                            onDragOver={(e) => {
                              if (draggedMapId) {
                                e.preventDefault()
                                e.dataTransfer.dropEffect = 'move'
                                setDragOverFolderId(folder.id)
                              }
                            }}
                            onDragLeave={() => {
                              setDragOverFolderId(null)
                            }}
                            onDrop={async (e) => {
                              e.preventDefault()
                              const mapId = e.dataTransfer.getData('text/plain')
                              if (mapId && draggedMapId === mapId) {
                                await handleDropMap(mapId, folder.id)
                              }
                              setDragOverFolderId(null)
                              setDraggedMapId(null)
                            }}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                          />
                        )
                      })}
                    </ul>
                  )}
                  
                  {/* Empty state */}
                  {folders.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No folders yet</div>
                  )}
                </div>
              )}
            </div>

            {/* My Maps Section */}
            <div>
              <div className="flex items-center">
                <button
                  onClick={() => toggleSection('myMaps')}
                  className="flex-1 text-left px-3 py-2 hover:bg-accent transition-colors text-xs font-semibold text-muted-foreground uppercase"
                >
                  My Maps
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateMap()
                  }}
                  disabled={isCreatingMap}
                  className="p-2 hover:bg-accent transition-colors rounded disabled:opacity-50"
                  title="Create Map"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              {expandedSections.has('myMaps') && (
                <div className="pl-3">
                  <ul className="divide-y">
                    {/* Existing Maps */}
               {ownedMaps.length > 0 && ownedMaps.map((map) => {
                   const perspectives = allPerspectives.filter((p) => p.mapId === map.id).map(p => ({
                     id: p.id,
                     mapId: p.mapId,
                     name: p.name,
                     createdBy: p.createdBy,
                   }))
                  const isExpanded = (expandedMaps.get('myMaps') || new Set()).has(map.id)
                  const isMapSelected = currentMapId === map.id && !currentPerspectiveId
                  const hasActivePerspective = Boolean(currentPerspectiveId && perspectives.some(p => p.id === currentPerspectiveId))
                  const isSelected = isMapSelected || hasActivePerspective

                   return (
                     <MapEntry
                       key={map.id}
                       map={map}
                       perspectives={perspectives}
                       isExpanded={isExpanded}
                       isSelected={isSelected}
                       currentPerspectiveId={currentPerspectiveId}
                       userId={userId}
                       draggedMapId={draggedMapId}
                       onToggleExpanded={(mapId: string) => toggleMapExpanded(mapId, 'myMaps')}
                       onSelectMap={handleSelectMap}
                       onSelectPerspective={handleSelectPerspective}
                       onDeleteMap={handleDeleteMapClick}
                       onDeletePerspective={(perspectiveId, perspectiveName, e) => handleDeletePerspectiveClick(perspectiveId, perspectiveName, map.id, e)}
                       onCreatePerspective={handleCreatePerspective}
                       onDragStart={handleDragStart}
                       onDragEnd={handleDragEnd}
                     />
                   )
               })}
                    {/* Empty state */}
                    {ownedMaps.length === 0 && (
                      <li>
                        <div className="px-3 py-2 text-xs text-muted-foreground">No maps yet</div>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Shared with me Section */}
            {sharedMaps.length > 0 && (
              <div>
                <button
                  onClick={() => toggleSection('shared')}
                  className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-xs font-semibold text-muted-foreground uppercase"
                >
                  Shared with me
                </button>
                {expandedSections.has('shared') && (
                  <div className="pl-3">
                    <ul className="divide-y">
                      {sharedMaps.map((map) => {
                        const perspectives = allPerspectives.filter((p) => p.mapId === map.id).map(p => ({
                          id: p.id,
                          mapId: p.mapId,
                          name: p.name,
                          createdBy: p.createdBy,
                        }))
                        const isExpanded = (expandedMaps.get('shared') || new Set()).has(map.id)
                        const isMapSelected = currentMapId === map.id && !currentPerspectiveId
                        const hasActivePerspective = Boolean(currentPerspectiveId && perspectives.some(p => p.id === currentPerspectiveId))
                        const isSelected = isMapSelected || hasActivePerspective

                        return (
                          <MapEntry
                            key={map.id}
                            map={map}
                            perspectives={perspectives}
                            isExpanded={isExpanded}
                            isSelected={isSelected}
                            currentPerspectiveId={currentPerspectiveId}
                            userId={userId}
                            draggedMapId={draggedMapId}
                            onToggleExpanded={(mapId: string) => toggleMapExpanded(mapId, 'shared')}
                            onSelectMap={handleSelectMap}
                            onSelectPerspective={handleSelectPerspective}
                            onDeleteMap={handleDeleteMapClick}
                            onDeletePerspective={(perspectiveId, perspectiveName, e) => handleDeletePerspectiveClick(perspectiveId, perspectiveName, map.id, e)}
                            onCreatePerspective={handleCreatePerspective}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                          />
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
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

      {/* Delete Folder Confirmation Dialog */}
      <AlertDialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folderToDelete?.name}"? Maps in this folder will not be deleted, only the folder organization will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Perspective Confirmation Dialog */}
      <AlertDialog open={!!perspectiveToDelete} onOpenChange={(open) => !open && setPerspectiveToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Perspective</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{perspectiveToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePerspective}
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

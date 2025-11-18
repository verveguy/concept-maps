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
 * **Performance:**
 * Uses memoized sub-components to prevent unnecessary re-renders when presence
 * updates occur. Only the UserAvatarSection re-renders on presence changes.
 * 
 * @returns The sidebar JSX component
 */

import { useState, useEffect, useCallback, memo } from 'react'
import { X, Sun, Moon, BookOpen, Play } from 'lucide-react'
import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { useSidebarData } from '@/hooks/useSidebarData'
import { useSidebarState } from '@/hooks/useSidebarState'
import { useSidebarActions } from '@/hooks/useSidebarActions'
import { UserAvatarSection } from './UserAvatarSection'
import { FoldersSection } from './FoldersSection'
import { MyMapsSection } from './MyMapsSection'
import { SharedMapsSection } from './SharedMapsSection'
import { DeleteMapDialog } from './DeleteMapDialog'
import { DeletePerspectiveDialog } from './DeletePerspectiveDialog'
import { DeleteFolderDialog } from './DeleteFolderDialog'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

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
  const auth = db.useAuth()
  const userId = auth.user?.id || null
  const { setSidebarOpen } = useUIStore()
  const { currentMapId, currentPerspectiveId, setCurrentMapId, setCurrentPerspectiveId, setNewlyCreatedMapId, setNewlyCreatedPerspectiveId } = useMapStore()

  // Get all sidebar data
  const { maps, folders, allPerspectives, ownedMaps, sharedMaps, folderMapIds, mapsByFolder } = useSidebarData(userId)

  // Get all sidebar state
  const sidebarState = useSidebarState()

  // Get all sidebar actions
  const actions = useSidebarActions({
    userId,
    folderMapIds,
    setNewlyCreatedMapId,
    setNewlyCreatedPerspectiveId,
    setCurrentMapId,
    setCurrentPerspectiveId,
    setIsCreatingMap: sidebarState.setIsCreatingMap,
    setIsCreatingFolder: sidebarState.setIsCreatingFolder,
    setNewFolderName: sidebarState.setNewFolderName,
    setMapToDelete: sidebarState.setMapToDelete,
    setPerspectiveToDelete: sidebarState.setPerspectiveToDelete,
    setFolderToDelete: sidebarState.setFolderToDelete,
    setDraggedMapId: sidebarState.setDraggedMapId,
    setDragOverFolderId: sidebarState.setDragOverFolderId,
  })

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false)

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

  // Toggle theme
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

  // Toggle section expansion
  const toggleSection = useCallback((section: 'folders' | 'myMaps' | 'shared') => {
    sidebarState.setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }, [sidebarState])

  // Toggle folder expansion
  const toggleFolder = useCallback((folderId: string) => {
    sidebarState.setExpandedFolders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }, [sidebarState])

  // Toggle map expansion
  const toggleMapExpanded = useCallback((mapId: string, section: 'folders' | 'myMaps' | 'shared') => {
    sidebarState.setExpandedMaps((prev) => {
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
  }, [sidebarState])

  // Handle drag over folder
  const handleDragOverFolder = useCallback((e: React.DragEvent, folderId: string) => {
    if (sidebarState.draggedMapId) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      sidebarState.setDragOverFolderId(folderId)
    }
  }, [sidebarState])

  // Handle drop on folder
  const handleDropOnFolder = useCallback(async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    const mapId = e.dataTransfer.getData('text/plain')
    if (mapId && sidebarState.draggedMapId === mapId) {
      await actions.handleDropMap(mapId, folderId)
    }
    sidebarState.setDragOverFolderId(null)
    sidebarState.setDraggedMapId(null)
  }, [sidebarState, actions])

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
            <FoldersSection
              folders={folders}
              mapsByFolder={mapsByFolder}
              allPerspectives={allPerspectives}
              isExpanded={sidebarState.expandedSections.has('folders')}
              expandedFolders={sidebarState.expandedFolders}
              draggedMapId={sidebarState.draggedMapId}
              dragOverFolderId={sidebarState.dragOverFolderId}
              currentMapId={currentMapId}
              currentPerspectiveId={currentPerspectiveId}
              userId={userId}
              expandedMaps={sidebarState.expandedMaps.get('folders') || new Set()}
              isCreatingFolder={sidebarState.isCreatingFolder}
              newFolderName={sidebarState.newFolderName}
              onToggleSection={() => toggleSection('folders')}
              onToggleFolder={toggleFolder}
              onToggleMapExpanded={(mapId) => toggleMapExpanded(mapId, 'folders')}
              onSelectMap={actions.handleSelectMap}
              onSelectPerspective={actions.handleSelectPerspective}
              onDeleteMap={actions.handleDeleteMapClick}
              onDeletePerspective={actions.handleDeletePerspectiveClick}
              onCreatePerspective={actions.handleCreatePerspective}
              onDeleteFolder={(id, name) => sidebarState.setFolderToDelete({ id, name })}
              onDragOver={handleDragOverFolder}
              onDragLeave={() => sidebarState.setDragOverFolderId(null)}
              onDrop={handleDropOnFolder}
              onDragStart={actions.handleDragStart}
              onDragEnd={actions.handleDragEnd}
              onCreateFolderClick={(e) => {
                e.stopPropagation()
                sidebarState.setIsCreatingFolder(true)
              }}
              onCreateFolder={(e) => actions.handleCreateFolder(e, sidebarState.newFolderName)}
              onFolderNameChange={sidebarState.setNewFolderName}
              onCancelCreateFolder={actions.handleCancelCreateFolder}
            />

            <MyMapsSection
              maps={ownedMaps}
              allPerspectives={allPerspectives}
              isExpanded={sidebarState.expandedSections.has('myMaps')}
              expandedMaps={sidebarState.expandedMaps.get('myMaps') || new Set()}
              draggedMapId={sidebarState.draggedMapId}
              currentMapId={currentMapId}
              currentPerspectiveId={currentPerspectiveId}
              userId={userId}
              isCreatingMap={sidebarState.isCreatingMap}
              onToggleSection={() => toggleSection('myMaps')}
              onToggleMapExpanded={(mapId) => toggleMapExpanded(mapId, 'myMaps')}
              onSelectMap={actions.handleSelectMap}
              onSelectPerspective={actions.handleSelectPerspective}
              onDeleteMap={actions.handleDeleteMapClick}
              onDeletePerspective={actions.handleDeletePerspectiveClick}
              onCreatePerspective={actions.handleCreatePerspective}
              onCreateMap={(e) => {
                e.stopPropagation()
                actions.handleCreateMap()
              }}
              onDragStart={actions.handleDragStart}
              onDragEnd={actions.handleDragEnd}
            />

            <SharedMapsSection
              maps={sharedMaps}
              allPerspectives={allPerspectives}
              isExpanded={sidebarState.expandedSections.has('shared')}
              expandedMaps={sidebarState.expandedMaps.get('shared') || new Set()}
              draggedMapId={sidebarState.draggedMapId}
              currentMapId={currentMapId}
              currentPerspectiveId={currentPerspectiveId}
              userId={userId}
              onToggleSection={() => toggleSection('shared')}
              onToggleMapExpanded={(mapId) => toggleMapExpanded(mapId, 'shared')}
              onSelectMap={actions.handleSelectMap}
              onSelectPerspective={actions.handleSelectPerspective}
              onDeleteMap={actions.handleDeleteMapClick}
              onDeletePerspective={actions.handleDeletePerspectiveClick}
              onCreatePerspective={actions.handleCreatePerspective}
              onDragStart={actions.handleDragStart}
              onDragEnd={actions.handleDragEnd}
            />
          </>
        )}
      </div>

      {/* Video Link */}
      <VideoPopover />

      {/* Documentation Link */}
      <DocumentationLink />

      {/* Theme Toggle */}
      <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

      {/* User Avatar */}
      <UserAvatarSection />

      {/* Delete Dialogs */}
      <DeleteMapDialog
        mapToDelete={sidebarState.mapToDelete}
        onOpenChange={(open) => !open && sidebarState.setMapToDelete(null)}
        onConfirm={actions.handleConfirmDeleteMap}
      />

      <DeletePerspectiveDialog
        perspectiveToDelete={sidebarState.perspectiveToDelete}
        onOpenChange={(open) => !open && sidebarState.setPerspectiveToDelete(null)}
        onConfirm={actions.handleConfirmDeletePerspective}
      />

      <DeleteFolderDialog
        folderToDelete={sidebarState.folderToDelete}
        onOpenChange={(open) => !open && sidebarState.setFolderToDelete(null)}
        onConfirm={actions.handleDeleteFolder}
      />
    </div>
  )
}


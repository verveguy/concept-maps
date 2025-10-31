import { useState, useEffect } from 'react'
import { X, Plus, Play, ChevronRight, ChevronDown, Eye, Settings, Sun, Moon } from 'lucide-react'
import { useMaps } from '@/hooks/useMaps'
import { useMapActions } from '@/hooks/useMapActions'
import { usePerspectiveActions } from '@/hooks/usePerspectiveActions'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { db } from '@/lib/instant'
import { format } from 'date-fns'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

/**
 * Sidebar component for browsing maps and perspectives
 * Displays list of maps, allows creating new maps, and selecting a map
 */
export function Sidebar() {
  const maps = useMaps()
  // Get all perspectives for all maps (not filtered by currentMapId)
  const { data: perspectivesData } = db.useQuery({
    perspectives: {},
  })
  const allPerspectives = (perspectivesData?.perspectives || []).map((p: any) => ({
    id: p.id,
    mapId: p.mapId,
    name: p.name,
    conceptIds: p.conceptIds ? JSON.parse(p.conceptIds) : [],
    relationshipIds: p.relationshipIds ? JSON.parse(p.relationshipIds) : [],
    createdBy: p.createdBy,
    createdAt: new Date(p.createdAt),
  }))
  const { createMap } = useMapActions()
  const { createPerspective } = usePerspectiveActions()
  const { currentMapId, currentPerspectiveId, setCurrentMapId, setCurrentPerspectiveId } = useMapStore()
  const { setSidebarOpen } = useUIStore()
  const auth = db.useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [expandedMaps, setExpandedMaps] = useState<Set<string>>(new Set([currentMapId || '']))
  const [isCreatingPerspective, setIsCreatingPerspective] = useState<string | null>(null)
  const [newPerspectiveName, setNewPerspectiveName] = useState('')
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
  const toggleTheme = () => {
    const newIsDark = !isDarkMode
    setIsDarkMode(newIsDark)
    
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

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

  const handleSelectMap = (mapId: string) => {
    setCurrentMapId(mapId)
    setCurrentPerspectiveId(null) // Clear perspective when selecting map
  }

  const handleSelectPerspective = (perspectiveId: string, mapId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentMapId(mapId)
    setCurrentPerspectiveId(perspectiveId)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Maps</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {auth.user?.email || 'Not signed in'}
        </p>
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
                          {perspectives.length > 0 && ` • ${perspectives.length} perspective${perspectives.length === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </button>

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
                                    {perspective.conceptIds.length} concept{perspective.conceptIds.length === 1 ? '' : 's'} • {perspective.relationshipIds.length} relationship{perspective.relationshipIds.length === 1 ? '' : 's'}
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

      {/* Video Link */}
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

      {/* Theme Toggle */}
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
    </div>
  )
}
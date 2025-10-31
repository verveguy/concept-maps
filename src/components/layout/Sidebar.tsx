import { useState } from 'react'
import { X, Plus, Play } from 'lucide-react'
import { useMaps } from '@/hooks/useMaps'
import { useMapActions } from '@/hooks/useMapActions'
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
  const { createMap } = useMapActions()
  const { currentMapId, setCurrentMapId } = useMapStore()
  const { setSidebarOpen } = useUIStore()
  const auth = db.useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [newMapName, setNewMapName] = useState('')

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
            {maps.map((map) => (
              <li key={map.id}>
                <button
                  onClick={() => setCurrentMapId(map.id)}
                  className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                    currentMapId === map.id ? 'bg-accent border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="font-medium">{map.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Updated {format(map.updatedAt, 'MMM d, yyyy')}
                  </div>
                </button>
              </li>
            ))}
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

      {/* Perspectives section - placeholder for future */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        Perspectives coming soon...
      </div>
    </div>
  )
}
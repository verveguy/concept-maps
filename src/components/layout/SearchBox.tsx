/**
 * Search box component for searching concepts and relationships across all maps.
 * Displays a search input in the top right with dropdown results.
 * Uses debouncing and conditional mounting to avoid unnecessary reactive updates.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, MapPin, Link2 } from 'lucide-react'
import { useSearchQuery, type SearchResult } from '@/hooks/useSearch'
import { useMapStore } from '@/stores/mapStore'

/**
 * Search box component for searching concepts and relationships across all maps.
 * 
 * Provides a search input with dropdown results that allows navigation to concepts
 * and relationships. Uses debouncing to limit query frequency and only queries when
 * there's an active search query.
 * 
 * **Features:**
 * - Real-time search as you type (with 300ms debounce)
 * - Searches across all accessible maps (permissions automatically filter results)
 * - Displays concepts and relationships in dropdown
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Click outside to close dropdown
 * - Navigates to selected item's map and selects it
 * 
 * **Search Behavior:**
 * - Only queries when there's text in the search box
 * - Uses InstantDB's `$ilike` operator for case-insensitive pattern matching
 * - Searches concept labels and relationship labels (both primary and reverse)
 * - Results are automatically filtered by user permissions
 * 
 * **Keyboard Navigation:**
 * - `ArrowDown`: Move to next result
 * - `ArrowUp`: Move to previous result
 * - `Enter`: Select current result
 * - `Escape`: Close dropdown and clear search
 * 
 * @returns The search box JSX element
 * 
 * @example
 * ```tsx
 * import { SearchBox } from '@/components/layout/SearchBox'
 * 
 * function Header() {
 *   return (
 *     <div className="flex items-center gap-4">
 *       <SearchBox />
 *       <OtherControls />
 *     </div>
 *   )
 * }
 * ```
 */
export function SearchBox() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { setCurrentMapId, setCurrentPerspectiveId } = useMapStore()
  
  // Get search results - only queries when debouncedQuery is set (hook handles null/empty query)
  // Permissions automatically filter to only accessible maps
  const results = useSearchQuery(debouncedQuery)

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300) // 300ms debounce delay

    return () => clearTimeout(timer)
  }, [query])

  // Filter results based on debounced query
  const filteredResults = debouncedQuery.trim() ? results : []

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Open dropdown when there are results or when query is active
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
    setSelectedIndex(0)
  }, [debouncedQuery, filteredResults.length])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredResults.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false)
        searchInputRef.current?.blur()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredResults.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredResults[selectedIndex]) {
          handleSelectResult(filteredResults[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        searchInputRef.current?.blur()
        break
    }
  }

  /**
   * Handle selecting a search result.
   * Navigates to the map and selects the concept or relationship.
   */
  const handleSelectResult = useCallback((result: SearchResult) => {
    setCurrentMapId(result.mapId)
    setCurrentPerspectiveId(null) // Clear perspective when navigating
    setQuery('')
    setDebouncedQuery('')
    setIsOpen(false)
    
    // The concept/relationship will be displayed in the map canvas
    // The map store handles switching to the correct map
  }, [setCurrentMapId, setCurrentPerspectiveId])

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (filteredResults.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search concepts and relationships..."
          className="w-64 pl-10 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Results Dropdown */}
      {isOpen && debouncedQuery.trim() && filteredResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-1 w-96 max-h-96 overflow-y-auto bg-card border rounded-md shadow-lg z-50"
        >
          <div className="p-2">
            <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
              {filteredResults.length} result{filteredResults.length === 1 ? '' : 's'}
            </div>
            {filteredResults.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelectResult(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-start gap-3 ${
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {result.type === 'concept' ? (
                    <MapPin className="h-4 w-4 text-primary" />
                  ) : (
                    <Link2 className="h-4 w-4 text-primary" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{result.label}</div>
                  {result.type === 'relationship' && result.secondaryLabel && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {result.secondaryLabel}
                    </div>
                  )}
                  {result.mapName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {result.mapName}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {isOpen && debouncedQuery.trim() && filteredResults.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-1 w-96 bg-card border rounded-md shadow-lg z-50 p-4 text-center text-sm text-muted-foreground"
        >
          No results found for &quot;{debouncedQuery}&quot;
        </div>
      )}
    </div>
  )
}

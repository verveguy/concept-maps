/**
 * Hook for searching concepts and relationships across all accessible maps.
 * Uses server-side InstantDB queries with the $like operator for text search.
 * Permissions automatically filter results to only accessible maps.
 * Only queries when there's an active search query to avoid unnecessary reactive updates.
 */

import { db } from '@/lib/instant'
import { useMemo } from 'react'

/**
 * Search result item containing either a concept or relationship
 */
export interface SearchResult {
  type: 'concept' | 'relationship'
  id: string
  mapId: string
  label: string // Concept label or relationship primaryLabel
  secondaryLabel?: string // Relationship reverseLabel
  mapName?: string
}

/**
 * Hook to get map names for search results.
 * Only queries maps that are in the search results.
 */
function useMapNamesForResults(results: Array<{ mapId: string }>) {
  const mapIds = useMemo(() => {
    const uniqueMapIds = new Set<string>()
    results.forEach((r) => uniqueMapIds.add(r.mapId))
    return Array.from(uniqueMapIds)
  }, [results])

  const { data: mapsData } = db.useQuery(
    mapIds.length > 0
      ? {
          maps: {
            $: {
              where: { id: { $in: mapIds } },
            },
          },
        }
      : null
  )

  const mapNames = useMemo(() => {
    const nameMap = new Map<string, string>()
    if (mapsData?.maps) {
      mapsData.maps.forEach((m: any) => {
        nameMap.set(m.id, m.name)
      })
    }
    return nameMap
  }, [mapsData])

  return mapNames
}

/**
 * Hook that performs the actual search query using InstantDB's $like operator.
 * 
 * Searches concepts and relationships across all accessible maps using server-side
 * pattern matching. Permissions automatically filter results to only maps the user
 * can view. Only queries when there's an active search query to avoid unnecessary
 * reactive updates.
 * 
 * **Search Behavior:**
 * - Uses InstantDB's `$ilike` operator for case-insensitive pattern matching
 * - Searches concept labels
 * - Searches relationship primary and reverse labels
 * - Escapes special SQL LIKE characters (% and _)
 * - Wraps search term with wildcards (e.g., "react" becomes "%react%")
 * 
 * **Permission Filtering:**
 * InstantDB permissions automatically filter results. Users only see concepts
 * and relationships from maps they have access to.
 * 
 * **Performance:**
 * - Only queries when `query` is non-empty (null/empty query returns empty array)
 * - Uses debouncing in SearchBox component (300ms) to limit query frequency
 * - Fetches map names separately to avoid unnecessary queries
 * 
 * **Result Format:**
 * Returns an array of SearchResult objects containing:
 * - `type`: 'concept' or 'relationship'
 * - `id`: Entity ID
 * - `mapId`: Map ID
 * - `label`: Display label
 * - `secondaryLabel`: Relationship reverse label (if applicable)
 * - `mapName`: Map name (fetched separately)
 * 
 * @param query - Search query string (empty/null returns empty results)
 * @returns Array of search results matching the query
 * 
 * @example
 * ```tsx
 * import { useSearchQuery } from '@/hooks/useSearch'
 * 
 * function SearchResults({ query }) {
 *   const results = useSearchQuery(query)
 *   
 *   return (
 *     <ul>
 *       {results.map(result => (
 *         <li key={`${result.type}-${result.id}`}>
 *           {result.label} ({result.mapName})
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useSearchQuery(query: string) {
  // Escape special characters for the like pattern
  // InstantDB $like uses SQL LIKE syntax, so we need to escape % and _
  const escapeLikePattern = (pattern: string) => {
    return pattern.replace(/[%_]/g, (char) => `\\${char}`)
  }

  // Build the search pattern - use % for wildcards (matches any sequence of characters)
  const searchPattern = query.trim() ? `%${escapeLikePattern(query.trim())}%` : ''

  // Query concepts with server-side filtering using $like operator
  // Permissions automatically filter to only accessible maps
  const { data: conceptsData } = db.useQuery(
    searchPattern
      ? {
          concepts: {
            $: {
              where: {
                label: { $ilike: searchPattern },
              },
            },
            map: {
              creator: {},
              readPermissions: {},
              writePermissions: {},
            },
          },
        }
      : null
  )

  // Query relationships with server-side filtering using $like operator
  // Need to match either primaryLabel OR reverseLabel, so we need two queries
  // Permissions automatically filter to only accessible maps
  const { data: relationshipsDataPrimary } = db.useQuery(
    searchPattern
      ? {
          relationships: {
            $: {
              where: {
                primaryLabel: { $ilike: searchPattern },
              },
            },
            map: {
              creator: {},
              readPermissions: {},
              writePermissions: {},
            },
          },
        }
      : null
  )

  const { data: relationshipsDataReverse } = db.useQuery(
    searchPattern
      ? {
          relationships: {
            $: {
              where: {
                reverseLabel: { $ilike: searchPattern },
              },
            },
            map: {
              creator: {},
              readPermissions: {},
              writePermissions: {},
            },
          },
        }
      : null
  )

  // Merge and deduplicate relationship results
  const allRelationships = useMemo(() => {
    const relationshipMap = new Map<string, any>()

    // Add relationships from primaryLabel query
    if (relationshipsDataPrimary?.relationships) {
      relationshipsDataPrimary.relationships.forEach((r: any) => {
        relationshipMap.set(r.id, r)
      })
    }

    // Add relationships from reverseLabel query
    if (relationshipsDataReverse?.relationships) {
      relationshipsDataReverse.relationships.forEach((r: any) => {
        relationshipMap.set(r.id, r)
      })
    }

    return Array.from(relationshipMap.values())
  }, [relationshipsDataPrimary, relationshipsDataReverse])

  // Build initial results (without map names)
  const resultsWithoutMapNames = useMemo(() => {
    if (!query.trim()) return []

    const results: Array<{ type: 'concept' | 'relationship'; id: string; mapId: string }> = []

    // Add concepts - already filtered by permissions and label
    if (conceptsData?.concepts) {
      conceptsData.concepts.forEach((c: any) => {
        results.push({
          type: 'concept',
          id: c.id,
          mapId: c.map?.id || '',
        })
      })
    }

    // Add relationships - already filtered by permissions and label
    allRelationships.forEach((r: any) => {
      results.push({
        type: 'relationship',
        id: r.id,
        mapId: r.map?.id || '',
      })
    })

    return results
  }, [query, conceptsData, allRelationships])

  // Get map names for the results
  const mapNames = useMapNamesForResults(resultsWithoutMapNames)

  // Transform search results with map names
  const results = useMemo(() => {
    if (!query.trim()) return []

    const results: SearchResult[] = []

    // Add concepts - already filtered by permissions and label
    if (conceptsData?.concepts) {
      conceptsData.concepts.forEach((c: any) => {
        results.push({
          type: 'concept',
          id: c.id,
          mapId: c.map?.id || '',
          label: c.label,
          mapName: mapNames.get(c.map?.id || ''),
        })
      })
    }

    // Add relationships - already filtered by permissions and label
    allRelationships.forEach((r: any) => {
      results.push({
        type: 'relationship',
        id: r.id,
        mapId: r.map?.id || '',
        label: r.primaryLabel,
        secondaryLabel: r.reverseLabel,
        mapName: mapNames.get(r.map?.id || ''),
      })
    })

    // Sort results: concepts first, then by label
    results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'concept' ? -1 : 1
      }
      return a.label.localeCompare(b.label)
    })

    return results
  }, [query, conceptsData, allRelationships, mapNames])

  return results
}

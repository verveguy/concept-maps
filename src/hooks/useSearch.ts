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
 * Permissions automatically filter results to only accessible maps.
 * Only queries when there's an active search query to avoid unnecessary reactive updates.
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
          mapId: c.mapId,
        })
      })
    }

    // Add relationships - already filtered by permissions and label
    allRelationships.forEach((r: any) => {
      results.push({
        type: 'relationship',
        id: r.id,
        mapId: r.mapId,
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
          mapId: c.mapId,
          label: c.label,
          mapName: mapNames.get(c.mapId),
        })
      })
    }

    // Add relationships - already filtered by permissions and label
    allRelationships.forEach((r: any) => {
      results.push({
        type: 'relationship',
        id: r.id,
        mapId: r.mapId,
        label: r.primaryLabel,
        secondaryLabel: r.reverseLabel,
        mapName: mapNames.get(r.mapId),
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

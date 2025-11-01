/**
 * Hook for searching concepts and relationships across all accessible maps.
 * Uses server-side InstantDB queries with the $like operator for text search.
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
 * Hook to get accessible map IDs for the current user.
 * Returns map IDs for maps created by the user and maps shared with the user.
 */
export function useAccessibleMapIds() {
  const auth = db.useAuth()
  const userId = auth.user?.id

  // Get all maps accessible to the user (created by user or shared with user)
  const { data: mapsData } = db.useQuery(
    userId
      ? {
          maps: {
            $: {
              where: { createdBy: userId },
            },
          },
          shares: {
            $: {
              where: { userId },
            },
          },
        }
      : null
  )

  // Get map IDs that the user has access to
  const accessibleMapIds = useMemo(() => {
    if (!mapsData || !userId) return []
    const createdMapIds = (mapsData.maps || []).map((m: any) => m.id)
    const sharedMapIds = (mapsData.shares || [])
      .map((s: any) => s.mapId)
      .filter((id: string) => id) // Filter out null/undefined
    return [...new Set([...createdMapIds, ...sharedMapIds])]
  }, [mapsData, userId])

  return accessibleMapIds
}

/**
 * Hook to get map names for given map IDs.
 */
export function useMapNames(mapIds: string[]) {
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
 * Only queries when there's an active search query to avoid unnecessary reactive updates.
 */
export function useSearchQuery(query: string, accessibleMapIds: string[]) {
  // Escape special characters for the like pattern
  // InstantDB $like uses SQL LIKE syntax, so we need to escape % and _
  const escapeLikePattern = (pattern: string) => {
    return pattern.replace(/[%_]/g, (char) => `\\${char}`)
  }

  // Build the search pattern - use % for wildcards (matches any sequence of characters)
  const searchPattern = query.trim() ? `%${escapeLikePattern(query.trim())}%` : ''

  // Query concepts with server-side filtering using $like operator
  const { data: conceptsData } = db.useQuery(
    searchPattern && accessibleMapIds.length > 0
      ? {
          concepts: {
            $: {
              where: {
                mapId: { $in: accessibleMapIds },
                label: { $like: searchPattern },
              },
            },
          },
        }
      : null
  )

  // Query relationships with server-side filtering using $like operator
  // Need to match either primaryLabel OR reverseLabel, so we need two queries
  // or use $or if InstantDB supports it
  const { data: relationshipsDataPrimary } = db.useQuery(
    searchPattern && accessibleMapIds.length > 0
      ? {
          relationships: {
            $: {
              where: {
                mapId: { $in: accessibleMapIds },
                primaryLabel: { $like: searchPattern },
              },
            },
          },
        }
      : null
  )

  const { data: relationshipsDataReverse } = db.useQuery(
    searchPattern && accessibleMapIds.length > 0
      ? {
          relationships: {
            $: {
              where: {
                mapId: { $in: accessibleMapIds },
                reverseLabel: { $like: searchPattern },
              },
            },
          },
        }
      : null
  )

  const mapNames = useMapNames(accessibleMapIds)

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

  // Transform search results
  const results = useMemo(() => {
    if (!query.trim() || accessibleMapIds.length === 0) return []

    const results: SearchResult[] = []

    // Add concepts - already filtered server-side by mapId and label
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

    // Add relationships - already filtered server-side by mapId and label
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
  }, [query, conceptsData, allRelationships, mapNames, accessibleMapIds])

  return results
}

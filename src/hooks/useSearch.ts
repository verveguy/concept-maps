/**
 * Hook for searching concepts and relationships across all accessible maps.
 * Searches across all maps that the user has access to (created by user or shared with user).
 * Uses InstantDB queries to fetch concepts and relationships, then filters client-side.
 */

import { db } from '@/lib/instant'
import { useMemo } from 'react'
import type { Concept, Relationship } from '@/lib/schema'

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
 * Hook to search concepts and relationships across all accessible maps.
 * Returns search results filtered by the search query string.
 * 
 * @param query - Search query string (searches in concept labels and relationship labels)
 * @returns Array of search results matching the query
 */
export function useSearch(query: string) {
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

  // Get all concepts (we'll filter by accessible map IDs client-side)
  // Note: InstantDB permissions should handle access control, but we filter client-side for safety
  const { data: conceptsData } = db.useQuery(
    userId
      ? {
          concepts: {},
        }
      : null
  )

  // Get all relationships (we'll filter by accessible map IDs client-side)
  const { data: relationshipsData } = db.useQuery(
    userId
      ? {
          relationships: {},
        }
      : null
  )


  // Query shared maps to get their names
  // Fetch all maps and filter client-side since we might not have $in support
  const { data: allMapsData } = db.useQuery(
    userId
      ? {
          maps: {},
        }
      : null
  )

  // Build map of all accessible map names (including shared ones)
  const allMapNames = useMemo(() => {
    const merged = new Map<string, string>()
    if (mapsData?.maps) {
      mapsData.maps.forEach((m: any) => {
        merged.set(m.id, m.name)
      })
    }
    // Add shared map names
    if (allMapsData?.maps && mapsData?.shares) {
      const sharedMapIds = new Set(
        (mapsData.shares || [])
          .map((s: any) => s.mapId)
          .filter((id: string) => id)
      )
      allMapsData.maps.forEach((m: any) => {
        if (sharedMapIds.has(m.id) && !merged.has(m.id)) {
          merged.set(m.id, m.name)
        }
      })
    }
    return merged
  }, [mapsData, allMapsData])

  // Filter and transform search results
  const results = useMemo(() => {
    if (!query.trim() || accessibleMapIds.length === 0) return []

    const accessibleMapIdsSet = new Set(accessibleMapIds)
    const searchQuery = query.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search concepts - filter by accessible map IDs
    if (conceptsData?.concepts) {
      conceptsData.concepts.forEach((c: any) => {
        // Only include concepts from accessible maps
        if (!accessibleMapIdsSet.has(c.mapId)) return

        const label = c.label || ''
        if (label.toLowerCase().includes(searchQuery)) {
          results.push({
            type: 'concept',
            id: c.id,
            mapId: c.mapId,
            label: label,
            mapName: allMapNames.get(c.mapId),
          })
        }
      })
    }

    // Search relationships - filter by accessible map IDs
    if (relationshipsData?.relationships) {
      relationshipsData.relationships.forEach((r: any) => {
        // Only include relationships from accessible maps
        if (!accessibleMapIdsSet.has(r.mapId)) return

        const primaryLabel = r.primaryLabel || ''
        const reverseLabel = r.reverseLabel || ''
        const matchesPrimary = primaryLabel.toLowerCase().includes(searchQuery)
        const matchesReverse = reverseLabel.toLowerCase().includes(searchQuery)

        if (matchesPrimary || matchesReverse) {
          results.push({
            type: 'relationship',
            id: r.id,
            mapId: r.mapId,
            label: primaryLabel,
            secondaryLabel: reverseLabel,
            mapName: allMapNames.get(r.mapId),
          })
        }
      })
    }

    // Sort results: concepts first, then by label
    results.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'concept' ? -1 : 1
      }
      return a.label.localeCompare(b.label)
    })

    return results
  }, [query, conceptsData, relationshipsData, allMapNames, accessibleMapIds])

  return results
}

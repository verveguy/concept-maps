/**
 * Hook for searching concepts and relationships across all accessible maps.
 * Uses server-side InstantDB queries filtered by accessible mapIds.
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
 * Inner component that performs the actual search query.
 * Only mounted when there's an active search query to avoid unnecessary reactive updates.
 */
export function useSearchQuery(query: string, accessibleMapIds: string[]) {
  // Query concepts and relationships filtered by accessible mapIds server-side
  // Only queries when there's an active search query to avoid unnecessary reactive updates
  const { data: conceptsData } = db.useQuery(
    query.trim() && accessibleMapIds.length > 0
      ? {
          concepts: {
            $: {
              where: { mapId: { $in: accessibleMapIds } },
            },
          },
        }
      : null
  )

  const { data: relationshipsData } = db.useQuery(
    query.trim() && accessibleMapIds.length > 0
      ? {
          relationships: {
            $: {
              where: { mapId: { $in: accessibleMapIds } },
            },
          },
        }
      : null
  )

  const mapNames = useMapNames(accessibleMapIds)

  // Filter and transform search results
  const results = useMemo(() => {
    if (!query.trim() || accessibleMapIds.length === 0) return []

    const searchQuery = query.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search concepts - already filtered by accessible mapIds server-side
    if (conceptsData?.concepts) {
      conceptsData.concepts.forEach((c: any) => {
        const label = c.label || ''
        if (label.toLowerCase().includes(searchQuery)) {
          results.push({
            type: 'concept',
            id: c.id,
            mapId: c.mapId,
            label: label,
            mapName: mapNames.get(c.mapId),
          })
        }
      })
    }

    // Search relationships - already filtered by accessible mapIds server-side
    if (relationshipsData?.relationships) {
      relationshipsData.relationships.forEach((r: any) => {
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
            mapName: mapNames.get(r.mapId),
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
  }, [query, conceptsData, relationshipsData, mapNames, accessibleMapIds])

  return results
}

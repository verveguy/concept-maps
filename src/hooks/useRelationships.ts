/**
 * Hooks for querying relationships from InstantDB.
 * Provides reactive data fetching with real-time updates.
 * Supports share tokens via rulesParams for shared access.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Relationship } from '@/lib/schema'
import { useShareToken } from './useShareToken'

/**
 * Hook to get relationships for the current map/perspective.
 * Uses InstantDB useQuery() for real-time updates.
 * Filters by mapId and optionally by perspective relationshipIds.
 * Passes shareToken via rulesParams for permission checks.
 * 
 * @returns Array of relationships filtered by current map and perspective (if selected)
 */
export function useRelationships() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)
  const shareToken = useShareToken()

  // First get the perspective if one is selected
  const { data: perspectiveData } = db.useQuery(
    currentPerspectiveId
      ? {
          perspectives: {
            $: { where: { id: currentPerspectiveId } },
          },
        }
      : null,
    shareToken ? { rulesParams: { shareToken } } : undefined
  )

  const perspective = perspectiveData?.perspectives?.[0]
  const relationshipIds = perspective?.relationshipIds
    ? JSON.parse(perspective.relationshipIds)
    : undefined

  // Get relationships for the map, optionally filtered by perspective
  const { data } = db.useQuery(
    currentMapId
      ? {
          relationships: {
            $: {
              where: relationshipIds
                ? { mapId: currentMapId, id: { $in: relationshipIds } }
                : { mapId: currentMapId },
            },
          },
        }
      : null,
    shareToken ? { rulesParams: { shareToken } } : undefined
  )

  // Transform InstantDB data to schema format
  const relationships: Relationship[] =
    data?.relationships?.map((r: any) => ({
      id: r.id,
      mapId: r.mapId,
      fromConceptId: r.fromConceptId,
      toConceptId: r.toConceptId,
      primaryLabel: r.primaryLabel,
      reverseLabel: r.reverseLabel,
      notes: r.notes,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    })) || []

  return relationships
}

/**
 * Hook to get ALL relationships for the current map (no perspective filtering).
 * Uses InstantDB useQuery() for real-time updates.
 * Used when editing perspectives to show all relationships.
 * Passes shareToken via rulesParams for permission checks.
 * 
 * @returns Array of all relationships for the current map
 */
export function useAllRelationships() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  const shareToken = useShareToken()

  // Get ALL relationships for the map (no perspective filter)
  const { data } = db.useQuery(
    currentMapId
      ? {
          relationships: {
            $: {
              where: { mapId: currentMapId },
            },
          },
        }
      : null,
    shareToken ? { rulesParams: { shareToken } } : undefined
  )

  // Transform InstantDB data to schema format
  const relationships: Relationship[] =
    data?.relationships?.map((r: any) => ({
      id: r.id,
      mapId: r.mapId,
      fromConceptId: r.fromConceptId,
      toConceptId: r.toConceptId,
      primaryLabel: r.primaryLabel,
      reverseLabel: r.reverseLabel,
      notes: r.notes,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    })) || []

  return relationships
}

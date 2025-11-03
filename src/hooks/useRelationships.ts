/**
 * Hooks for querying relationships from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Relationship } from '@/lib/schema'

/**
 * Hook to get relationships for the current map/perspective.
 * Uses InstantDB useQuery() for real-time updates.
 * Filters by mapId and optionally by perspective relationshipIds.
 * 
 * @returns Array of relationships filtered by current map and perspective (if selected)
 */
export function useRelationships() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  const currentPerspectiveId = useMapStore((state) => state.currentPerspectiveId)

  // First get the perspective if one is selected
  const { data: perspectiveData } = db.useQuery(
    currentPerspectiveId
      ? {
          perspectives: {
            $: { where: { id: currentPerspectiveId } },
          },
        }
      : null
  )

  const perspective = perspectiveData?.perspectives?.[0]
  const relationshipIds = perspective?.relationshipIds
    ? JSON.parse(perspective.relationshipIds)
    : undefined

  // Get relationships for the map, optionally filtered by perspective
  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            relationships: relationshipIds
              ? {
                  $: { where: { id: { $in: relationshipIds } } },
                  map: {
                    creator: {},
                    readPermissions: {},
                    writePermissions: {},
                  },
                  fromConcept: {},
                  toConcept: {},
                }
              : {
                  map: {
                    creator: {},
                    readPermissions: {},
                    writePermissions: {},
                  },
                  fromConcept: {},
                  toConcept: {},
                },
          },
        }
      : null
  )

  // Transform InstantDB data to schema format
  const relationships: Relationship[] =
    data?.maps?.[0]?.relationships?.map((r: any) => ({
      id: r.id,
      mapId: r.map?.id || currentMapId || '',
      fromConceptId: r.fromConcept?.id || '',
      toConceptId: r.toConcept?.id || '',
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
 * 
 * @returns Array of all relationships for the current map
 */
export function useAllRelationships() {
  const currentMapId = useMapStore((state) => state.currentMapId)

  // Get ALL relationships for the map (no perspective filter)
  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            relationships: {
              map: {
                creator: {},
                readPermissions: {},
                writePermissions: {},
              },
              fromConcept: {},
              toConcept: {},
            },
          },
        }
      : null
  )

  // Transform InstantDB data to schema format
  const relationships: Relationship[] =
    data?.maps?.[0]?.relationships?.map((r: any) => ({
      id: r.id,
      mapId: r.map?.id || currentMapId || '',
      fromConceptId: r.fromConcept?.id || '',
      toConceptId: r.toConcept?.id || '',
      primaryLabel: r.primaryLabel,
      reverseLabel: r.reverseLabel,
      notes: r.notes,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    })) || []

  return relationships
}

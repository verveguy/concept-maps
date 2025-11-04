/**
 * Hooks for querying concepts from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Concept } from '@/lib/schema'

/**
 * Hook to get concepts for the current map/perspective.
 * Uses InstantDB useQuery() for real-time updates.
 * Filters by mapId and optionally by perspective conceptIds.
 * 
 * @returns Array of concepts filtered by current map and perspective (if selected)
 */
export function useConcepts() {
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
  const conceptIds = perspective?.conceptIds
    ? JSON.parse(perspective.conceptIds)
    : undefined

  // Get concepts for the map, optionally filtered by perspective
  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            concepts: conceptIds
              ? {
                  $: { where: { id: { $in: conceptIds }, deletedAt: { $isNull: true } } },
                  map: {
                    creator: {},
                    readPermissions: {},
                    writePermissions: {},
                  },
                }
              : {
                  $: { where: { deletedAt: { $isNull: true } } },
                  map: {
                    creator: {},
                    readPermissions: {},
                    writePermissions: {},
                  },
                },
          },
        }
      : null
  )

  // Transform InstantDB data to schema format
  const concepts: Concept[] =
    data?.maps?.[0]?.concepts?.map((c: any) => ({
      id: c.id,
      mapId: c.map?.id || currentMapId || '',
      label: c.label,
      position: { x: c.positionX, y: c.positionY },
      notes: c.notes,
      metadata: c.metadata ? JSON.parse(c.metadata) : {},
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      deletedAt: c.deletedAt ? new Date(c.deletedAt) : null,
    })) || []

  return concepts
}

/**
 * Hook to get ALL concepts for the current map (no perspective filtering).
 * Uses InstantDB useQuery() for real-time updates.
 * Used when editing perspectives to show all concepts.
 * 
 * @returns Array of all concepts for the current map
 */
export function useAllConcepts() {
  const currentMapId = useMapStore((state) => state.currentMapId)

  // Get ALL concepts for the map (no perspective filter)
  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            concepts: {
              $: { where: { deletedAt: { $isNull: true } } },
              map: {
                creator: {},
                readPermissions: {},
                writePermissions: {},
              },
            },
          },
        }
      : null
  )

  // Transform InstantDB data to schema format
  const concepts: Concept[] =
    data?.maps?.[0]?.concepts?.map((c: any) => ({
      id: c.id,
      mapId: c.map?.id || currentMapId || '',
      label: c.label,
      position: { x: c.positionX, y: c.positionY },
      notes: c.notes,
      metadata: c.metadata ? JSON.parse(c.metadata) : {},
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      deletedAt: c.deletedAt ? new Date(c.deletedAt) : null,
    })) || []

  return concepts
}

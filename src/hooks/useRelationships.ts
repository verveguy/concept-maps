import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Relationship } from '@/lib/schema'

/**
 * Hook to get relationships for the current map/perspective
 * Uses InstantDB useQuery() for real-time updates
 * Filters by mapId and optionally by perspective relationshipIds
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
          relationships: {
            $: {
              where: relationshipIds
                ? { mapId: currentMapId, id: { $in: relationshipIds } }
                : { mapId: currentMapId },
            },
          },
        }
      : null
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

/**
 * Hooks for querying relationships from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Relationship } from '@/lib/schema'

/**
 * Hook to get relationships for the current map/perspective.
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Automatically filters
 * relationships by the current map ID and optionally by perspective relationship IDs
 * if a perspective is selected.
 * 
 * The hook subscribes to real-time updates, so the returned array will
 * automatically update when relationships are added, modified, or deleted by
 * any user with access to the map.
 * 
 * **Perspective Filtering:**
 * - If a perspective is selected, only relationships included in that perspective
 *   are returned
 * - If no perspective is selected, all relationships in the current map are returned
 * - Soft-deleted relationships (with `deletedAt` set) are automatically excluded
 * 
 * **Relationship Data:**
 * Each relationship includes links to its source and target concepts, allowing
 * you to access concept data directly from the relationship object.
 * 
 * @returns Array of relationships filtered by current map and perspective (if selected)
 * 
 * @example
 * ```tsx
 * import { useRelationships } from '@/hooks/useRelationships'
 * 
 * function RelationshipList() {
 *   const relationships = useRelationships()
 *   
 *   return (
 *     <ul>
 *       {relationships.map(rel => (
 *         <li key={rel.id}>
 *           {rel.primaryLabel} ({rel.fromConceptId} → {rel.toConceptId})
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
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
                  $: { where: { id: { $in: relationshipIds }, deletedAt: { $isNull: true } } },
                  map: {
                    creator: {},
                    readPermissions: {},
                    writePermissions: {},
                  },
                  fromConcept: {},
                  toConcept: {},
                }
              : {
                  $: { where: { deletedAt: { $isNull: true } } },
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
      deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
    })) || []

  return relationships
}

/**
 * Hook to get ALL relationships for the current map (no perspective filtering).
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Unlike `useRelationships()`,
 * this hook does not filter by perspective, returning all relationships in the
 * current map regardless of perspective selection.
 * 
 * **Use Cases:**
 * - Editing perspectives: Shows all available relationships to select from
 * - Admin views: Displaying the full relationship set
 * - Debugging: Inspecting all relationships regardless of perspective
 * 
 * Soft-deleted relationships (with `deletedAt` set) are automatically excluded.
 * 
 * @returns Array of all relationships for the current map (no perspective filtering)
 * 
 * @example
 * ```tsx
 * import { useAllRelationships } from '@/hooks/useRelationships'
 * 
 * function PerspectiveEditor() {
 *   const allRelationships = useAllRelationships()
 *   
 *   return (
 *     <div>
 *       <h2>All Relationships ({allRelationships.length})</h2>
 *       {allRelationships.map(rel => (
 *         <RelationshipCheckbox key={rel.id} relationship={rel} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
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
              $: { where: { deletedAt: { $isNull: true } } },
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
      deletedAt: r.deletedAt ? new Date(r.deletedAt) : null,
    })) || []

  return relationships
}

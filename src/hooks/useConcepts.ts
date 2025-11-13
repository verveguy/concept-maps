/**
 * Hooks for querying concepts from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Concept } from '@/lib/schema'

/**
 * Hook to get concepts for the current map/perspective.
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Automatically filters
 * concepts by the current map ID and optionally by perspective concept IDs
 * if a perspective is selected.
 * 
 * The hook subscribes to real-time updates, so the returned array will
 * automatically update when concepts are added, modified, or deleted by
 * any user with access to the map.
 * 
 * **Perspective Filtering:**
 * - If a perspective is selected, only concepts included in that perspective
 *   are returned
 * - If no perspective is selected, all concepts in the current map are returned
 * - Soft-deleted concepts (with `deletedAt` set) are automatically excluded
 * 
 * @returns Array of concepts filtered by current map and perspective (if selected)
 * 
 * @example
 * ```tsx
 * import { useConcepts } from '@/hooks/useConcepts'
 * 
 * function ConceptList() {
 *   const concepts = useConcepts()
 *   
 *   return (
 *     <ul>
 *       {concepts.map(concept => (
 *         <li key={concept.id}>{concept.label}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
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
      userPlaced: c.userPlaced ?? undefined,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      deletedAt: c.deletedAt ? new Date(c.deletedAt) : null,
    })) || []

  return concepts
}

/**
 * Hook to get ALL concepts for the current map (no perspective filtering).
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Unlike `useConcepts()`,
 * this hook does not filter by perspective, returning all concepts in the
 * current map regardless of perspective selection.
 * 
 * **Use Cases:**
 * - Editing perspectives: Shows all available concepts to select from
 * - Admin views: Displaying the full concept set
 * - Debugging: Inspecting all concepts regardless of perspective
 * 
 * Soft-deleted concepts (with `deletedAt` set) are automatically excluded.
 * 
 * @returns Array of all concepts for the current map (no perspective filtering)
 * 
 * @example
 * ```tsx
 * import { useAllConcepts } from '@/hooks/useConcepts'
 * 
 * function PerspectiveEditor() {
 *   const allConcepts = useAllConcepts()
 *   
 *   return (
 *     <div>
 *       <h2>All Concepts ({allConcepts.length})</h2>
 *       {allConcepts.map(concept => (
 *         <ConceptCheckbox key={concept.id} concept={concept} />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
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
      userPlaced: c.userPlaced ?? undefined,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      deletedAt: c.deletedAt ? new Date(c.deletedAt) : null,
    })) || []

  return concepts
}

/**
 * Hooks for querying comments from InstantDB.
 * Provides reactive data fetching with real-time updates.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import type { Comment } from '@/lib/schema'

/**
 * Hook to get comments for the current map/perspective.
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Automatically filters
 * comments by the current map ID and optionally by perspective concept IDs
 * if a perspective is selected.
 * 
 * The hook subscribes to real-time updates, so the returned array will
 * automatically update when comments are added, modified, or deleted by
 * any user with access to the map.
 * 
 * **Perspective Filtering:**
 * - If a perspective is selected, only comments linked to concepts included
 *   in that perspective are returned
 * - If no perspective is selected, all comments in the current map are returned
 * - Soft-deleted comments (with `deletedAt` set) are automatically excluded
 * 
 * **Creator Information:**
 * Comments include creator user data (email, imageURL) for avatar display.
 * 
 * @returns Array of comments filtered by current map and perspective (if selected)
 * 
 * @example
 * ```tsx
 * import { useComments } from '@/hooks/useComments'
 * 
 * function CommentList() {
 *   const comments = useComments()
 *   
 *   return (
 *     <ul>
 *       {comments.map(comment => (
 *         <li key={comment.id}>{comment.text}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useComments() {
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

  // Get comments for the map, including creator and concept links
  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            comments: {
              $: { where: { deletedAt: { $isNull: true } } },
              creator: {},
              concepts: {},
            },
          },
        }
      : null
  )

  // Transform InstantDB data to schema format
  const allComments: Comment[] =
    data?.maps?.[0]?.comments?.map((c: any) => ({
      id: c.id,
      mapId: c.map?.id || currentMapId || '',
      text: c.text,
      position: { x: c.positionX, y: c.positionY },
      conceptIds: c.concepts?.map((concept: any) => concept.id) || [],
      createdBy: c.creator?.id || '',
      creatorEmail: c.creator?.email || null,
      creatorImageURL: c.creator?.imageURL || null,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      deletedAt: c.deletedAt ? new Date(c.deletedAt) : null,
    })) || []

  // Filter by perspective: only show comments linked to visible concepts
  if (conceptIds && conceptIds.length > 0) {
    const visibleConceptIds = new Set(conceptIds)
    return allComments.filter((comment) =>
      comment.conceptIds.some((conceptId) => visibleConceptIds.has(conceptId))
    )
  }

  return allComments
}


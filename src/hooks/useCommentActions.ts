/**
 * Hook for comment CRUD operations.
 * Provides actions for creating, updating, and deleting comments.
 * Uses db.transact() with tx objects for all mutations.
 */

import { db, tx, id } from '@/lib/instant'

/**
 * Data structure for creating a new comment.
 */
export interface CreateCommentData {
  /** Map ID this comment belongs to */
  mapId: string
  /** Comment text content */
  text: string
  /** Position coordinates on the canvas */
  position: { x: number; y: number }
  /** Array of concept IDs to link this comment to */
  conceptIds?: string[]
}

/**
 * Data structure for updating a comment.
 */
export interface UpdateCommentData {
  /** New comment text */
  text?: string
  /** New position coordinates */
  position?: { x: number; y: number }
  /** Whether this node was placed by the user (true) or by layout algorithm (false) */
  userPlaced?: boolean
}

/**
 * Hook for comment CRUD operations.
 * 
 * Provides functions to create, update, delete, and manage comment-concept links in InstantDB.
 * All mutations use `db.transact()` with transaction objects for atomic operations.
 * 
 * **Operations:**
 * - `createComment`: Creates a new comment with text, position, and links to concepts
 * - `updateComment`: Updates existing comment properties (partial updates supported)
 * - `deleteComment`: Soft-deletes a comment by setting `deletedAt` timestamp
 * - `linkCommentToConcept`: Adds a link between a comment and a concept
 * - `unlinkCommentFromConcept`: Removes a link between a comment and a concept
 * 
 * **Transaction Safety:**
 * All operations are performed within InstantDB transactions, ensuring data
 * consistency and atomicity. If any part of a transaction fails, the entire
 * operation is rolled back.
 * 
 * @returns Object containing comment mutation functions:
 * - `createComment`: Create a new comment
 * - `updateComment`: Update an existing comment
 * - `deleteComment`: Soft-delete a comment
 * - `linkCommentToConcept`: Link a comment to a concept
 * - `unlinkCommentFromConcept`: Unlink a comment from a concept
 * 
 * @example
 * ```tsx
 * import { useCommentActions } from '@/hooks/useCommentActions'
 * 
 * function CommentCreator() {
 *   const { createComment } = useCommentActions()
 *   
 *   const handleCreate = async () => {
 *     await createComment({
 *       mapId: 'map-123',
 *       text: 'This is a comment',
 *       position: { x: 100, y: 200 },
 *       conceptIds: ['concept-1', 'concept-2']
 *     })
 *   }
 *   
 *   return <button onClick={handleCreate}>Create Comment</button>
 * }
 * ```
 */
export function useCommentActions() {
  const auth = db.useAuth()

  /**
   * Create a new comment in the database.
   * 
   * Creates a comment with the provided data and links it to the specified map,
   * creator (current user), and optionally to concepts. The comment ID is
   * automatically generated. Timestamps (`createdAt`, `updatedAt`) are set to
   * the current time.
   * 
   * @param comment - Comment data to create
   * @param comment.mapId - ID of the map this comment belongs to
   * @param comment.text - Comment text content
   * @param comment.position - X/Y coordinates on the canvas
   * @param comment.conceptIds - Optional array of concept IDs to link this comment to
   * 
   * @throws Error if the transaction fails or user is not authenticated
   * 
   * @example
   * ```tsx
   * const { createComment } = useCommentActions()
   * 
   * await createComment({
   *   mapId: currentMapId,
   *   text: 'This concept needs more detail',
   *   position: { x: 100, y: 200 },
   *   conceptIds: ['concept-1']
   * })
   * ```
   */
  const createComment = async (comment: CreateCommentData) => {
    if (!auth.user?.id) {
      throw new Error('User must be authenticated to create comments')
    }

    const commentId = id()
    const transactions: Parameters<typeof db.transact>[0] = [
      tx.comments[commentId]
        .update({
          text: comment.text,
          positionX: comment.position.x,
          positionY: comment.position.y,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({ map: comment.mapId, creator: auth.user.id }),
    ]

    // Link to concepts if provided
    if (comment.conceptIds && comment.conceptIds.length > 0) {
      comment.conceptIds.forEach((conceptId) => {
        transactions.push(tx.comments[commentId].link({ concepts: conceptId }))
      })
    }

    await db.transact(transactions)
  }

  /**
   * Update an existing comment.
   * 
   * Performs a partial update on a comment. Only provided fields are updated;
   * unspecified fields remain unchanged. The `updatedAt` timestamp is automatically
   * set to the current time.
   * 
   * **Supported Updates:**
   * - `text`: Change the comment's text content
   * - `position`: Update the comment's canvas position
   * 
   * @param commentId - ID of the comment to update
   * @param updates - Partial comment data to update. Only provided fields will be changed
   * @param updates.text - New comment text (optional)
   * @param updates.position - New position coordinates (optional)
   * 
   * @throws Error if the comment doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { updateComment } = useCommentActions()
   * 
   * // Update just the text
   * await updateComment(commentId, { text: 'Updated comment text' })
   * 
   * // Update position after dragging
   * await updateComment(commentId, { position: { x: 150, y: 250 } })
   * ```
   */
  const updateComment = async (
    commentId: string,
    updates: UpdateCommentData
  ) => {
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (updates.text !== undefined) updateData.text = updates.text
    if (updates.position !== undefined) {
      updateData.positionX = updates.position.x
      updateData.positionY = updates.position.y
    }
    if (updates.userPlaced !== undefined) updateData.userPlaced = updates.userPlaced

    await db.transact([tx.comments[commentId].update(updateData)])
  }

  /**
   * Delete a comment (soft delete).
   * 
   * Performs a soft delete by setting the `deletedAt` timestamp. The comment
   * record remains in the database but is excluded from normal queries. This
   * allows for undo functionality and audit trails.
   * 
   * **Soft Delete Behavior:**
   * - Comment is marked as deleted with `deletedAt` timestamp
   * - Comment is automatically excluded from `useComments()` queries
   * - Comment can be restored using `undeleteComment()` (if implemented)
   * 
   * @param commentId - ID of the comment to soft-delete
   * 
   * @throws Error if the comment doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { deleteComment } = useCommentActions()
   * 
   * const handleDelete = async () => {
   *   if (confirm('Delete this comment?')) {
   *     await deleteComment(commentId)
   *   }
   * }
   * ```
   */
  const deleteComment = async (commentId: string) => {
    await db.transact([
      tx.comments[commentId].update({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ])
  }

  /**
   * Link a comment to a concept.
   * 
   * Creates a many-to-many link between a comment and a concept. This allows
   * the comment to be associated with the concept. A comment can be linked
   * to multiple concepts.
   * 
   * @param commentId - ID of the comment to link
   * @param conceptId - ID of the concept to link to
   * 
   * @throws Error if the comment or concept doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { linkCommentToConcept } = useCommentActions()
   * 
   * await linkCommentToConcept(commentId, conceptId)
   * ```
   */
  const linkCommentToConcept = async (commentId: string, conceptId: string) => {
    await db.transact([tx.comments[commentId].link({ concepts: conceptId })])
  }

  /**
   * Unlink a comment from a concept.
   * 
   * Removes the link between a comment and a concept. The comment and concept
   * remain in the database, but they are no longer associated.
   * 
   * @param commentId - ID of the comment to unlink
   * @param conceptId - ID of the concept to unlink from
   * 
   * @throws Error if the link doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { unlinkCommentFromConcept } = useCommentActions()
   * 
   * await unlinkCommentFromConcept(commentId, conceptId)
   * ```
   */
  const unlinkCommentFromConcept = async (
    commentId: string,
    conceptId: string
  ) => {
    await db.transact([tx.comments[commentId].unlink({ concepts: conceptId })])
  }

  /**
   * Resolve a comment (mark as resolved).
   * 
   * Sets the `resolved` field to `true` for a comment. Resolved comments
   * can be filtered out from views and are typically marked with a checkmark.
   * 
   * @param commentId - ID of the comment to resolve
   * 
   * @throws Error if the comment doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { resolveComment } = useCommentActions()
   * 
   * await resolveComment(commentId)
   * ```
   */
  const resolveComment = async (commentId: string) => {
    await db.transact([
      tx.comments[commentId].update({
        resolved: true,
        updatedAt: Date.now(),
      }),
    ])
  }

  /**
   * Unresolve a comment (mark as not resolved).
   * 
   * Sets the `resolved` field to `false` for a comment, making it active again.
   * 
   * @param commentId - ID of the comment to unresolve
   * 
   * @throws Error if the comment doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { unresolveComment } = useCommentActions()
   * 
   * await unresolveComment(commentId)
   * ```
   */
  const unresolveComment = async (commentId: string) => {
    await db.transact([
      tx.comments[commentId].update({
        resolved: false,
        updatedAt: Date.now(),
      }),
    ])
  }

  /**
   * Restore a soft-deleted comment.
   * 
   * Restores a comment that was previously soft-deleted by clearing the `deletedAt`
   * timestamp. This allows the comment to appear in normal queries again.
   * 
   * **Restoration Behavior:**
   * - Clears the `deletedAt` timestamp (sets to null)
   * - Updates the `updatedAt` timestamp
   * - Comment becomes visible in `useComments()` queries again
   * 
   * @param commentId - ID of the comment to restore
   * 
   * @throws Error if the comment doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { undeleteComment } = useCommentActions()
   * 
   * // Restore a deleted comment
   * await undeleteComment(commentId)
   * ```
   */
  const undeleteComment = async (commentId: string) => {
    try {
      // Use merge with null to remove the deletedAt property
      // According to InstantDB docs: "Setting a key to null will remove the property"
      await db.transact([
        tx.comments[commentId].merge({
          deletedAt: null,
          updatedAt: Date.now(),
        }),
      ])
      console.log('Successfully undeleted comment:', commentId)
    } catch (error) {
      console.error('Error undeleting comment:', commentId, error)
      throw error
    }
  }

  return {
    createComment,
    updateComment,
    deleteComment,
    linkCommentToConcept,
    unlinkCommentFromConcept,
    resolveComment,
    unresolveComment,
    undeleteComment,
  }
}


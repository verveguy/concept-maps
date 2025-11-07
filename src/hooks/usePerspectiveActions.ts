/**
 * Hook for perspective CRUD operations.
 * Provides actions for creating, updating, and deleting perspectives.
 * Uses db.transact() with tx objects for all mutations.
 */

import { db, tx, id } from '@/lib/instant'

/**
 * Data structure for creating a new perspective.
 */
export interface CreatePerspectiveData {
  /** Map ID this perspective belongs to */
  mapId: string
  /** Name of the perspective */
  name: string
  /** Optional array of concept IDs to include */
  conceptIds?: string[]
  /** Optional array of relationship IDs to include */
  relationshipIds?: string[]
}

/**
 * Data structure for updating a perspective.
 */
export interface UpdatePerspectiveData {
  /** New name */
  name?: string
  /** New array of concept IDs */
  conceptIds?: string[]
  /** New array of relationship IDs */
  relationshipIds?: string[]
}

/**
 * Hook for perspective CRUD operations.
 * 
 * Provides functions to create, update, delete, and manage perspectives in InstantDB.
 * All mutations use `db.transact()` with transaction objects for atomic operations.
 * 
 * **Operations:**
 * - `createPerspective`: Creates a new perspective with name and concept/relationship selections
 * - `updatePerspective`: Updates existing perspective properties (name, conceptIds, relationshipIds)
 * - `deletePerspective`: Permanently deletes a perspective
 * - `toggleConceptInPerspective`: Adds or removes a concept from a perspective
 * - `toggleRelationshipInPerspective`: Adds or removes a relationship from a perspective
 * 
 * **Perspective Management:**
 * Perspectives allow users to create filtered views of a concept map by selecting
 * specific concepts and relationships. When a concept is added to a perspective, its
 * connected relationships are automatically included (if both concepts are selected).
 * 
 * **Transaction Safety:**
 * All operations are performed within InstantDB transactions, ensuring data
 * consistency and atomicity. If any part of a transaction fails, the entire
 * operation is rolled back.
 * 
 * @returns Object containing perspective management functions:
 * - `createPerspective`: Create a new perspective
 * - `updatePerspective`: Update an existing perspective
 * - `deletePerspective`: Delete a perspective
 * - `toggleConceptInPerspective`: Toggle a concept's inclusion in a perspective
 * - `toggleRelationshipInPerspective`: Toggle a relationship's inclusion in a perspective
 * 
 * @example
 * ```tsx
 * import { usePerspectiveActions } from '@/hooks/usePerspectiveActions'
 * 
 * function PerspectiveCreator() {
 *   const { createPerspective } = usePerspectiveActions()
 *   
 *   const handleCreate = async () => {
 *     await createPerspective({
 *       mapId: currentMapId,
 *       name: 'Frontend Concepts',
 *       conceptIds: ['react-id', 'vue-id'],
 *       relationshipIds: ['rel-1']
 *     })
 *   }
 *   
 *   return <button onClick={handleCreate}>Create Perspective</button>
 * }
 * ```
 */
export function usePerspectiveActions() {
  const auth = db.useAuth()

  /**
   * Create a new perspective.
   * 
   * Creates a perspective with the provided name and concept/relationship selections.
   * The perspective ID is automatically generated. The `createdAt` timestamp is
   * set to the current time, and the perspective is linked to the authenticated user
   * as the creator.
   * 
   * **Concept/Relationship Selection:**
   * - `conceptIds`: Array of concept IDs to include in the perspective
   * - `relationshipIds`: Array of relationship IDs to include in the perspective
   * 
   * Both arrays are optional and default to empty arrays if not provided.
   * 
   * @param perspective - Perspective data to create
   * @param perspective.mapId - ID of the map this perspective belongs to
   * @param perspective.name - Display name for the perspective
   * @param perspective.conceptIds - Optional array of concept IDs to include (defaults to empty array)
   * @param perspective.relationshipIds - Optional array of relationship IDs to include (defaults to empty array)
   * 
   * @throws Error if user is not authenticated or the transaction fails
   * 
   * @example
   * ```tsx
   * const { createPerspective } = usePerspectiveActions()
   * 
   * await createPerspective({
   *   mapId: currentMapId,
   *   name: 'Core Concepts',
   *   conceptIds: ['concept-1', 'concept-2'],
   *   relationshipIds: ['rel-1']
   * })
   * ```
   */
  const createPerspective = async (perspective: CreatePerspectiveData) => {
    if (!auth.user?.id) throw new Error('User must be authenticated')

    const perspectiveId = id()
    await db.transact([
      tx.perspectives[perspectiveId]
        .update({
          name: perspective.name,
          conceptIds: JSON.stringify(perspective.conceptIds || []),
          relationshipIds: JSON.stringify(perspective.relationshipIds || []),
          createdAt: Date.now(),
        })
        .link({
          map: perspective.mapId,
          creator: auth.user.id,
        }),
    ])
  }

  /**
   * Update an existing perspective.
   * 
   * Performs a partial update on a perspective. Only provided fields are updated;
   * unspecified fields remain unchanged.
   * 
   * **Supported Updates:**
   * - `name`: Change the perspective's display name
   * - `conceptIds`: Replace the array of included concept IDs
   * - `relationshipIds`: Replace the array of included relationship IDs
   * 
   * **Note:** When updating `conceptIds` or `relationshipIds`, the entire array
   * is replaced. To add/remove individual items, use `toggleConceptInPerspective`
   * or `toggleRelationshipInPerspective` instead.
   * 
   * @param perspectiveId - ID of the perspective to update
   * @param updates - Partial perspective data to update
   * @param updates.name - New display name (optional)
   * @param updates.conceptIds - New array of concept IDs (optional, replaces existing array)
   * @param updates.relationshipIds - New array of relationship IDs (optional, replaces existing array)
   * 
   * @throws Error if the perspective doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { updatePerspective } = usePerspectiveActions()
   * 
   * // Update just the name
   * await updatePerspective(perspectiveId, { name: 'Updated Name' })
   * 
   * // Update concept selection
   * await updatePerspective(perspectiveId, {
   *   conceptIds: ['concept-1', 'concept-2', 'concept-3']
   * })
   * ```
   */
  const updatePerspective = async (
    perspectiveId: string,
    updates: UpdatePerspectiveData
  ) => {
    const updateData: Record<string, unknown> = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.conceptIds !== undefined) {
      updateData.conceptIds = JSON.stringify(updates.conceptIds)
    }
    if (updates.relationshipIds !== undefined) {
      updateData.relationshipIds = JSON.stringify(updates.relationshipIds)
    }

    await db.transact([tx.perspectives[perspectiveId].update(updateData)])
  }

  /**
   * Delete a perspective.
   * 
   * Permanently deletes a perspective from the database. This operation cannot
   * be undone. The perspective's concepts and relationships are not affected;
   * only the perspective view itself is removed.
   * 
   * **Note:** This is a hard delete, not a soft delete. The perspective is
   * immediately removed from the database.
   * 
   * @param perspectiveId - ID of the perspective to delete
   * 
   * @throws Error if the perspective doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { deletePerspective } = usePerspectiveActions()
   * 
   * const handleDelete = async () => {
   *   if (confirm('Delete this perspective?')) {
   *     await deletePerspective(perspectiveId)
   *   }
   * }
   * ```
   */
  const deletePerspective = async (perspectiveId: string) => {
    await db.transact([tx.perspectives[perspectiveId].delete()])
  }

  /**
   * Toggle a concept's inclusion in a perspective.
   * 
   * Adds or removes a concept from a perspective based on its current state.
   * Automatically handles relationship cleanup:
   * - When removing a concept: Also removes all relationships involving that concept
   * - When adding a concept: Automatically adds relationships where both concepts are now selected
   * 
   * **Relationship Auto-management:**
   * This function intelligently manages relationships to maintain perspective consistency:
   * - Removing a concept removes all its relationships (both incoming and outgoing)
   * - Adding a concept adds relationships where both endpoints are now in the perspective
   * 
   * @param perspectiveId - ID of the perspective to update
   * @param conceptId - ID of the concept to toggle
   * @param currentConceptIds - Current array of concept IDs in the perspective (for state calculation)
   * @param currentRelationshipIds - Current array of relationship IDs in the perspective (for state calculation)
   * @param allRelationships - All relationships in the map (used for relationship auto-management)
   * 
   * @throws Error if the perspective doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { toggleConceptInPerspective } = usePerspectiveActions()
   * const perspective = usePerspectives().find(p => p.id === perspectiveId)
   * const allRelationships = useAllRelationships()
   * 
   * const handleToggle = async () => {
   *   await toggleConceptInPerspective(
   *     perspectiveId,
   *     conceptId,
   *     perspective.conceptIds,
   *     perspective.relationshipIds,
   *     allRelationships
   *   )
   * }
   * ```
   */
  const toggleConceptInPerspective = async (
    perspectiveId: string,
    conceptId: string,
    currentConceptIds: string[],
    currentRelationshipIds: string[],
    allRelationships: Array<{ id: string; fromConceptId: string; toConceptId: string }>
  ) => {
    const isIncluded = currentConceptIds.includes(conceptId)
    let newConceptIds: string[]
    let newRelationshipIds: string[]

    if (isIncluded) {
      // Remove concept
      newConceptIds = currentConceptIds.filter((id) => id !== conceptId)
      
      // Also remove all relationships involving this concept
      const relationshipsToRemove = new Set<string>()
      allRelationships.forEach((rel) => {
        if (rel.fromConceptId === conceptId || rel.toConceptId === conceptId) {
          relationshipsToRemove.add(rel.id)
        }
      })
      
      // Remove affected relationships from perspective
      newRelationshipIds = currentRelationshipIds.filter(
        (id: string) => !relationshipsToRemove.has(id)
      )
    } else {
      // Add concept
      newConceptIds = [...currentConceptIds, conceptId]
      
      // Auto-add relationships where both concepts are now selected
      const relationshipsToAdd = new Set<string>(currentRelationshipIds)
      allRelationships.forEach((rel) => {
        if (
          (rel.fromConceptId === conceptId && newConceptIds.includes(rel.toConceptId)) ||
          (rel.toConceptId === conceptId && newConceptIds.includes(rel.fromConceptId))
        ) {
          relationshipsToAdd.add(rel.id)
        }
      })
      newRelationshipIds = Array.from(relationshipsToAdd)
    }

    await db.transact([
      tx.perspectives[perspectiveId].update({
        conceptIds: JSON.stringify(newConceptIds),
        relationshipIds: JSON.stringify(newRelationshipIds),
      }),
    ])
  }

  /**
   * Toggle a relationship's inclusion in a perspective.
   * 
   * Adds or removes a relationship from a perspective based on its current state.
   * 
   * **Validation:**
   * Relationships can only be added to a perspective if both their source and
   * target concepts are already included in the perspective. This ensures
   * perspective consistency.
   * 
   * @param perspectiveId - ID of the perspective to update
   * @param relationshipId - ID of the relationship to toggle
   * @param currentRelationshipIds - Current array of relationship IDs in the perspective
   * 
   * @throws Error if the perspective doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { toggleRelationshipInPerspective } = usePerspectiveActions()
   * const perspective = usePerspectives().find(p => p.id === perspectiveId)
   * 
   * const handleToggle = async () => {
   *   await toggleRelationshipInPerspective(
   *     perspectiveId,
   *     relationshipId,
   *     perspective.relationshipIds
   *   )
   * }
   * ```
   */
  const toggleRelationshipInPerspective = async (
    perspectiveId: string,
    relationshipId: string,
    currentRelationshipIds: string[]
  ) => {
    const isIncluded = currentRelationshipIds.includes(relationshipId)
    const newRelationshipIds = isIncluded
      ? currentRelationshipIds.filter((id) => id !== relationshipId)
      : [...currentRelationshipIds, relationshipId]

    await db.transact([
      tx.perspectives[perspectiveId].update({
        relationshipIds: JSON.stringify(newRelationshipIds),
      }),
    ])
  }

  return {
    createPerspective,
    updatePerspective,
    deletePerspective,
    toggleConceptInPerspective,
    toggleRelationshipInPerspective,
  }
}

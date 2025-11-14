/**
 * Hook for concept CRUD operations.
 * Provides actions for creating, updating, and deleting concepts.
 * Uses db.transact() with tx objects for all mutations.
 */

import { db, tx, id } from '@/lib/instant'

/**
 * Data structure for creating a new concept.
 */
export interface CreateConceptData {
  /** Map ID this concept belongs to */
  mapId: string
  /** Display label for the concept */
  label: string
  /** Position coordinates on the canvas */
  position: { x: number; y: number }
  /** Optional markdown notes */
  notes?: string
  /** Optional metadata as key-value pairs */
  metadata?: Record<string, unknown>
  /** Whether the concept was placed by the user (vs. layout algorithm) */
  userPlaced?: boolean
}

/**
 * Data structure for updating a concept.
 */
export interface UpdateConceptData {
  /** New display label */
  label?: string
  /** New position coordinates */
  position?: { x: number; y: number }
  /** New markdown notes */
  notes?: string
  /** New metadata */
  metadata?: Record<string, unknown>
  /** Whether to show notes and metadata sections */
  showNotesAndMetadata?: boolean
  /** Whether this node was placed by the user (true) or by layout algorithm (false) */
  userPlaced?: boolean
}

/**
 * Hook for concept CRUD operations.
 * 
 * Provides functions to create, update, delete, and undelete concepts in InstantDB.
 * All mutations use `db.transact()` with transaction objects for atomic operations.
 * 
 * **Operations:**
 * - `createConcept`: Creates a new concept with label, position, notes, and metadata
 * - `updateConcept`: Updates existing concept properties (partial updates supported)
 * - `deleteConcept`: Soft-deletes a concept by setting `deletedAt` timestamp
 * - `undeleteConcept`: Restores a soft-deleted concept by clearing `deletedAt`
 * 
 * **Transaction Safety:**
 * All operations are performed within InstantDB transactions, ensuring data
 * consistency and atomicity. If any part of a transaction fails, the entire
 * operation is rolled back.
 * 
 * @returns Object containing concept mutation functions:
 * - `createConcept`: Create a new concept
 * - `updateConcept`: Update an existing concept
 * - `deleteConcept`: Soft-delete a concept
 * - `undeleteConcept`: Restore a soft-deleted concept
 * 
 * @example
 * ```tsx
 * import { useConceptActions } from '@/hooks/useConceptActions'
 * 
 * function ConceptCreator() {
 *   const { createConcept } = useConceptActions()
 *   
 *   const handleCreate = async () => {
 *     await createConcept({
 *       mapId: 'map-123',
 *       label: 'New Concept',
 *       position: { x: 100, y: 200 },
 *       notes: 'Some notes',
 *       metadata: { category: 'important' }
 *     })
 *   }
 *   
 *   return <button onClick={handleCreate}>Create Concept</button>
 * }
 * ```
 */
export function useConceptActions() {
  /**
   * Create a new concept in the database.
   * 
   * Creates a concept with the provided data and links it to the specified map.
   * The concept ID is automatically generated. Timestamps (`createdAt`, `updatedAt`)
   * are set to the current time.
   * 
   * @param concept - Concept data to create
   * @param concept.mapId - ID of the map this concept belongs to
   * @param concept.label - Display label for the concept
   * @param concept.position - X/Y coordinates on the canvas
   * @param concept.notes - Optional markdown notes (defaults to empty string)
   * @param concept.metadata - Optional metadata object (defaults to empty object)
   * 
   * @throws Error if the transaction fails
   * 
   * @example
   * ```tsx
   * const { createConcept } = useConceptActions()
   * 
   * await createConcept({
   *   mapId: currentMapId,
   *   label: 'React',
   *   position: { x: 100, y: 200 },
   *   notes: '# React\nA JavaScript library for building user interfaces.',
   *   metadata: { category: 'framework', language: 'JavaScript' }
   * })
   * ```
   */
  const createConcept = async (concept: CreateConceptData) => {
    const conceptId = id()
    await db.transact([
      tx.concepts[conceptId]
        .update({
          label: concept.label,
          positionX: concept.position.x,
          positionY: concept.position.y,
          notes: concept.notes || '',
          metadata: JSON.stringify(concept.metadata || {}),
          // Default to userPlaced: true for explicit user placement (right-click, drag-to-create)
          // Can be set to false for layout-placed nodes (triple entry)
          userPlaced: concept.userPlaced !== undefined ? concept.userPlaced : true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({ map: concept.mapId }),
    ])
  }

  /**
   * Update an existing concept.
   * 
   * Performs a partial update on a concept. Only provided fields are updated;
   * unspecified fields remain unchanged. The `updatedAt` timestamp is automatically
   * set to the current time.
   * 
   * **Supported Updates:**
   * - `label`: Change the concept's display label
   * - `position`: Update the concept's canvas position
   * - `notes`: Update markdown notes
   * - `metadata`: Replace or merge metadata (object is fully replaced)
   * 
   * @param conceptId - ID of the concept to update
   * @param updates - Partial concept data to update. Only provided fields will be changed
   * @param updates.label - New display label (optional)
   * @param updates.position - New position coordinates (optional)
   * @param updates.notes - New markdown notes (optional)
   * @param updates.metadata - New metadata object (optional, replaces existing metadata)
   * 
   * @throws Error if the concept doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { updateConcept } = useConceptActions()
   * 
   * // Update just the label
   * await updateConcept(conceptId, { label: 'Updated Label' })
   * 
   * // Update position after dragging
   * await updateConcept(conceptId, { position: { x: 150, y: 250 } })
   * 
   * // Update multiple fields
   * await updateConcept(conceptId, {
   *   label: 'New Label',
   *   notes: 'Updated notes',
   *   metadata: { category: 'updated' }
   * })
   * ```
   */
  const updateConcept = async (
    conceptId: string,
    updates: UpdateConceptData
  ) => {
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (updates.label !== undefined) updateData.label = updates.label
    if (updates.position !== undefined) {
      updateData.positionX = updates.position.x
      updateData.positionY = updates.position.y
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.metadata !== undefined) {
      updateData.metadata = JSON.stringify(updates.metadata)
    }
    if (updates.showNotesAndMetadata !== undefined) updateData.showNotesAndMetadata = updates.showNotesAndMetadata
    if (updates.userPlaced !== undefined) updateData.userPlaced = updates.userPlaced

    await db.transact([tx.concepts[conceptId].update(updateData)])
  }

  /**
   * Delete a concept (soft delete).
   * 
   * Performs a soft delete by setting the `deletedAt` timestamp. The concept
   * record remains in the database but is excluded from normal queries. This
   * allows for undo functionality and audit trails.
   * 
   * **Soft Delete Behavior:**
   * - Concept is marked as deleted with `deletedAt` timestamp
   * - Concept is automatically excluded from `useConcepts()` queries
   * - Concept can be restored using `undeleteConcept()`
   * - Concept can be permanently deleted via trash management
   * 
   * @param conceptId - ID of the concept to soft-delete
   * 
   * @throws Error if the concept doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { deleteConcept } = useConceptActions()
   * 
   * const handleDelete = async () => {
   *   if (confirm('Delete this concept?')) {
   *     await deleteConcept(conceptId)
   *   }
   * }
   * ```
   */
  const deleteConcept = async (conceptId: string) => {
    await db.transact([
      tx.concepts[conceptId].update({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ])
  }

  /**
   * Undelete a concept (restore from soft delete).
   * 
   * Restores a soft-deleted concept by clearing the `deletedAt` timestamp.
   * Uses InstantDB's `merge()` with `null` to remove the property, which
   * effectively restores the concept to active status.
   * 
   * **Restore Behavior:**
   * - Clears the `deletedAt` timestamp
   * - Concept becomes visible in normal queries again
   * - Concept's relationships are also restored (if they were deleted together)
   * 
   * @param conceptId - ID of the concept to restore
   * 
   * @throws Error if the concept doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { undeleteConcept } = useConceptActions()
   * 
   * // Restore a deleted concept
   * await undeleteConcept(conceptId)
   * ```
   */
  const undeleteConcept = async (conceptId: string) => {
    try {
      // Use merge with null to remove the deletedAt property
      // According to InstantDB docs: "Setting a key to null will remove the property"
      await db.transact([
        tx.concepts[conceptId].merge({
          deletedAt: null,
          updatedAt: Date.now(),
        }),
      ])
      console.log('Successfully undeleted concept:', conceptId)
    } catch (error) {
      console.error('Error undeleting concept:', conceptId, error)
      throw error
    }
  }

  return {
    createConcept,
    updateConcept,
    deleteConcept,
    undeleteConcept,
  }
}

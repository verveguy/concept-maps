/**
 * Hook for relationship CRUD operations.
 * Provides actions for creating, updating, and deleting relationships.
 * Uses db.transact() with tx objects for all mutations.
 */

import { db, tx, id } from '@/lib/instant'

/**
 * Data structure for creating a new relationship.
 */
export interface CreateRelationshipData {
  /** Map ID this relationship belongs to */
  mapId: string
  /** Source concept ID */
  fromConceptId: string
  /** Target concept ID */
  toConceptId: string
  /** Primary label (direction: from -> to) */
  primaryLabel: string
  /** Reverse label (direction: to -> from), defaults to primaryLabel */
  reverseLabel?: string
  /** Optional markdown notes */
  notes?: string
  /** Optional metadata as key-value pairs */
  metadata?: Record<string, unknown>
}

/**
 * Data structure for updating a relationship.
 */
export interface UpdateRelationshipData {
  /** New primary label */
  primaryLabel?: string
  /** New reverse label */
  reverseLabel?: string
  /** New markdown notes */
  notes?: string
  /** New metadata */
  metadata?: Record<string, unknown>
}

/**
 * Hook for relationship CRUD operations.
 * 
 * Provides functions to create, update, delete, and undelete relationships in InstantDB.
 * All mutations use `db.transact()` with transaction objects for atomic operations.
 * 
 * **Operations:**
 * - `createRelationship`: Creates a new relationship between two concepts
 * - `updateRelationship`: Updates existing relationship properties (partial updates supported)
 * - `deleteRelationship`: Soft-deletes a relationship by setting `deletedAt` timestamp
 * - `undeleteRelationship`: Restores a soft-deleted relationship by clearing `deletedAt`
 * 
 * **Relationship Structure:**
 * Relationships connect two concepts with directional labels:
 * - `primaryLabel`: Label when viewing from source → target (e.g., "explains")
 * - `reverseLabel`: Label when viewing from target → source (e.g., "explained by")
 * 
 * **Transaction Safety:**
 * All operations are performed within InstantDB transactions, ensuring data
 * consistency and atomicity. If any part of a transaction fails, the entire
 * operation is rolled back.
 * 
 * @returns Object containing relationship mutation functions:
 * - `createRelationship`: Create a new relationship
 * - `updateRelationship`: Update an existing relationship
 * - `deleteRelationship`: Soft-delete a relationship
 * - `undeleteRelationship`: Restore a soft-deleted relationship
 * 
 * @example
 * ```tsx
 * import { useRelationshipActions } from '@/hooks/useRelationshipActions'
 * 
 * function RelationshipCreator() {
 *   const { createRelationship } = useRelationshipActions()
 *   
 *   const handleCreate = async () => {
 *     await createRelationship({
 *       mapId: 'map-123',
 *       fromConceptId: 'concept-1',
 *       toConceptId: 'concept-2',
 *       primaryLabel: 'explains',
 *       reverseLabel: 'explained by',
 *       notes: 'Relationship notes',
 *       metadata: { strength: 'strong' }
 *     })
 *   }
 *   
 *   return <button onClick={handleCreate}>Create Relationship</button>
 * }
 * ```
 */
export function useRelationshipActions() {
  /**
   * Create a new relationship between two concepts.
   * 
   * Creates a relationship with the provided data and links it to the specified map
   * and concepts. The relationship ID is automatically generated. Timestamps
   * (`createdAt`, `updatedAt`) are set to the current time.
   * 
   * **Directional Labels:**
   * Relationships have two labels to support bidirectional reading:
   * - `primaryLabel`: Used when viewing from source → target concept
   * - `reverseLabel`: Used when viewing from target → source concept
   * 
   * If `reverseLabel` is not provided, it defaults to `primaryLabel`.
   * 
   * @param relationship - Relationship data to create
   * @param relationship.mapId - ID of the map this relationship belongs to
   * @param relationship.fromConceptId - Source concept ID
   * @param relationship.toConceptId - Target concept ID
   * @param relationship.primaryLabel - Label for source → target direction
   * @param relationship.reverseLabel - Label for target → source direction (defaults to primaryLabel)
   * @param relationship.notes - Optional markdown notes (defaults to empty string)
   * @param relationship.metadata - Optional metadata object (defaults to empty object)
   * 
   * @throws Error if the transaction fails or concepts don't exist
   * 
   * @example
   * ```tsx
   * const { createRelationship } = useRelationshipActions()
   * 
   * await createRelationship({
   *   mapId: currentMapId,
   *   fromConceptId: 'react-id',
   *   toConceptId: 'ui-id',
   *   primaryLabel: 'is used for',
   *   reverseLabel: 'uses',
   *   notes: 'React is commonly used for building user interfaces.',
   *   metadata: { category: 'technology' }
   * })
   * ```
   */
  const createRelationship = async (relationship: CreateRelationshipData) => {
    const relationshipId = id()
    await db.transact([
      tx.relationships[relationshipId]
        .update({
          primaryLabel: relationship.primaryLabel,
          reverseLabel: relationship.reverseLabel || relationship.primaryLabel,
          notes: relationship.notes || '',
          metadata: JSON.stringify(relationship.metadata || {}),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        .link({
          map: relationship.mapId,
          fromConcept: relationship.fromConceptId,
          toConcept: relationship.toConceptId,
        }),
    ])
  }

  /**
   * Update an existing relationship.
   * 
   * Performs a partial update on a relationship. Only provided fields are updated;
   * unspecified fields remain unchanged. The `updatedAt` timestamp is automatically
   * set to the current time.
   * 
   * **Supported Updates:**
   * - `primaryLabel`: Change the forward-direction label
   * - `reverseLabel`: Change the reverse-direction label
   * - `notes`: Update markdown notes
   * - `metadata`: Replace or merge metadata (object is fully replaced)
   * 
   * @param relationshipId - ID of the relationship to update
   * @param updates - Partial relationship data to update. Only provided fields will be changed
   * @param updates.primaryLabel - New forward-direction label (optional)
   * @param updates.reverseLabel - New reverse-direction label (optional)
   * @param updates.notes - New markdown notes (optional)
   * @param updates.metadata - New metadata object (optional, replaces existing metadata)
   * 
   * @throws Error if the relationship doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { updateRelationship } = useRelationshipActions()
   * 
   * // Update just the primary label
   * await updateRelationship(relationshipId, { primaryLabel: 'updated label' })
   * 
   * // Update both labels
   * await updateRelationship(relationshipId, {
   *   primaryLabel: 'is part of',
   *   reverseLabel: 'contains'
   * })
   * ```
   */
  const updateRelationship = async (
    relationshipId: string,
    updates: UpdateRelationshipData
  ) => {
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    }

    if (updates.primaryLabel !== undefined)
      updateData.primaryLabel = updates.primaryLabel
    if (updates.reverseLabel !== undefined)
      updateData.reverseLabel = updates.reverseLabel
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.metadata !== undefined) {
      updateData.metadata = JSON.stringify(updates.metadata)
    }

    await db.transact([tx.relationships[relationshipId].update(updateData)])
  }

  /**
   * Delete a relationship (soft delete).
   * 
   * Performs a soft delete by setting the `deletedAt` timestamp. The relationship
   * record remains in the database but is excluded from normal queries. This
   * allows for undo functionality and audit trails.
   * 
   * **Soft Delete Behavior:**
   * - Relationship is marked as deleted with `deletedAt` timestamp
   * - Relationship is automatically excluded from `useRelationships()` queries
   * - Relationship can be restored using `undeleteRelationship()`
   * - Relationship can be permanently deleted via trash management
   * 
   * @param relationshipId - ID of the relationship to soft-delete
   * 
   * @throws Error if the relationship doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { deleteRelationship } = useRelationshipActions()
   * 
   * const handleDelete = async () => {
   *   if (confirm('Delete this relationship?')) {
   *     await deleteRelationship(relationshipId)
   *   }
   * }
   * ```
   */
  const deleteRelationship = async (relationshipId: string) => {
    await db.transact([
      tx.relationships[relationshipId].update({
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    ])
  }

  /**
   * Undelete a relationship (restore from soft delete).
   * 
   * Restores a soft-deleted relationship by clearing the `deletedAt` timestamp.
   * Uses InstantDB's `merge()` with `null` to remove the property, which
   * effectively restores the relationship to active status.
   * 
   * **Restore Behavior:**
   * - Clears the `deletedAt` timestamp
   * - Relationship becomes visible in normal queries again
   * - Both concepts must still exist for the relationship to be valid
   * 
   * @param relationshipId - ID of the relationship to restore
   * 
   * @throws Error if the relationship doesn't exist or the transaction fails
   * 
   * @example
   * ```tsx
   * const { undeleteRelationship } = useRelationshipActions()
   * 
   * // Restore a deleted relationship
   * await undeleteRelationship(relationshipId)
   * ```
   */
  const undeleteRelationship = async (relationshipId: string) => {
    try {
      // Use merge with null to remove the deletedAt property
      // According to InstantDB docs: "Setting a key to null will remove the property"
      await db.transact([
        tx.relationships[relationshipId].merge({
          deletedAt: null,
          updatedAt: Date.now(),
        }),
      ])
      console.log('Successfully undeleted relationship:', relationshipId)
    } catch (error) {
      console.error('Error undeleting relationship:', relationshipId, error)
      throw error
    }
  }

  return {
    createRelationship,
    updateRelationship,
    deleteRelationship,
    undeleteRelationship,
  }
}

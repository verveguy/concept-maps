/**
 * Hook for trash management operations.
 * Provides actions for permanently deleting soft-deleted entities.
 * Uses db.queryOnce() for one-time queries and db.transact() for mutations.
 */

import { db, tx } from '@/lib/instant'

/**
 * Hook for trash management operations.
 * Provides a function to permanently delete all soft-deleted entities owned by the current user.
 * Uses db.queryOnce() to fetch data on-demand rather than maintaining reactive subscriptions.
 * 
 * @returns Object containing emptyTrash function
 */
export function useTrashActions() {
  const auth = db.useAuth()
  const userId = auth.user?.id

  /**
   * Permanently deletes all soft-deleted entities owned by the current user.
   * Queries the database once to find all deleted entities, then permanently deletes them.
   * This operation cannot be undone.
   * 
   * @throws Error if user is not authenticated
   * @returns Promise that resolves with deletion counts when all deletions are complete
   */
  const emptyTrash = async () => {
    if (!userId) {
      throw new Error('User must be authenticated to empty trash')
    }

    // Query all soft-deleted entities owned by the current user using queryOnce
    // This avoids reactive subscriptions for a one-time operation
    // Use $isNull: false to check for non-null values (deleted entities)
    const [mapsData, conceptsData, relationshipsData] = await Promise.all([
      db.queryOnce({
        maps: {
          $: {
            where: {
              deletedAt: { $isNull: false },
            },
          },
          creator: {},
        },
      }),
      db.queryOnce({
        concepts: {
          $: {
            where: {
              deletedAt: { $isNull: false },
            },
          },
          map: {
            creator: {},
          },
        },
      }),
      db.queryOnce({
        relationships: {
          $: {
            where: {
              deletedAt: { $isNull: false },
            },
          },
          map: {
            creator: {},
          },
        },
      }),
    ])

    // Filter to only entities owned by the current user
    const deletedMaps =
      mapsData.data?.maps?.filter((m: any) => m.creator?.id === userId) || []

    const deletedConcepts =
      conceptsData.data?.concepts?.filter(
        (c: any) => c.map?.creator?.id === userId
      ) || []

    const deletedRelationships =
      relationshipsData.data?.relationships?.filter(
        (r: any) => r.map?.creator?.id === userId
      ) || []

    // Collect all entity IDs to delete
    const mapIds = deletedMaps.map((m: any) => m.id)
    const conceptIds = deletedConcepts.map((c: any) => c.id)
    const relationshipIds = deletedRelationships.map((r: any) => r.id)

    // Build transaction with all deletions
    const deletions: any[] = []

    // Delete maps
    for (const mapId of mapIds) {
      deletions.push(tx.maps[mapId].delete())
    }

    // Delete concepts
    for (const conceptId of conceptIds) {
      deletions.push(tx.concepts[conceptId].delete())
    }

    // Delete relationships
    for (const relationshipId of relationshipIds) {
      deletions.push(tx.relationships[relationshipId].delete())
    }

    // Execute all deletions in a single transaction
    if (deletions.length > 0) {
      await db.transact(deletions)
      console.log(
        `Empty trash completed: ${mapIds.length} maps, ${conceptIds.length} concepts, ${relationshipIds.length} relationships permanently deleted`
      )
      return {
        deletedMapsCount: mapIds.length,
        deletedConceptsCount: conceptIds.length,
        deletedRelationshipsCount: relationshipIds.length,
        totalDeletedCount: mapIds.length + conceptIds.length + relationshipIds.length,
      }
    } else {
      console.log('No deleted entities found to permanently delete')
      return {
        deletedMapsCount: 0,
        deletedConceptsCount: 0,
        deletedRelationshipsCount: 0,
        totalDeletedCount: 0,
      }
    }
  }

  return {
    emptyTrash,
  }
}


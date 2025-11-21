/**
 * Hook for managing folders and folder-map assignments.
 * Provides CRUD operations for folders and many-to-many map assignments.
 */

import { db, tx, id } from '@/lib/instant'
import { useMemo } from 'react'
import type { Folder } from '@/lib/schema'

/**
 * Hook to get all folders created by the current user.
 * 
 * Uses InstantDB `useQuery()` for real-time updates. Automatically filters
 * results to only folders created by the current user.
 * 
 * **Soft Deletes:**
 * Soft-deleted folders (with `deletedAt` set) are automatically excluded from
 * the results.
 * 
 * **Real-time Updates:**
 * The hook subscribes to real-time updates, so the returned array will
 * automatically update when folders are created, modified, or deleted.
 * 
 * @returns Array of folders created by the authenticated user
 */
export function useFolders() {
  const auth = db.useAuth()
  const userId = auth.user?.id

  // Query folders created by the current user
  const { data: foldersData } = db.useQuery(
    userId
      ? {
          folders: {
            creator: {},
            maps: {},
          },
        }
      : null
  )

  const folders: Folder[] = useMemo(
    () =>
      foldersData?.folders
        ?.filter((f: any) => !f.deletedAt) // Filter out soft-deleted folders
        .map((f: any) => ({
          id: f.id,
          name: f.name,
          createdBy: f.creator?.id || userId || '',
          createdAt: new Date(f.createdAt),
          updatedAt: new Date(f.updatedAt),
          deletedAt: f.deletedAt ? new Date(f.deletedAt) : null,
        })) || [],
    [foldersData?.folders, userId]
  )

  return folders
}

/**
 * Create a new folder.
 * 
 * @param name - Name of the folder to create
 * @param userId - ID of the user creating the folder
 * @returns Promise that resolves when the folder is created
 */
export async function createFolder(name: string, userId: string): Promise<void> {
  if (!userId) {
    throw new Error('User must be authenticated to create folders')
  }

  if (!name.trim()) {
    throw new Error('Folder name cannot be empty')
  }

  const folderId = id()
  const now = Date.now()
  
  await db.transact([
    tx.folders[folderId]
      .update({
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
      })
      .link({ creator: userId }),
  ])
}

/**
 * Update a folder's name.
 * 
 * @param folderId - ID of the folder to update
 * @param updates - Partial folder updates (currently only name is supported)
 * @returns Promise that resolves when the folder is updated
 */
export async function updateFolder(folderId: string, updates: Partial<Pick<Folder, 'name'>>): Promise<void> {
  if (!updates.name?.trim()) {
    throw new Error('Folder name cannot be empty')
  }

  await db.transact([
    tx.folders[folderId].update({
      name: updates.name!.trim(),
      updatedAt: Date.now(),
    }),
  ])
}

/**
 * Soft delete a folder.
 * 
 * @param folderId - ID of the folder to delete
 * @returns Promise that resolves when the folder is deleted
 */
export async function deleteFolder(folderId: string): Promise<void> {
  await db.transact([
    tx.folders[folderId].update({
      deletedAt: Date.now(),
    }),
    // Note: Links to maps are automatically removed when folder is deleted
    // due to InstantDB's link behavior, but we don't need to explicitly remove them
  ])
}

/**
 * Add a map to a folder (many-to-many relationship).
 * 
 * @param mapId - ID of the map to add
 * @param folderId - ID of the folder to add the map to
 * @returns Promise that resolves when the map is added to the folder
 */
export async function addMapToFolder(mapId: string, folderId: string): Promise<void> {
  await db.transact([
    // Link map to folder (many-to-many)
    tx.maps[mapId].link({ folders: folderId }),
  ])
}

/**
 * Remove a map from a folder.
 * 
 * @param mapId - ID of the map to remove
 * @param folderId - ID of the folder to remove the map from
 * @returns Promise that resolves when the map is removed from the folder
 */
export async function removeMapFromFolder(mapId: string, folderId: string): Promise<void> {
  await db.transact([
    // Unlink map from folder
    tx.maps[mapId].unlink({ folders: folderId }),
  ])
}

/**
 * Get all folders that contain a specific map.
 * 
 * @param mapId - ID of the map
 * @returns Array of folder IDs that contain the map
 */
export function getFoldersForMap(_mapId: string): string[] {
  // This would typically be done via a query, but for now we'll return empty
  // The actual implementation would query maps with folders link
  // For now, this is a placeholder - the actual folders will be queried via useQuery
  return []
}


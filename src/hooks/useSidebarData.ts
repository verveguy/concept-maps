/**
 * Hook for managing sidebar data queries and computations.
 * Centralizes all data fetching and memoized computations for the sidebar.
 */

import { useMemo } from 'react'
import { db } from '@/lib/instant'
import { useMaps, categorizeMaps } from '@/hooks/useMaps'
import { useFolders } from '@/hooks/useFolders'

export function useSidebarData(userId: string | null) {
  const maps = useMaps()
  const folders = useFolders()
  
  // Query folders with their maps
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
  
  // Query shares to identify shared maps
  const { data: sharesData } = db.useQuery(
    userId
      ? {
          shares: {
            user: {},
            map: {},
          },
        }
      : null
  )
  
  // Get all perspectives for all maps (not filtered by currentMapId)
  const { data: perspectivesData } = db.useQuery({
    perspectives: {
      creator: {},
      map: {},
    },
  })
  
  // Memoize allPerspectives to avoid creating new array/object references on every render
  const allPerspectives = useMemo(() => {
    return (perspectivesData?.perspectives || []).map((p: any) => ({
      id: p.id,
      mapId: p.map?.id || '',
      name: p.name,
      conceptIds: p.conceptIds ? JSON.parse(p.conceptIds) : [],
      relationshipIds: p.relationshipIds ? JSON.parse(p.relationshipIds) : [],
      createdBy: p.creator?.id || '',
      createdAt: new Date(p.createdAt),
    }))
  }, [perspectivesData])
  
  // Get shared map IDs from shares
  const sharedMapIds = useMemo(() => {
    const ids = new Set<string>()
    if (sharesData?.shares) {
      for (const share of sharesData.shares) {
        if (share.map?.id && share.status === 'active') {
          ids.add(share.map.id)
        }
      }
    }
    return ids
  }, [sharesData])
  
  // Categorize maps into owned and shared
  const { ownedMaps, sharedMaps } = useMemo(() => {
    return categorizeMaps(maps, userId, sharedMapIds)
  }, [maps, userId, sharedMapIds])
  
  // Build map of folder ID to map IDs
  const folderMapIds = useMemo(() => {
    const map = new Map<string, Set<string>>()
    if (foldersData?.folders) {
      for (const folder of foldersData.folders) {
        if (!folder.deletedAt && folder.maps) {
          const mapIds = new Set<string>()
          for (const mapItem of folder.maps) {
            if (mapItem?.id) {
              mapIds.add(mapItem.id)
            }
          }
          map.set(folder.id, mapIds)
        }
      }
    }
    return map
  }, [foldersData])
  
  // Get all maps (owned + shared) for folder organization
  const allMapsForFolders = useMemo(() => {
    return [...ownedMaps, ...sharedMaps]
  }, [ownedMaps, sharedMaps])

  // Get maps organized by folder (includes both owned and shared maps)
  const mapsByFolder = useMemo(() => {
    const byFolder = new Map<string, typeof allMapsForFolders>()
    
    // Group maps by folder (both owned and shared)
    for (const folder of folders) {
      const folderMaps: typeof allMapsForFolders = []
      const mapIds = folderMapIds.get(folder.id) || new Set()
      for (const map of allMapsForFolders) {
        if (mapIds.has(map.id)) {
          folderMaps.push(map)
        }
      }
      if (folderMaps.length > 0) {
        byFolder.set(folder.id, folderMaps)
      }
    }
    
    return byFolder
  }, [folders, allMapsForFolders, folderMapIds])

  return {
    maps,
    folders,
    allPerspectives,
    ownedMaps,
    sharedMaps,
    folderMapIds,
    mapsByFolder,
  }
}


/**
 * Hook for checking map permissions.
 * Checks if the current user has read or write access to the current map.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { useMemo } from 'react'

/**
 * Hook to check if the current user has write access to the current map.
 * User has write access if:
 * - They are the map creator (owner)
 * - They are in the map's writePermissions link set
 * 
 * @returns Object containing hasWriteAccess and hasReadAccess flags
 */
export function useMapPermissions() {
  const auth = db.useAuth()
  const currentMapId = useMapStore((state) => state.currentMapId)
  const currentUserId = auth.user?.id

  // Query the current map with permission links
  const { data } = db.useQuery(
    currentMapId
      ? {
          maps: {
            $: { where: { id: currentMapId } },
            creator: {},
            writePermissions: {},
            readPermissions: {},
          },
        }
      : null
  )

  const map = data?.maps?.[0]

  // Check if user has write access
  const hasWriteAccess = useMemo(() => {
    if (!currentUserId || !map) return false
    
    // Check if user is the map creator
    const isOwner = map.creator?.id === currentUserId
    
    // Check if user is in writePermissions link set
    const hasWritePermission = map.writePermissions?.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false

    return isOwner || hasWritePermission
  }, [currentUserId, map])

  // Check if user has read access
  const hasReadAccess = useMemo(() => {
    if (!currentUserId || !map) return false
    
    // Owner always has read access
    if (map.creator?.id === currentUserId) return true
    
    // Check if user is in readPermissions or writePermissions link set
    const hasReadPermission = map.readPermissions?.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false
    
    const hasWritePermission = map.writePermissions?.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false

    return hasReadPermission || hasWritePermission
  }, [currentUserId, map])

  return {
    hasWriteAccess,
    hasReadAccess,
  }
}


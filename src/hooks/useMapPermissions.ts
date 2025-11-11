/**
 * Hook for checking map permissions.
 * Checks if the current user has read, write, or manage access to the current map.
 */

import { db } from '@/lib/instant'
import { useMapStore } from '@/stores/mapStore'
import { useMemo } from 'react'

/**
 * Hook to check if the current user has write or manage access to the current map.
 * 
 * Determines access permissions based on:
 * - Map ownership (user is the creator)
 * - Write permissions link set (user is explicitly granted write access)
 * - Manage permissions link set (user is explicitly granted manage access)
 * 
 * **Permission Hierarchy:**
 * 1. Owner (creator) always has full access (write + manage)
 * 2. Users in `managePermissions` link set have manage access (write + can manage shares)
 * 3. Users in `writePermissions` link set have write access
 * 4. Users in `readPermissions` link set have read-only access
 * 5. Other users have no access
 * 
 * **Read Access:**
 * The hook also provides `hasReadAccess` which checks if the user has either
 * read, write, or manage permissions (or is the owner).
 * 
 * **Manage Access:**
 * The hook provides `hasManageAccess` which checks if the user can manage shares
 * (create invitations, update permissions, revoke shares). Owners and users in
 * `managePermissions` link set have manage access.
 * 
 * **Real-time Updates:**
 * Uses InstantDB `useQuery()` to subscribe to permission changes. If permissions
 * are updated, the hook will automatically reflect the new access level.
 * 
 * @returns Object containing permission flags:
 * - `hasWriteAccess`: Whether user can modify the map
 * - `hasReadAccess`: Whether user can view the map
 * - `hasManageAccess`: Whether user can manage shares (invite others, update permissions, revoke shares)
 * 
 * @example
 * ```tsx
 * import { useMapPermissions } from '@/hooks/useMapPermissions'
 * 
 * function ConceptEditor() {
 *   const { hasWriteAccess, hasManageAccess } = useMapPermissions()
 *   
 *   return (
 *     <div>
 *       {hasWriteAccess ? (
 *         <EditableFields />
 *       ) : (
 *         <ReadOnlyFields />
 *       )}
 *       {hasManageAccess && <ShareButton />}
 *     </div>
 *   )
 * }
 * ```
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
            managePermissions: {},
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
    
    // Check if user is in writePermissions or managePermissions link set
    const writePerms = map.writePermissions || []
    const hasWritePermission = writePerms.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false

    const managePerms = map.managePermissions || []
    const hasManagePermission = managePerms.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false

    return isOwner || hasWritePermission || hasManagePermission
  }, [currentUserId, map])

  // Check if user has read access
  const hasReadAccess = useMemo(() => {
    if (!currentUserId || !map) return false
    
    // Owner always has read access
    if (map.creator?.id === currentUserId) return true
    
    // Check if user is in readPermissions, writePermissions, or managePermissions link set
    const hasReadPermission = map.readPermissions?.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false
    
    const hasWritePermission = map.writePermissions?.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false

    const hasManagePermission = map.managePermissions?.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false

    return hasReadPermission || hasWritePermission || hasManagePermission
  }, [currentUserId, map])

  // Check if user has manage access (can manage shares)
  const hasManageAccess = useMemo(() => {
    if (!currentUserId || !map) return false
    
    // Owner always has manage access
    if (map.creator?.id === currentUserId) return true
    
    // Check if user is in managePermissions link set
    const managePerms = map.managePermissions || []
    return managePerms.some(
      (user: { id: string }) => user.id === currentUserId
    ) || false
  }, [currentUserId, map])

  return {
    hasWriteAccess,
    hasReadAccess,
    hasManageAccess,
  }
}


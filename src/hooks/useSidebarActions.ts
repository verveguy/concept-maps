/**
 * Hook for managing sidebar action handlers.
 * Centralizes all action handlers for creating, deleting, selecting, and drag/drop operations.
 */

import { useCallback } from 'react'
import { useMapActions } from '@/hooks/useMapActions'
import { usePerspectiveActions } from '@/hooks/usePerspectiveActions'
import { createFolder, deleteFolder, addMapToFolder, removeMapFromFolder } from '@/hooks/useFolders'
import { useMapStore } from '@/stores/mapStore'
import { useUndoStore } from '@/stores/undoStore'
import type { CreateMapCommand, CreatePerspectiveCommand, DeletePerspectiveCommand } from '@/stores/undoStore'
import { navigateToMap } from '@/utils/navigation'

interface UseSidebarActionsProps {
  userId: string | null
  folderMapIds: Map<string, Set<string>>
  setNewlyCreatedMapId: (id: string | null) => void
  setNewlyCreatedPerspectiveId: (id: string | null) => void
  setCurrentMapId: (id: string | null) => void
  setCurrentPerspectiveId: (id: string | null) => void
  setIsCreatingMap: (isCreating: boolean) => void
  setIsCreatingFolder: (isCreating: boolean) => void
  setNewFolderName: (name: string) => void
  setMapToDelete: (map: { id: string; name: string } | null) => void
  setPerspectiveToDelete: (perspective: { id: string; name: string; mapId: string } | null) => void
  setFolderToDelete: (folder: { id: string; name: string } | null) => void
  setDraggedMapId: (id: string | null) => void
  setDragOverFolderId: (id: string | null) => void
}

export function useSidebarActions({
  userId,
  folderMapIds,
  setNewlyCreatedMapId,
  setNewlyCreatedPerspectiveId,
  setCurrentMapId,
  setCurrentPerspectiveId,
  setIsCreatingMap,
  setIsCreatingFolder,
  setNewFolderName,
  setMapToDelete,
  setPerspectiveToDelete,
  setFolderToDelete,
  setDraggedMapId,
  setDragOverFolderId,
}: UseSidebarActionsProps) {
  const { createMap, deleteMap } = useMapActions()
  const { createPerspective, deletePerspective } = usePerspectiveActions()
  const { recordMutation, startOperation, endOperation } = useUndoStore()
  const { currentMapId, currentPerspectiveId } = useMapStore()

  /**
   * Handle creating a new map.
   */
  const handleCreateMap = useCallback(async () => {
    setIsCreatingMap(true)
    try {
      startOperation()
      
      const newMap = await createMap('Untitled')
      if (newMap?.id) {
        const command: CreateMapCommand = {
          type: 'createMap',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          mapId: newMap.id,
          name: 'Untitled',
        }
        recordMutation(command)
        
        setNewlyCreatedMapId(newMap.id)
        setCurrentPerspectiveId(null)
        navigateToMap(newMap.id)
      }
      
      endOperation()
    } catch (error) {
      console.error('Failed to create map:', error)
      alert('Failed to create map. Please try again.')
      endOperation()
    } finally {
      setIsCreatingMap(false)
    }
  }, [createMap, setNewlyCreatedMapId, setCurrentPerspectiveId, setIsCreatingMap])

  /**
   * Handle creating a new perspective.
   */
  const handleCreatePerspective = useCallback(async (mapId: string) => {
    try {
      startOperation()
      
      const newPerspective = await createPerspective({
        mapId,
        name: 'Untitled',
        conceptIds: [],
        relationshipIds: [],
      })
      
      if (newPerspective?.id) {
        const command: CreatePerspectiveCommand = {
          type: 'createPerspective',
          id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
          perspectiveId: newPerspective.id,
          mapId,
          name: 'Untitled',
          conceptIds: [],
          relationshipIds: [],
        }
        recordMutation(command)
        
        setNewlyCreatedPerspectiveId(newPerspective.id)
        setCurrentPerspectiveId(newPerspective.id)
        navigateToMap(mapId)
      }
      
      endOperation()
    } catch (error) {
      console.error('Failed to create perspective:', error)
      alert('Failed to create perspective. Please try again.')
      endOperation()
    }
  }, [createPerspective, setNewlyCreatedPerspectiveId, setCurrentPerspectiveId])

  /**
   * Handle creating a new folder.
   */
  const handleCreateFolder = useCallback(async (e: React.FormEvent, folderName: string) => {
    e.preventDefault()
    if (!folderName.trim() || !userId) return
    
    setIsCreatingFolder(true)
    try {
      await createFolder(folderName.trim(), userId)
      setNewFolderName('')
      setIsCreatingFolder(false)
    } catch (error) {
      console.error('Failed to create folder:', error)
      alert('Failed to create folder. Please try again.')
      setIsCreatingFolder(false)
    }
  }, [userId, setIsCreatingFolder, setNewFolderName])

  /**
   * Handle canceling folder creation.
   */
  const handleCancelCreateFolder = useCallback(() => {
    setIsCreatingFolder(false)
    setNewFolderName('')
  }, [setIsCreatingFolder, setNewFolderName])

  /**
   * Handle deleting a folder.
   */
  const handleDeleteFolder = useCallback(async (folderId: string) => {
    try {
      await deleteFolder(folderId)
      setFolderToDelete(null)
    } catch (error) {
      console.error('Failed to delete folder:', error)
      alert('Failed to delete folder. Please try again.')
      setFolderToDelete(null)
    }
  }, [deleteFolder, setFolderToDelete])

  /**
   * Handle selecting a map.
   */
  const handleSelectMap = useCallback((mapId: string) => {
    navigateToMap(mapId)
    setCurrentPerspectiveId(null)
  }, [setCurrentPerspectiveId])

  /**
   * Handle selecting a perspective.
   */
  const handleSelectPerspective = useCallback((perspectiveId: string, mapId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigateToMap(mapId)
    setCurrentPerspectiveId(perspectiveId)
  }, [setCurrentPerspectiveId])

  /**
   * Handle map deletion click - opens confirmation dialog.
   */
  const handleDeleteMapClick = useCallback((mapId: string, mapName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setMapToDelete({ id: mapId, name: mapName })
  }, [setMapToDelete])

  /**
   * Handle map deletion after confirmation.
   */
  const handleConfirmDeleteMap = useCallback(async (mapId: string) => {
    try {
      await deleteMap(mapId)
      if (currentMapId === mapId) {
        setCurrentMapId(null)
        setCurrentPerspectiveId(null)
      }
      setMapToDelete(null)
    } catch (error) {
      console.error('Failed to delete map:', error)
      alert('Failed to delete map. Please try again.')
      setMapToDelete(null)
    }
  }, [deleteMap, currentMapId, setCurrentMapId, setCurrentPerspectiveId, setMapToDelete])

  /**
   * Handle perspective deletion click - opens confirmation dialog.
   */
  const handleDeletePerspectiveClick = useCallback((perspectiveId: string, perspectiveName: string, mapId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPerspectiveToDelete({ id: perspectiveId, name: perspectiveName, mapId })
  }, [setPerspectiveToDelete])

  /**
   * Handle perspective deletion after confirmation.
   */
  const handleConfirmDeletePerspective = useCallback(async (perspectiveId: string) => {
    try {
      startOperation()
      
      await deletePerspective(perspectiveId)
      
      const command: DeletePerspectiveCommand = {
        type: 'deletePerspective',
        id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        operationId: useUndoStore.getState().currentOperationId || `op_${Date.now()}`,
        perspectiveId,
      }
      recordMutation(command)
      
      if (currentPerspectiveId === perspectiveId) {
        setCurrentPerspectiveId(null)
      }
      
      endOperation()
      setPerspectiveToDelete(null)
    } catch (error) {
      console.error('Failed to delete perspective:', error)
      alert('Failed to delete perspective. Please try again.')
      endOperation()
      setPerspectiveToDelete(null)
    }
  }, [deletePerspective, currentPerspectiveId, setCurrentPerspectiveId, setPerspectiveToDelete])

  /**
   * Handle dropping a map into a folder.
   */
  const handleDropMap = useCallback(async (mapId: string, targetFolderId: string | null) => {
    if (!userId) return
    
    try {
      // Get current folders for this map
      const currentFolders = Array.from(folderMapIds.entries())
        .filter(([_, mapIds]) => mapIds.has(mapId))
        .map(([folderId]) => folderId)
      
      // Remove from all current folders
      for (const folderId of currentFolders) {
        await removeMapFromFolder(mapId, folderId)
      }
      
      // Add to target folder if specified (null means "Uncategorized")
      if (targetFolderId) {
        await addMapToFolder(mapId, targetFolderId)
      }
    } catch (error) {
      console.error('Failed to move map:', error)
      alert('Failed to move map. Please try again.')
    }
  }, [userId, folderMapIds])

  /**
   * Handle drag start for map entries.
   */
  const handleDragStart = useCallback((e: React.DragEvent, mapId: string) => {
    setDraggedMapId(mapId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', mapId)
  }, [setDraggedMapId])

  /**
   * Handle drag end for map entries.
   */
  const handleDragEnd = useCallback(() => {
    setDraggedMapId(null)
    setDragOverFolderId(null)
  }, [setDraggedMapId, setDragOverFolderId])

  return {
    handleCreateMap,
    handleCreatePerspective,
    handleCreateFolder,
    handleCancelCreateFolder,
    handleDeleteFolder,
    handleSelectMap,
    handleSelectPerspective,
    handleDeleteMapClick,
    handleConfirmDeleteMap,
    handleDeletePerspectiveClick,
    handleConfirmDeletePerspective,
    handleDropMap,
    handleDragStart,
    handleDragEnd,
  }
}


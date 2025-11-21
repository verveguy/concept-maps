/**
 * Hook for managing sidebar UI state.
 * Centralizes all state management for expansion, deletion dialogs, and folder creation.
 */

import { useState } from 'react'

export function useSidebarState() {
  // Track expansion state per section: 'folders', 'myMaps', 'shared'
  const [expandedMaps, setExpandedMaps] = useState<Map<string, Set<string>>>(new Map([
    ['folders', new Set()],
    ['myMaps', new Set()],
    ['shared', new Set()],
  ]))
  
  const [expandedSections, setExpandedSections] = useState<Set<'folders' | 'myMaps' | 'shared'>>(
    new Set(['folders', 'myMaps', 'shared'])
  )
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  
  // Deletion dialog states
  const [mapToDelete, setMapToDelete] = useState<{ id: string; name: string } | null>(null)
  const [perspectiveToDelete, setPerspectiveToDelete] = useState<{ id: string; name: string; mapId: string } | null>(null)
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null)
  
  // Folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  
  // Map creation state
  const [isCreatingMap, setIsCreatingMap] = useState(false)
  
  // Drag and drop state
  const [draggedMapId, setDraggedMapId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)

  return {
    // Expansion state
    expandedMaps,
    setExpandedMaps,
    expandedSections,
    setExpandedSections,
    expandedFolders,
    setExpandedFolders,
    
    // Deletion dialog states
    mapToDelete,
    setMapToDelete,
    perspectiveToDelete,
    setPerspectiveToDelete,
    folderToDelete,
    setFolderToDelete,
    
    // Creation states
    isCreatingFolder,
    setIsCreatingFolder,
    newFolderName,
    setNewFolderName,
    isCreatingMap,
    setIsCreatingMap,
    
    // Drag and drop state
    draggedMapId,
    setDraggedMapId,
    dragOverFolderId,
    setDragOverFolderId,
  }
}


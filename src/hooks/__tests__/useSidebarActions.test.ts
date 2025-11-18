/**
 * Tests for useSidebarActions hook.
 * Verifies action handlers for creating, deleting, selecting, and drag/drop operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSidebarActions } from '../useSidebarActions'
import { useMapActions } from '../useMapActions'
import { usePerspectiveActions } from '../usePerspectiveActions'
import { createFolder, deleteFolder, addMapToFolder, removeMapFromFolder } from '../useFolders'
import { useMapStore } from '@/stores/mapStore'
import { useUndoStore } from '@/stores/undoStore'
import { navigateToMap } from '@/utils/navigation'

// We need to mock the store before importing it
vi.mock('@/stores/undoStore', async () => {
  const actual = await vi.importActual('@/stores/undoStore')
  // Create mock getState function inside the factory
  const mockGetState = vi.fn(() => ({
    currentOperationId: 'op-123',
  }))
  // Create a mock function that also has getState property
  const mockStoreFn = vi.fn()
  // Add getState as a property on the function itself (Zustand pattern)
  Object.defineProperty(mockStoreFn, 'getState', {
    value: mockGetState,
    writable: true,
    configurable: true,
  })
  return {
    ...actual,
    useUndoStore: mockStoreFn,
  }
})

// Mock dependencies
vi.mock('../useMapActions')
vi.mock('../usePerspectiveActions')
vi.mock('../useFolders')
vi.mock('@/stores/mapStore')
// Note: @/stores/undoStore is already mocked above with getState
vi.mock('@/utils/navigation')

const mockUseMapActions = vi.mocked(useMapActions)
const mockUsePerspectiveActions = vi.mocked(usePerspectiveActions)
  const mockUseMapStore = vi.mocked(useMapStore)
  const mockUseUndoStore = vi.mocked(useUndoStore)
  const mockCreateFolder = vi.mocked(createFolder)
  const mockDeleteFolder = vi.mocked(deleteFolder)
  const mockAddMapToFolder = vi.mocked(addMapToFolder)
  const mockRemoveMapFromFolder = vi.mocked(removeMapFromFolder)
  const mockNavigateToMap = vi.mocked(navigateToMap)

describe('useSidebarActions', () => {
  const mockUserId = 'user-1'
  const mockSetNewlyCreatedMapId = vi.fn()
  const mockSetNewlyCreatedPerspectiveId = vi.fn()
  const mockSetCurrentMapId = vi.fn()
  const mockSetCurrentPerspectiveId = vi.fn()
  const mockSetIsCreatingMap = vi.fn()
  const mockSetIsCreatingFolder = vi.fn()
  const mockSetNewFolderName = vi.fn()
  const mockSetMapToDelete = vi.fn()
  const mockSetPerspectiveToDelete = vi.fn()
  const mockSetFolderToDelete = vi.fn()
  const mockSetDraggedMapId = vi.fn()
  const mockSetDragOverFolderId = vi.fn()

  const mockCreateMap = vi.fn()
  const mockDeleteMap = vi.fn()
  const mockCreatePerspective = vi.fn()
  const mockDeletePerspective = vi.fn()
  const mockRecordMutation = vi.fn()
  const mockStartOperation = vi.fn()
  const mockEndOperation = vi.fn()

  const defaultProps = {
    userId: mockUserId,
    folderMapIds: new Map<string, Set<string>>(),
    setNewlyCreatedMapId: mockSetNewlyCreatedMapId,
    setNewlyCreatedPerspectiveId: mockSetNewlyCreatedPerspectiveId,
    setCurrentMapId: mockSetCurrentMapId,
    setCurrentPerspectiveId: mockSetCurrentPerspectiveId,
    setIsCreatingMap: mockSetIsCreatingMap,
    setIsCreatingFolder: mockSetIsCreatingFolder,
    setNewFolderName: mockSetNewFolderName,
    setMapToDelete: mockSetMapToDelete,
    setPerspectiveToDelete: mockSetPerspectiveToDelete,
    setFolderToDelete: mockSetFolderToDelete,
    setDraggedMapId: mockSetDraggedMapId,
    setDragOverFolderId: mockSetDragOverFolderId,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseMapActions.mockReturnValue({
      createMap: mockCreateMap,
      deleteMap: mockDeleteMap,
      updateMap: vi.fn(),
    } as any)

    mockUsePerspectiveActions.mockReturnValue({
      createPerspective: mockCreatePerspective,
      deletePerspective: mockDeletePerspective,
      updatePerspective: vi.fn(),
      toggleConceptInPerspective: vi.fn(),
      toggleRelationshipInPerspective: vi.fn(),
    } as any)

    mockUseMapStore.mockReturnValue({
      currentMapId: 'map-1',
      currentPerspectiveId: 'perspective-1',
    } as any)

    mockUseUndoStore.mockReturnValue({
      recordMutation: mockRecordMutation,
      startOperation: mockStartOperation,
      endOperation: mockEndOperation,
      currentOperationId: 'op-123',
    } as any)

    mockCreateMap.mockResolvedValue({ id: 'new-map-1' })
    mockCreatePerspective.mockResolvedValue({ id: 'new-perspective-1' })
    mockDeleteMap.mockResolvedValue(undefined)
    mockDeletePerspective.mockResolvedValue(undefined)
    mockCreateFolder.mockResolvedValue(undefined)
    mockDeleteFolder.mockResolvedValue(undefined)
    mockAddMapToFolder.mockResolvedValue(undefined)
    mockRemoveMapFromFolder.mockResolvedValue(undefined)
  })

  describe('handleCreateMap', () => {
    it('should create a map and navigate to it', async () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))

      await result.current.handleCreateMap()

      expect(mockStartOperation).toHaveBeenCalled()
      expect(mockCreateMap).toHaveBeenCalledWith('Untitled')
      expect(mockRecordMutation).toHaveBeenCalled()
      expect(mockSetNewlyCreatedMapId).toHaveBeenCalledWith('new-map-1')
      expect(mockSetCurrentPerspectiveId).toHaveBeenCalledWith(null)
      expect(mockNavigateToMap).toHaveBeenCalledWith('new-map-1')
      expect(mockEndOperation).toHaveBeenCalled()
      expect(mockSetIsCreatingMap).toHaveBeenCalledWith(false)
    })

    it('should handle errors gracefully', async () => {
      mockCreateMap.mockRejectedValueOnce(new Error('Failed to create'))

      const { result } = renderHook(() => useSidebarActions(defaultProps))

      await result.current.handleCreateMap()

      expect(mockEndOperation).toHaveBeenCalled()
      expect(mockSetIsCreatingMap).toHaveBeenCalledWith(false)
    })
  })

  describe('handleCreatePerspective', () => {
    it('should create a perspective and navigate to map', async () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))

      await result.current.handleCreatePerspective('map-1')

      expect(mockStartOperation).toHaveBeenCalled()
      expect(mockCreatePerspective).toHaveBeenCalledWith({
        mapId: 'map-1',
        name: 'Untitled',
        conceptIds: [],
        relationshipIds: [],
      })
      expect(mockRecordMutation).toHaveBeenCalled()
      expect(mockSetNewlyCreatedPerspectiveId).toHaveBeenCalledWith('new-perspective-1')
      expect(mockSetCurrentPerspectiveId).toHaveBeenCalledWith('new-perspective-1')
      expect(mockNavigateToMap).toHaveBeenCalledWith('map-1')
      expect(mockEndOperation).toHaveBeenCalled()
    })
  })

  describe('handleCreateFolder', () => {
    it('should create a folder', async () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))
      const mockEvent = {
        preventDefault: vi.fn(),
      } as any

      await result.current.handleCreateFolder(mockEvent, 'New Folder')

      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockCreateFolder).toHaveBeenCalledWith('New Folder', mockUserId)
      expect(mockSetNewFolderName).toHaveBeenCalledWith('')
      expect(mockSetIsCreatingFolder).toHaveBeenCalledWith(false)
    })

    it('should not create folder if name is empty', async () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))
      const mockEvent = {
        preventDefault: vi.fn(),
      } as any

      await result.current.handleCreateFolder(mockEvent, '   ')

      expect(mockCreateFolder).not.toHaveBeenCalled()
    })
  })

  describe('handleDeleteFolder', () => {
    it('should delete a folder', async () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))

      await result.current.handleDeleteFolder('folder-1')

      expect(mockDeleteFolder).toHaveBeenCalledWith('folder-1')
      expect(mockSetFolderToDelete).toHaveBeenCalledWith(null)
    })
  })

  describe('handleSelectMap', () => {
    it('should navigate to map and clear perspective', () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))

      result.current.handleSelectMap('map-1')

      expect(mockNavigateToMap).toHaveBeenCalledWith('map-1')
      expect(mockSetCurrentPerspectiveId).toHaveBeenCalledWith(null)
    })
  })

  describe('handleSelectPerspective', () => {
    it('should navigate to map and set perspective', () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))
      const mockEvent = {
        stopPropagation: vi.fn(),
      } as any

      result.current.handleSelectPerspective('perspective-1', 'map-1', mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(mockNavigateToMap).toHaveBeenCalledWith('map-1')
      expect(mockSetCurrentPerspectiveId).toHaveBeenCalledWith('perspective-1')
    })
  })

  describe('handleDeleteMapClick', () => {
    it('should set map to delete', () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))
      const mockEvent = {
        stopPropagation: vi.fn(),
      } as any

      result.current.handleDeleteMapClick('map-1', 'Map 1', mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(mockSetMapToDelete).toHaveBeenCalledWith({
        id: 'map-1',
        name: 'Map 1',
      })
    })
  })

  describe('handleConfirmDeleteMap', () => {
    it('should delete map and clear selection if current', async () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))

      await result.current.handleConfirmDeleteMap('map-1')

      expect(mockDeleteMap).toHaveBeenCalledWith('map-1')
      expect(mockSetCurrentMapId).toHaveBeenCalledWith(null)
      expect(mockSetCurrentPerspectiveId).toHaveBeenCalledWith(null)
      expect(mockSetMapToDelete).toHaveBeenCalledWith(null)
    })
  })

  describe('handleDeletePerspectiveClick', () => {
    it('should set perspective to delete', () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))
      const mockEvent = {
        stopPropagation: vi.fn(),
      } as any

      result.current.handleDeletePerspectiveClick(
        'perspective-1',
        'Perspective 1',
        'map-1',
        mockEvent
      )

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(mockSetPerspectiveToDelete).toHaveBeenCalledWith({
        id: 'perspective-1',
        name: 'Perspective 1',
        mapId: 'map-1',
      })
    })
  })

  describe('handleConfirmDeletePerspective', () => {
    it('should delete perspective and clear selection if current', async () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))

      await result.current.handleConfirmDeletePerspective('perspective-1')

      expect(mockStartOperation).toHaveBeenCalled()
      expect(mockDeletePerspective).toHaveBeenCalledWith('perspective-1')
      expect(mockRecordMutation).toHaveBeenCalled()
      expect(mockSetCurrentPerspectiveId).toHaveBeenCalledWith(null)
      expect(mockEndOperation).toHaveBeenCalled()
      expect(mockSetPerspectiveToDelete).toHaveBeenCalledWith(null)
    })
  })

  describe('handleDropMap', () => {
    it('should move map to folder', async () => {
      const folderMapIds = new Map<string, Set<string>>()
      folderMapIds.set('folder-1', new Set(['map-1']))

      const { result } = renderHook(() =>
        useSidebarActions({
          ...defaultProps,
          folderMapIds,
        })
      )

      await result.current.handleDropMap('map-1', 'folder-2')

      expect(mockRemoveMapFromFolder).toHaveBeenCalledWith('map-1', 'folder-1')
      expect(mockAddMapToFolder).toHaveBeenCalledWith('map-1', 'folder-2')
    })

    it('should remove from all folders if target is null', async () => {
      const folderMapIds = new Map<string, Set<string>>()
      folderMapIds.set('folder-1', new Set(['map-1']))
      folderMapIds.set('folder-2', new Set(['map-1']))

      const { result } = renderHook(() =>
        useSidebarActions({
          ...defaultProps,
          folderMapIds,
        })
      )

      await result.current.handleDropMap('map-1', null)

      expect(mockRemoveMapFromFolder).toHaveBeenCalledTimes(2)
      expect(mockAddMapToFolder).not.toHaveBeenCalled()
    })
  })

  describe('handleDragStart', () => {
    it('should set dragged map ID and data transfer', () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))
      const mockEvent = {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
        },
      } as any

      result.current.handleDragStart(mockEvent, 'map-1')

      expect(mockSetDraggedMapId).toHaveBeenCalledWith('map-1')
      expect(mockEvent.dataTransfer.effectAllowed).toBe('move')
      expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'map-1')
    })
  })

  describe('handleDragEnd', () => {
    it('should clear drag state', () => {
      const { result } = renderHook(() => useSidebarActions(defaultProps))

      result.current.handleDragEnd()

      expect(mockSetDraggedMapId).toHaveBeenCalledWith(null)
      expect(mockSetDragOverFolderId).toHaveBeenCalledWith(null)
    })
  })
})


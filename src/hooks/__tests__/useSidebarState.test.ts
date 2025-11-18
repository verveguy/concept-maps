/**
 * Tests for useSidebarState hook.
 * Verifies state management for expansion, deletion dialogs, and creation states.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSidebarState } from '../useSidebarState'

describe('useSidebarState', () => {
  beforeEach(() => {
    // Reset any state between tests
  })

  it('should initialize with default expansion states', () => {
    const { result } = renderHook(() => useSidebarState())

    expect(result.current.expandedSections.has('folders')).toBe(true)
    expect(result.current.expandedSections.has('myMaps')).toBe(true)
    expect(result.current.expandedSections.has('shared')).toBe(true)
    expect(result.current.expandedMaps.get('folders')).toEqual(new Set())
    expect(result.current.expandedMaps.get('myMaps')).toEqual(new Set())
    expect(result.current.expandedMaps.get('shared')).toEqual(new Set())
    expect(result.current.expandedFolders.size).toBe(0)
  })

  it('should initialize deletion dialog states as null', () => {
    const { result } = renderHook(() => useSidebarState())

    expect(result.current.mapToDelete).toBeNull()
    expect(result.current.perspectiveToDelete).toBeNull()
    expect(result.current.folderToDelete).toBeNull()
  })

  it('should initialize creation states correctly', () => {
    const { result } = renderHook(() => useSidebarState())

    expect(result.current.isCreatingFolder).toBe(false)
    expect(result.current.isCreatingMap).toBe(false)
    expect(result.current.newFolderName).toBe('')
  })

  it('should initialize drag and drop state as null', () => {
    const { result } = renderHook(() => useSidebarState())

    expect(result.current.draggedMapId).toBeNull()
    expect(result.current.dragOverFolderId).toBeNull()
  })

  it('should update expanded sections', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setExpandedSections((prev) => {
        const newSet = new Set(prev)
        newSet.delete('folders')
        return newSet
      })
    })

    expect(result.current.expandedSections.has('folders')).toBe(false)
    expect(result.current.expandedSections.has('myMaps')).toBe(true)
  })

  it('should update expanded folders', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setExpandedFolders((prev) => {
        const newSet = new Set(prev)
        newSet.add('folder-1')
        return newSet
      })
    })

    expect(result.current.expandedFolders.has('folder-1')).toBe(true)
  })

  it('should update expanded maps', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setExpandedMaps((prev) => {
        const newMap = new Map(prev)
        const sectionSet = new Set(newMap.get('myMaps') || [])
        sectionSet.add('map-1')
        newMap.set('myMaps', sectionSet)
        return newMap
      })
    })

    expect(result.current.expandedMaps.get('myMaps')?.has('map-1')).toBe(true)
  })

  it('should update mapToDelete', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setMapToDelete({ id: 'map-1', name: 'Map 1' })
    })

    expect(result.current.mapToDelete).toEqual({ id: 'map-1', name: 'Map 1' })
  })

  it('should update perspectiveToDelete', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setPerspectiveToDelete({
        id: 'perspective-1',
        name: 'Perspective 1',
        mapId: 'map-1',
      })
    })

    expect(result.current.perspectiveToDelete).toEqual({
      id: 'perspective-1',
      name: 'Perspective 1',
      mapId: 'map-1',
    })
  })

  it('should update folderToDelete', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setFolderToDelete({ id: 'folder-1', name: 'Folder 1' })
    })

    expect(result.current.folderToDelete).toEqual({
      id: 'folder-1',
      name: 'Folder 1',
    })
  })

  it('should update creation states', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setIsCreatingFolder(true)
      result.current.setIsCreatingMap(true)
      result.current.setNewFolderName('New Folder')
    })

    expect(result.current.isCreatingFolder).toBe(true)
    expect(result.current.isCreatingMap).toBe(true)
    expect(result.current.newFolderName).toBe('New Folder')
  })

  it('should update drag and drop state', () => {
    const { result } = renderHook(() => useSidebarState())

    act(() => {
      result.current.setDraggedMapId('map-1')
      result.current.setDragOverFolderId('folder-1')
    })

    expect(result.current.draggedMapId).toBe('map-1')
    expect(result.current.dragOverFolderId).toBe('folder-1')
  })
})


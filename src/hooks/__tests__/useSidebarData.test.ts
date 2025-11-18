/**
 * Tests for useSidebarData hook.
 * Verifies data queries, memoized computations, and map categorization.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSidebarData } from '../useSidebarData'
import { db } from '@/lib/instant'
import { useMaps, categorizeMaps } from '../useMaps'
import { useFolders } from '../useFolders'

// Mock dependencies
vi.mock('../useMaps', () => ({
  useMaps: vi.fn(),
  categorizeMaps: vi.fn((maps, userId, sharedMapIds) => {
    const ownedMaps = maps.filter((m: any) => m.createdBy === userId)
    const sharedMaps = maps.filter((m: any) => sharedMapIds.has(m.id))
    return { ownedMaps, sharedMaps }
  }),
}))

vi.mock('../useFolders', () => ({
  useFolders: vi.fn(),
}))

const mockUseQuery = vi.mocked(db.useQuery)
const mockUseMaps = vi.mocked(useMaps)
const mockUseFolders = vi.mocked(useFolders)

describe('useSidebarData', () => {
  const mockUserId = 'user-1'
  const mockMap1 = {
    id: 'map-1',
    name: 'Map 1',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  }
  const mockMap2 = {
    id: 'map-2',
    name: 'Map 2',
    createdBy: 'user-2',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    deletedAt: null,
  }
  const mockFolder1 = {
    id: 'folder-1',
    name: 'Folder 1',
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMaps.mockReturnValue([mockMap1, mockMap2])
    mockUseFolders.mockReturnValue([mockFolder1])
  })

  it('should return maps and folders', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: null } as any) // foldersData
      .mockReturnValueOnce({ data: null } as any) // sharesData
      .mockReturnValueOnce({ data: null } as any) // perspectivesData

    const { result } = renderHook(() => useSidebarData(mockUserId))

    expect(result.current.maps).toEqual([mockMap1, mockMap2])
    expect(result.current.folders).toEqual([mockFolder1])
  })

  it('should categorize maps into owned and shared', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: null } as any) // foldersData
      .mockReturnValueOnce({
        data: {
          shares: [
            { map: { id: 'map-2' }, status: 'active' },
          ],
        },
      } as any) // sharesData
      .mockReturnValueOnce({ data: null } as any) // perspectivesData

    const { result } = renderHook(() => useSidebarData(mockUserId))

    expect(result.current.ownedMaps).toEqual([mockMap1])
    expect(result.current.sharedMaps).toEqual([mockMap2])
  })

  it('should build folderMapIds correctly', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          folders: [
            {
              id: 'folder-1',
              deletedAt: null,
              maps: [{ id: 'map-1' }, { id: 'map-2' }],
            },
          ],
        },
      } as any) // foldersData
      .mockReturnValueOnce({ data: null } as any) // sharesData
      .mockReturnValueOnce({ data: null } as any) // perspectivesData

    const { result } = renderHook(() => useSidebarData(mockUserId))

    const folderMapIds = result.current.folderMapIds
    expect(folderMapIds.get('folder-1')).toEqual(new Set(['map-1', 'map-2']))
  })

  it('should organize maps by folder', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          folders: [
            {
              id: 'folder-1',
              deletedAt: null,
              maps: [{ id: 'map-1' }],
            },
          ],
        },
      } as any) // foldersData
      .mockReturnValueOnce({ data: null } as any) // sharesData
      .mockReturnValueOnce({ data: null } as any) // perspectivesData

    const { result } = renderHook(() => useSidebarData(mockUserId))

    const mapsByFolder = result.current.mapsByFolder
    const folderMaps = mapsByFolder.get('folder-1')
    expect(folderMaps).toBeDefined()
    expect(folderMaps?.length).toBe(1)
    expect(folderMaps?.[0].id).toBe('map-1')
  })

  it('should transform perspectives correctly', () => {
    const mockPerspective = {
      id: 'perspective-1',
      map: { id: 'map-1' },
      name: 'Perspective 1',
      conceptIds: JSON.stringify(['concept-1']),
      relationshipIds: JSON.stringify(['rel-1']),
      creator: { id: 'user-1' },
      createdAt: Date.now(),
    }

    mockUseQuery
      .mockReturnValueOnce({ data: null } as any) // foldersData
      .mockReturnValueOnce({ data: null } as any) // sharesData
      .mockReturnValueOnce({
        data: {
          perspectives: [mockPerspective],
        },
      } as any) // perspectivesData

    const { result } = renderHook(() => useSidebarData(mockUserId))

    expect(result.current.allPerspectives).toHaveLength(1)
    expect(result.current.allPerspectives[0]).toMatchObject({
      id: 'perspective-1',
      mapId: 'map-1',
      name: 'Perspective 1',
      conceptIds: ['concept-1'],
      relationshipIds: ['rel-1'],
      createdBy: 'user-1',
    })
  })

  it('should handle null userId', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: null } as any) // foldersData (should be null)
      .mockReturnValueOnce({ data: null } as any) // sharesData (should be null)
      .mockReturnValueOnce({ data: null } as any) // perspectivesData

    const { result } = renderHook(() => useSidebarData(null))

    expect(result.current.maps).toEqual([mockMap1, mockMap2])
    expect(result.current.ownedMaps).toEqual([])
    expect(result.current.sharedMaps).toEqual([])
  })

  it('should exclude soft-deleted folders from folderMapIds', () => {
    mockUseQuery
      .mockReturnValueOnce({
        data: {
          folders: [
            {
              id: 'folder-1',
              deletedAt: Date.now(),
              maps: [{ id: 'map-1' }],
            },
            {
              id: 'folder-2',
              deletedAt: null,
              maps: [{ id: 'map-2' }],
            },
          ],
        },
      } as any) // foldersData
      .mockReturnValueOnce({ data: null } as any) // sharesData
      .mockReturnValueOnce({ data: null } as any) // perspectivesData

    const { result } = renderHook(() => useSidebarData(mockUserId))

    const folderMapIds = result.current.folderMapIds
    expect(folderMapIds.has('folder-1')).toBe(false)
    expect(folderMapIds.has('folder-2')).toBe(true)
  })

  it('should handle empty data gracefully', () => {
    mockUseMaps.mockReturnValue([])
    mockUseFolders.mockReturnValue([])
    mockUseQuery
      .mockReturnValueOnce({ data: null } as any)
      .mockReturnValueOnce({ data: null } as any)
      .mockReturnValueOnce({ data: null } as any)

    const { result } = renderHook(() => useSidebarData(mockUserId))

    expect(result.current.maps).toEqual([])
    expect(result.current.folders).toEqual([])
    expect(result.current.allPerspectives).toEqual([])
    expect(result.current.ownedMaps).toEqual([])
    expect(result.current.sharedMaps).toEqual([])
    expect(result.current.mapsByFolder.size).toBe(0)
  })
})


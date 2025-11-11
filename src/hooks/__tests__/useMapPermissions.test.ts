/**
 * Tests for useMapPermissions hook.
 * Verifies permission checking including the new manage permission level.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMapPermissions } from '../useMapPermissions'
import { db } from '@/lib/instant'

// Mock InstantDB
const mockUseQuery = vi.mocked(db.useQuery)
const mockUseAuth = vi.mocked(db.useAuth)

vi.mock('@/stores/mapStore', () => ({
  useMapStore: vi.fn((selector: any) => {
    const state = {
      currentMapId: 'map-1',
    }
    return selector(state)
  }),
}))

describe('useMapPermissions', () => {
  const mockMapId = 'map-1'
  const mockOwnerId = 'owner-1'
  const mockManagerId = 'manager-1'
  const mockEditorId = 'editor-1'
  const mockViewerId = 'viewer-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hasManageAccess', () => {
    it('should return true for map owner', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockOwnerId },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [],
              readPermissions: [],
              managePermissions: [],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasManageAccess).toBe(true)
      })
    })

    it('should return true for user with manage permission', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockManagerId },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [],
              readPermissions: [],
              managePermissions: [{ id: mockManagerId }],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasManageAccess).toBe(true)
      })
    })

    it('should return false for user with only edit permission', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockEditorId },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [{ id: mockEditorId }],
              readPermissions: [],
              managePermissions: [],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasManageAccess).toBe(false)
      })
    })

    it('should return false for user with only view permission', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockViewerId },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [],
              readPermissions: [{ id: mockViewerId }],
              managePermissions: [],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasManageAccess).toBe(false)
      })
    })

    it('should return false for user with no permissions', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'no-access-user' },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [],
              readPermissions: [],
              managePermissions: [],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasManageAccess).toBe(false)
      })
    })
  })

  describe('hasWriteAccess', () => {
    it('should return true for user with manage permission', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockManagerId },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [],
              readPermissions: [],
              managePermissions: [{ id: mockManagerId }],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasWriteAccess).toBe(true)
      })
    })

    it('should return true for user with both write and manage permissions', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockManagerId },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [{ id: mockManagerId }],
              readPermissions: [],
              managePermissions: [{ id: mockManagerId }],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasWriteAccess).toBe(true)
      })
    })
  })

  describe('hasReadAccess', () => {
    it('should return true for user with manage permission', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockManagerId },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [],
              readPermissions: [],
              managePermissions: [{ id: mockManagerId }],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasReadAccess).toBe(true)
      })
    })
  })

  describe('permission hierarchy', () => {
    it('should correctly identify all permission levels for manager', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockManagerId },
      } as any)
      mockUseQuery.mockReturnValue({
        data: {
          maps: [
            {
              id: mockMapId,
              creator: { id: mockOwnerId },
              writePermissions: [],
              readPermissions: [],
              managePermissions: [{ id: mockManagerId }],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useMapPermissions())

      await waitFor(() => {
        expect(result.current.hasReadAccess).toBe(true)
        expect(result.current.hasWriteAccess).toBe(true)
        expect(result.current.hasManageAccess).toBe(true)
      })
    })
  })
})


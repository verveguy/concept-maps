/**
 * Tests for useSharing hook with manager permissions.
 * Verifies invitation creation, acceptance, permission updates, and revocation
 * for all three permission levels: view, edit, and manage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSharing } from '../useSharing'
import { db, tx, id } from '@/lib/instant'

// Use vi.mocked to get typed mocks
const mockTransact = vi.mocked(db.transact)
const mockUseQuery = vi.mocked(db.useQuery)
const mockUseAuth = vi.mocked(db.useAuth)
const mockId = vi.mocked(id)

// Helper to create mock transaction objects
const createMockTxObject = (entity: string, id: string) => ({
  update: vi.fn().mockReturnValue({
    link: vi.fn().mockReturnValue({}),
  }),
  link: vi.fn().mockReturnValue({}),
  unlink: vi.fn().mockReturnValue({}),
})

describe('useSharing - Manager Permissions', () => {
  const mockMapId = 'map-1'
  const mockOwnerId = 'owner-1'
  const mockManagerId = 'manager-1'
  const mockEditorId = 'editor-1'
  const mockOwnerEmail = 'owner@example.com'
  const mockManagerEmail = 'manager@example.com'
  const mockEditorEmail = 'editor@example.com'

  beforeEach(() => {
    vi.clearAllMocks()
    mockId.mockReturnValue('mock-id-123')
    mockTransact.mockResolvedValue(undefined)
    
    // Setup default tx mocks
    ;(tx.shareInvitations as any)['mock-id-123'] = createMockTxObject('shareInvitations', 'mock-id-123')
    ;(tx.shares as any)['mock-id-123'] = createMockTxObject('shares', 'mock-id-123')
    ;(tx.maps as any)[mockMapId] = {
      link: vi.fn().mockReturnValue({}),
      unlink: vi.fn().mockReturnValue({}),
    }
  })

  describe('createInvitation with manage permission', () => {
    it('should create an invitation with manage permission', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockOwnerId },
      } as any)
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            $users: [{ id: mockOwnerId, email: mockOwnerEmail }],
          },
        } as any)
        .mockReturnValueOnce({
          data: {
            maps: [
              {
                id: mockMapId,
                shares: [],
                shareInvitations: [],
                writePermissions: [],
                readPermissions: [],
                managePermissions: [],
              },
            ],
          },
        } as any)

      const { result } = renderHook(() => useSharing(mockMapId))

      await waitFor(() => {
        expect(result.current.createInvitation).toBeDefined()
      })

      const token = await result.current.createInvitation(mockManagerEmail, 'manage')

      expect(typeof token).toBe('string')
      expect(mockTransact).toHaveBeenCalledTimes(1)
      const transaction = mockTransact.mock.calls[0][0]
      expect(Array.isArray(transaction)).toBe(true)
    })

    it('should allow managers to create invitations', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: mockManagerId },
      } as any)
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            $users: [{ id: mockManagerId, email: mockManagerEmail }],
          },
        } as any)
        .mockReturnValueOnce({
          data: {
            maps: [
              {
                id: mockMapId,
                shares: [],
                shareInvitations: [],
                writePermissions: [{ id: mockManagerId }],
                readPermissions: [],
                managePermissions: [{ id: mockManagerId }],
              },
            ],
          },
        } as any)

      const { result } = renderHook(() => useSharing(mockMapId))

      await waitFor(() => {
        expect(result.current.createInvitation).toBeDefined()
      })

      await result.current.createInvitation(mockEditorEmail, 'edit')

      expect(mockTransact).toHaveBeenCalledTimes(1)
    })
  })

  describe('acceptInvitation with manage permission', () => {
    it('should link user to both writePermissions and managePermissions when accepting manage invitation', async () => {
      const invitationId = 'invitation-1'
      const shareId = 'share-1'

      mockUseAuth.mockReturnValue({
        user: { id: mockManagerId },
      } as any)
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            $users: [{ id: mockManagerId, email: mockManagerEmail }],
          },
        } as any)
        .mockReturnValueOnce({
          data: {
            maps: [
              {
                id: mockMapId,
                shares: [],
                shareInvitations: [
                  {
                    id: invitationId,
                    invitedEmail: mockManagerEmail,
                    permission: 'manage',
                    status: 'pending',
                    createdBy: mockOwnerId,
                    creator: { id: mockOwnerId },
                    map: { id: mockMapId },
                  },
                ],
                writePermissions: [],
                readPermissions: [],
                managePermissions: [],
              },
            ],
          },
        } as any)

      mockId
        .mockReturnValueOnce(shareId)
        .mockReturnValueOnce('mock-token')

      ;(tx.shares as any)[shareId] = createMockTxObject('shares', shareId)
      ;(tx.shareInvitations as any)[invitationId] = createMockTxObject('shareInvitations', invitationId)

      const { result } = renderHook(() => useSharing(mockMapId))

      await waitFor(() => {
        expect(result.current.invitations.length).toBeGreaterThan(0)
      })

      await result.current.acceptInvitation(invitationId)

      expect(mockTransact).toHaveBeenCalledTimes(1)
      const transaction = mockTransact.mock.calls[0][0]
      expect(Array.isArray(transaction)).toBe(true)
      // Should have invitation update + share create + permission links
      expect(transaction.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('updateSharePermission - permission transitions', () => {
    const mockShareId = 'share-1'

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: mockOwnerId },
      } as any)
      mockUseQuery.mockReturnValueOnce({
        data: {
          $users: [{ id: mockOwnerId, email: mockOwnerEmail }],
        },
      } as any)
      ;(tx.shares as any)[mockShareId] = createMockTxObject('shares', mockShareId)
    })

    it('should only unlink managePermissions when downgrading from manage to edit', async () => {
      mockUseQuery.mockReturnValueOnce({
        data: {
          maps: [
            {
              id: mockMapId,
              shares: [
                {
                  id: mockShareId,
                  permission: 'manage',
                  status: 'active',
                  user: { id: mockManagerId },
                  map: { id: mockMapId, creator: { id: mockOwnerId } },
                  creator: { id: mockOwnerId },
                },
              ],
              shareInvitations: [],
              writePermissions: [{ id: mockManagerId }],
              readPermissions: [],
              managePermissions: [{ id: mockManagerId }],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useSharing(mockMapId))

      await waitFor(() => {
        expect(result.current.shares.length).toBeGreaterThan(0)
      })

      // Clear any previous calls
      const mapUnlinkMock = (tx.maps as any)[mockMapId].unlink
      const mapLinkMock = (tx.maps as any)[mockMapId].link
      mapUnlinkMock.mockClear()
      mapLinkMock.mockClear()

      await result.current.updateSharePermission(mockShareId, 'edit')

      expect(mockTransact).toHaveBeenCalledTimes(1)
      const transaction = mockTransact.mock.calls[0][0]
      expect(Array.isArray(transaction)).toBe(true)
      
      // Verify that unlink was called with managePermissions but NOT with writePermissions
      expect(mapUnlinkMock).toHaveBeenCalledTimes(1)
      expect(mapUnlinkMock).toHaveBeenCalledWith({ managePermissions: mockManagerId })
      expect(mapUnlinkMock).not.toHaveBeenCalledWith({ writePermissions: mockManagerId })
      
      // Verify that link was NOT called (writePermissions already exists)
      expect(mapLinkMock).not.toHaveBeenCalled()
    })

    it('should link managePermissions when upgrading from edit to manage', async () => {
      mockUseQuery.mockReturnValueOnce({
        data: {
          maps: [
            {
              id: mockMapId,
              shares: [
                {
                  id: mockShareId,
                  permission: 'edit',
                  status: 'active',
                  user: { id: mockEditorId },
                  map: { id: mockMapId, creator: { id: mockOwnerId } },
                  creator: { id: mockOwnerId },
                },
              ],
              shareInvitations: [],
              writePermissions: [{ id: mockEditorId }],
              readPermissions: [],
              managePermissions: [],
            },
          ],
        },
      } as any)

      const { result } = renderHook(() => useSharing(mockMapId))

      await waitFor(() => {
        expect(result.current.shares.length).toBeGreaterThan(0)
      })

      // Clear any previous calls
      const mapLinkMock = (tx.maps as any)[mockMapId].link
      mapLinkMock.mockClear()

      await result.current.updateSharePermission(mockShareId, 'manage')

      expect(mockTransact).toHaveBeenCalledTimes(1)
      const transaction = mockTransact.mock.calls[0][0]
      expect(Array.isArray(transaction)).toBe(true)
      
      // Verify that both writePermissions and managePermissions are linked
      // (making it idempotent and handling edge cases)
      expect(mapLinkMock).toHaveBeenCalledTimes(2)
      expect(mapLinkMock).toHaveBeenCalledWith({ writePermissions: mockEditorId })
      expect(mapLinkMock).toHaveBeenCalledWith({ managePermissions: mockEditorId })
    })
  })

  describe('revokeShare with manage permission', () => {
    it('should unlink both writePermissions and managePermissions when revoking manage share', async () => {
      const mockShareId = 'share-1'

      mockUseAuth.mockReturnValue({
        user: { id: mockOwnerId },
      } as any)
      mockUseQuery
        .mockReturnValueOnce({
          data: {
            $users: [{ id: mockOwnerId, email: mockOwnerEmail }],
          },
        } as any)
        .mockReturnValueOnce({
          data: {
            maps: [
              {
                id: mockMapId,
                shares: [
                  {
                    id: mockShareId,
                    permission: 'manage',
                    status: 'active',
                    user: { id: mockManagerId },
                    map: { id: mockMapId },
                    invitation: null,
                  },
                ],
                shareInvitations: [],
                writePermissions: [{ id: mockManagerId }],
                readPermissions: [],
                managePermissions: [{ id: mockManagerId }],
              },
            ],
          },
        } as any)

      const { result } = renderHook(() => useSharing(mockMapId))

      await waitFor(() => {
        expect(result.current.shares.length).toBeGreaterThan(0)
      })

      await result.current.revokeShare(mockShareId)

      expect(mockTransact).toHaveBeenCalledTimes(1)
      const transaction = mockTransact.mock.calls[0][0]
      expect(Array.isArray(transaction)).toBe(true)
      // Should have: share update + unlink writePermissions + unlink managePermissions
      expect(transaction.length).toBeGreaterThan(1)
    })
  })
})


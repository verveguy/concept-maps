/**
 * Tests for useConceptNodeCollaboration hook.
 * Verifies filtering and deduplication of editing users.
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useConceptNodeCollaboration } from '../useConceptNodeCollaboration'
import type { PresenceData } from '@/lib/presence'

describe('useConceptNodeCollaboration', () => {
  const mockPresence: PresenceData[] = [
    {
      userId: 'user-1',
      userName: 'User 1',
      email: 'user1@example.com',
      cursor: null,
      editingNodeId: 'node-1',
      editingEdgeId: null,
      color: '#ff0000',
      avatarUrl: null,
    },
    {
      userId: 'user-2',
      userName: 'User 2',
      email: 'user2@example.com',
      cursor: null,
      editingNodeId: 'node-1',
      editingEdgeId: null,
      color: '#00ff00',
      avatarUrl: null,
    },
    {
      userId: 'user-3',
      userName: 'User 3',
      email: 'user3@example.com',
      cursor: null,
      editingNodeId: 'node-2', // Different node
      editingEdgeId: null,
      color: '#0000ff',
      avatarUrl: null,
    },
  ]

  it('should filter users editing the specified node', () => {
    const { result } = renderHook(() =>
      useConceptNodeCollaboration(mockPresence, 'node-1')
    )
    
    expect(result.current).toHaveLength(2)
    expect(result.current[0].userId).toBe('user-1')
    expect(result.current[1].userId).toBe('user-2')
  })
  
  it('should return empty array when no users editing the node', () => {
    const { result } = renderHook(() =>
      useConceptNodeCollaboration(mockPresence, 'node-3')
    )
    
    expect(result.current).toHaveLength(0)
  })
  
  it('should filter out users without userName', () => {
    const presenceWithoutName: PresenceData[] = [
      {
        userId: 'user-1',
        userName: '',
        email: null,
        cursor: null,
        editingNodeId: 'node-1',
        editingEdgeId: null,
        color: '#ff0000',
        avatarUrl: null,
      },
    ]
    
    const { result } = renderHook(() =>
      useConceptNodeCollaboration(presenceWithoutName, 'node-1')
    )
    
    expect(result.current).toHaveLength(0)
  })
  
  it('should filter out users without color', () => {
    const presenceWithoutColor: PresenceData[] = [
      {
        userId: 'user-1',
        userName: 'User 1',
        email: null,
        cursor: null,
        editingNodeId: 'node-1',
        editingEdgeId: null,
        color: '',
        avatarUrl: null,
      },
    ]
    
    const { result } = renderHook(() =>
      useConceptNodeCollaboration(presenceWithoutColor, 'node-1')
    )
    
    expect(result.current).toHaveLength(0)
  })
  
  it('should filter out users without userId', () => {
    const presenceWithoutUserId: PresenceData[] = [
      {
        userId: '',
        userName: 'User 1',
        email: null,
        cursor: null,
        editingNodeId: 'node-1',
        editingEdgeId: null,
        color: '#ff0000',
        avatarUrl: null,
      },
    ]
    
    const { result } = renderHook(() =>
      useConceptNodeCollaboration(presenceWithoutUserId, 'node-1')
    )
    
    expect(result.current).toHaveLength(0)
  })
  
  it('should deduplicate users by userId', () => {
    const duplicatePresence: PresenceData[] = [
      {
        userId: 'user-1',
        userName: 'User 1',
        email: null,
        cursor: null,
        editingNodeId: 'node-1',
        editingEdgeId: null,
        color: '#ff0000',
        avatarUrl: null,
      },
      {
        userId: 'user-1', // Duplicate
        userName: 'User 1',
        email: null,
        cursor: null,
        editingNodeId: 'node-1',
        editingEdgeId: null,
        color: '#ff0000',
        avatarUrl: null,
      },
    ]
    
    const { result } = renderHook(() =>
      useConceptNodeCollaboration(duplicatePresence, 'node-1')
    )
    
    expect(result.current).toHaveLength(1)
    expect(result.current[0].userId).toBe('user-1')
  })
  
  it('should memoize result when inputs do not change', () => {
    const { result, rerender } = renderHook(
      ({ presence, nodeId }) => useConceptNodeCollaboration(presence, nodeId),
      { initialProps: { presence: mockPresence, nodeId: 'node-1' } }
    )
    
    const firstResult = result.current
    
    // Rerender with same props
    rerender({ presence: mockPresence, nodeId: 'node-1' })
    
    // Should return same array reference (memoized)
    expect(result.current).toBe(firstResult)
  })
  
  it('should recalculate when nodeId changes', () => {
    const { result, rerender } = renderHook(
      ({ presence, nodeId }) => useConceptNodeCollaboration(presence, nodeId),
      { initialProps: { presence: mockPresence, nodeId: 'node-1' } }
    )
    
    expect(result.current).toHaveLength(2)
    
    // Change nodeId
    rerender({ presence: mockPresence, nodeId: 'node-2' })
    
    expect(result.current).toHaveLength(1)
    expect(result.current[0].userId).toBe('user-3')
  })
  
  it('should recalculate when presence array changes', () => {
    const { result, rerender } = renderHook(
      ({ presence, nodeId }) => useConceptNodeCollaboration(presence, nodeId),
      { initialProps: { presence: mockPresence, nodeId: 'node-1' } }
    )
    
    expect(result.current).toHaveLength(2)
    
    // Add new user editing node-1
    const newPresence = [
      ...mockPresence,
      {
        userId: 'user-4',
        userName: 'User 4',
        email: null,
        cursor: null,
        editingNodeId: 'node-1',
        editingEdgeId: null,
        color: '#ffff00',
        avatarUrl: null,
      },
    ]
    
    rerender({ presence: newPresence, nodeId: 'node-1' })
    
    expect(result.current).toHaveLength(3)
  })
})


/**
 * Tests for ConceptNodeCollaboration component.
 * Verifies rendering of collaboration indicators.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConceptNodeCollaboration } from '../ConceptNodeCollaboration'
import type { PresenceData } from '@/lib/presence'

// Mock the presence components
vi.mock('@/components/presence/EditingHighlight', () => ({
  EditingHighlight: ({ presence, nodeId }: { presence: PresenceData; nodeId: string }) => (
    <div data-testid={`highlight-${presence.userId}`}>Highlight for {nodeId}</div>
  ),
}))

vi.mock('@/components/presence/PresenceAvatar', () => ({
  PresenceAvatar: ({ presence }: { presence: PresenceData }) => (
    <div data-testid={`avatar-${presence.userId}`}>{presence.userName}</div>
  ),
}))

describe('ConceptNodeCollaboration', () => {
  const mockEditingUsers: PresenceData[] = [
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
  ]

  it('should render editing highlights for each user', () => {
    render(<ConceptNodeCollaboration editingUsers={mockEditingUsers} nodeId="node-1" />)
    
    expect(screen.getByTestId('highlight-user-1')).toBeInTheDocument()
    expect(screen.getByTestId('highlight-user-2')).toBeInTheDocument()
  })

  it('should render avatars container when users are editing', () => {
    const { container } = render(
      <ConceptNodeCollaboration editingUsers={mockEditingUsers} nodeId="node-1" />
    )
    
    const avatarsContainer = container.querySelector('.absolute.-top-2.-right-2')
    expect(avatarsContainer).toBeInTheDocument()
  })

  it('should render avatars for each user', () => {
    render(<ConceptNodeCollaboration editingUsers={mockEditingUsers} nodeId="node-1" />)
    
    expect(screen.getByTestId('avatar-user-1')).toBeInTheDocument()
    expect(screen.getByTestId('avatar-user-2')).toBeInTheDocument()
  })

  it('should not render avatars container when no users are editing', () => {
    const { container } = render(
      <ConceptNodeCollaboration editingUsers={[]} nodeId="node-1" />
    )
    
    const avatarsContainer = container.querySelector('.absolute.-top-2.-right-2')
    expect(avatarsContainer).not.toBeInTheDocument()
  })

  it('should pass correct presence data to components', () => {
    render(<ConceptNodeCollaboration editingUsers={mockEditingUsers} nodeId="node-1" />)
    
    const avatar1 = screen.getByTestId('avatar-user-1')
    expect(avatar1).toHaveTextContent('User 1')
    
    const avatar2 = screen.getByTestId('avatar-user-2')
    expect(avatar2).toHaveTextContent('User 2')
  })
})


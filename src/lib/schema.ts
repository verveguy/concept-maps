/**
 * Core domain types for the concept mapping application.
 * These types represent the application's data model and are used throughout
 * the codebase for type safety and data manipulation.
 */

/**
 * Represents a concept map containing concepts and relationships.
 * A map is the top-level container for organizing knowledge.
 */
export interface Map {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Represents a concept (node) in a concept map.
 * Concepts are the fundamental building blocks of knowledge representation.
 */
export interface Concept {
  id: string
  mapId: string
  label: string
  position: { x: number; y: number }
  notes: string // markdown
  metadata: Record<string, unknown> // flexible key-value pairs
  createdAt: Date
  updatedAt: Date
}

/**
 * Represents a relationship (edge) between two concepts.
 * Relationships define how concepts relate to each other.
 */
export interface Relationship {
  id: string
  mapId: string
  fromConceptId: string
  toConceptId: string
  primaryLabel: string // direction: from -> to
  reverseLabel: string // direction: to -> from
  notes: string // markdown
  metadata: Record<string, unknown> // flexible key-value pairs
  createdAt: Date
  updatedAt: Date
}

/**
 * Represents a perspective (view) on a concept map.
 * Perspectives allow users to focus on specific subsets of concepts and relationships.
 */
export interface Perspective {
  id: string
  mapId: string
  name: string
  conceptIds: string[]
  relationshipIds: string[]
  createdBy: string
  createdAt: Date
}

/**
 * Represents a share (collaboration) on a concept map.
 * Shares define which users have access to a map and what permissions they have.
 */
export interface Share {
  id: string
  mapId: string
  userId: string
  permission: 'view' | 'edit'
  createdAt: Date
  acceptedAt: Date | null // Timestamp when user accepted the share
  status: 'pending' | 'active' | 'revoked'
  revokedAt: Date | null
  invitationId: string | null
}

/**
 * Represents a share invitation for collaborating on a map.
 * Invitations manage the token-based acceptance and audit history.
 */
export interface ShareInvitation {
  id: string
  mapId: string
  invitedEmail: string
  invitedUserId: string | null
  permission: 'view' | 'edit'
  token: string
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
  createdBy: string
  createdAt: Date
  expiresAt: Date | null
  respondedAt: Date | null
  revokedAt: Date | null
}

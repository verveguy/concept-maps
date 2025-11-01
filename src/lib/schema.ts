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
 * Can be user-specific (userId) or link-based (token).
 */
export interface Share {
  id: string
  mapId: string
  userId: string | null // null for link-based shares
  permission: 'view' | 'edit'
  token: string | null // Optional token for link-based sharing
  createdAt: Date
  acceptedAt: Date | null // Timestamp when user accepted the share
}

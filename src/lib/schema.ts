/**
 * Core domain types for the concept mapping application.
 * These types represent the application's data model and are used throughout
 * the codebase for type safety and data manipulation.
 */

/**
 * Represents a concept map containing concepts and relationships.
 * 
 * A map is the top-level container for organizing knowledge. Each map can contain
 * multiple concepts and relationships, and can have multiple perspectives (filtered views).
 * 
 * **Ownership:**
 * Maps are owned by the user who creates them (`createdBy`). The owner has full
 * read/write access and can share the map with other users via the sharing system.
 * 
 * **Soft Deletes:**
 * Maps support soft deletion via the `deletedAt` field. Soft-deleted maps are
 * excluded from normal queries but remain in the database for audit trails and
 * potential restoration.
 */
export interface Map {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null // Timestamp when soft-deleted, null if not deleted
}

/**
 * Represents a concept (node) in a concept map.
 * 
 * Concepts are the fundamental building blocks of knowledge representation.
 * Each concept has a label, position on the canvas, optional notes, and flexible
 * metadata for custom properties.
 * 
 * **Position:**
 * Concepts have x/y coordinates that determine their position on the visualization
 * canvas. Positions can be set manually or calculated by layout algorithms.
 * 
 * **Notes:**
 * The `notes` field supports markdown formatting, allowing rich text descriptions,
 * links, lists, and other markdown features.
 * 
 * **Metadata:**
 * The `metadata` field is a flexible key-value store for custom properties.
 * Common uses include:
 * - Style properties (fillColor, borderColor, etc.)
 * - Categorization (category, tags, etc.)
 * - Custom attributes specific to your use case
 * 
 * **Soft Deletes:**
 * Concepts support soft deletion via the `deletedAt` field. Soft-deleted concepts
 * are excluded from normal queries but remain in the database for undo functionality.
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
  deletedAt: Date | null // Timestamp when soft-deleted, null if not deleted
}

/**
 * Represents a relationship (edge) between two concepts.
 * 
 * Relationships define how concepts relate to each other. Each relationship
 * connects a source concept (`fromConceptId`) to a target concept (`toConceptId`)
 * with directional labels.
 * 
 * **Directional Labels:**
 * Relationships have two labels to support bidirectional reading:
 * - `primaryLabel`: Label when viewing from source → target (e.g., "explains")
 * - `reverseLabel`: Label when viewing from target → source (e.g., "explained by")
 * 
 * This allows the same relationship to be read naturally in both directions.
 * 
 * **Notes:**
 * The `notes` field supports markdown formatting, allowing rich text descriptions
 * of the relationship.
 * 
 * **Metadata:**
 * The `metadata` field can store custom properties such as:
 * - Style properties (edgeType, edgeColor, edgeStyle)
 * - Relationship strength or weight
 * - Custom attributes specific to your use case
 * 
 * **Soft Deletes:**
 * Relationships support soft deletion via the `deletedAt` field. Soft-deleted
 * relationships are excluded from normal queries but remain in the database.
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
  deletedAt: Date | null // Timestamp when soft-deleted, null if not deleted
}

/**
 * Represents a perspective (view) on a concept map.
 * 
 * Perspectives allow users to create filtered views of a concept map by selecting
 * specific concepts and relationships. This enables focusing on subsets of the
 * full map for different purposes or audiences.
 * 
 * **Use Cases:**
 * - Creating topic-specific views (e.g., "Frontend Concepts", "Backend Architecture")
 * - Hiding complexity for presentations
 * - Focusing on specific relationships or concept groups
 * - Creating different views for different audiences
 * 
 * **Structure:**
 * A perspective contains:
 * - `conceptIds`: Array of concept IDs to include
 * - `relationshipIds`: Array of relationship IDs to include
 * 
 * When a perspective is active, only the selected concepts and relationships
 * are displayed in the visualization.
 * 
 * **Ownership:**
 * Perspectives are created by users (`createdBy`) and belong to a specific map.
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
 * 
 * Shares define which users have access to a map and what permissions they have.
 * When a map is shared with a user, a Share record is created linking the user
 * to the map with a specific permission level.
 * 
 * **Permission Levels:**
 * - `'view'`: Read-only access - can view but not modify
 * - `'edit'`: Read-write access - can view and modify
 * 
 * **Status:**
 * - `'pending'`: Share invitation has been sent but not yet accepted
 * - `'active'`: Share is active and user has access
 * - `'revoked'`: Share has been revoked by the map owner
 * 
 * **Lifecycle:**
 * Shares are typically created from ShareInvitations. When a user accepts an
 * invitation, a Share record is created and linked to the appropriate permission
 * set (readPermissions or writePermissions) on the map.
 */
export interface Share {
  id: string
  mapId: string
  userId: string
  userEmail: string | null // Email address of the user with whom the map is shared
  permission: 'view' | 'edit'
  createdAt: Date
  acceptedAt: Date | null // Timestamp when user accepted the share
  status: 'pending' | 'active' | 'revoked'
  revokedAt: Date | null
  invitationId: string | null
}

/**
 * Represents a share invitation for collaborating on a map.
 * 
 * Invitations manage the token-based acceptance flow and audit history for
 * sharing maps with other users. Invitations are created by map owners and
 * sent to users via email.
 * 
 * **Invitation Flow:**
 * 1. Owner creates invitation with target email and permission level
 * 2. Invitation token is generated and shared with invitee
 * 3. Invitee accepts invitation (validates email match)
 * 4. Share record is created and linked to appropriate permissions
 * 5. Invitation status is updated to 'accepted'
 * 
 * **Status Values:**
 * - `'pending'`: Invitation sent but not yet responded to
 * - `'accepted'`: Invitation accepted, share created
 * - `'declined'`: Invitation declined by invitee
 * - `'revoked'`: Invitation revoked by owner
 * - `'expired'`: Invitation expired (if expiration is implemented)
 * 
 * **Security:**
 * Invitations use secure tokens (UUIDs) for authentication. The invitee's email
 * must match the invitation's `invitedEmail` for acceptance to succeed.
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

/**
 * InstantDB schema definition for the concept mapping application.
 * 
 * This schema defines the data model including entities (maps, concepts, relationships,
 * perspectives, shares) and their relationships (links), as well as real-time presence
 * data in rooms.
 * 
 * @see https://www.instantdb.com/docs/modeling-data
 */

import { i } from '@instantdb/react'

/**
 * Internal schema definition before type extraction
 */
const _schema = i.schema({
  entities: {
    maps: i.entity({
      name: i.string().indexed(),
      createdBy: i.string().indexed(),
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    concepts: i.entity({
      mapId: i.string().indexed(),
      label: i.string().indexed(),
      positionX: i.number(),
      positionY: i.number(),
      notes: i.string().optional(),
      metadata: i.string().optional(), // JSON string
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    relationships: i.entity({
      mapId: i.string().indexed(),
      fromConceptId: i.string().indexed(),
      toConceptId: i.string().indexed(),
      primaryLabel: i.string(),
      reverseLabel: i.string(),
      notes: i.string().optional(),
      metadata: i.string().optional(), // JSON string
      createdAt: i.number().indexed(),
      updatedAt: i.number().indexed(),
    }),
    perspectives: i.entity({
      mapId: i.string().indexed(),
      name: i.string().indexed(),
      conceptIds: i.string().optional(), // JSON array string
      relationshipIds: i.string().optional(), // JSON array string
      createdBy: i.string().indexed(),
      createdAt: i.number().indexed(),
    }),
    shares: i.entity({
      mapId: i.string().indexed(),
      userId: i.string().indexed(),
      permission: i.string(), // 'view' | 'edit'
      createdAt: i.number().indexed(),
      acceptedAt: i.number().optional(), // Timestamp when user accepted the share
      status: i.string().indexed(), // 'active' | 'revoked'
      revokedAt: i.number().optional(),
      invitationId: i.string().optional().indexed(),
    }),
    shareInvitations: i.entity({
      mapId: i.string().indexed(),
      invitedEmail: i.string().indexed(),
      invitedUserId: i.string().optional().indexed(),
      permission: i.string(), // 'view' | 'edit'
      token: i.string().indexed(),
      status: i.string().indexed(), // 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired'
      createdBy: i.string().indexed(),
      createdAt: i.number().indexed(),
      expiresAt: i.number().optional().indexed(),
      respondedAt: i.number().optional(),
      revokedAt: i.number().optional(),
    }),
  },
  links: {
    conceptsMap: {
      forward: {
        on: 'concepts',
        has: 'many',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'concepts',
      },
    },
    relationshipsMap: {
      forward: {
        on: 'relationships',
        has: 'many',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'relationships',
      },
    },
    relationshipsFromConcept: {
      forward: {
        on: 'relationships',
        has: 'many',
        label: 'fromConcept',
      },
      reverse: {
        on: 'concepts',
        has: 'many',
        label: 'outgoingRelationships',
      },
    },
    relationshipsToConcept: {
      forward: {
        on: 'relationships',
        has: 'many',
        label: 'toConcept',
      },
      reverse: {
        on: 'concepts',
        has: 'many',
        label: 'incomingRelationships',
      },
    },
    perspectivesMap: {
      forward: {
        on: 'perspectives',
        has: 'many',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'perspectives',
      },
    },
    sharesMap: {
      forward: {
        on: 'shares',
        has: 'many',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'shares',
      },
    },
    shareInvitationsMap: {
      forward: {
        on: 'shareInvitations',
        has: 'many',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'shareInvitations',
      },
    },
  },
  rooms: {
    map: {
      presence: i.entity({
        userId: i.string(),
        userName: i.string(),
        cursor: i.json().optional(), // { x: number, y: number } | null
        editingNodeId: i.string().optional(),
        editingEdgeId: i.string().optional(),
        color: i.string(),
      }),
    },
  },
})

/**
 * Type helper to improve TypeScript IntelliSense display
 * @internal
 */
type _AppSchema = typeof _schema

/**
 * Application schema type that extends the internal schema type
 * Provides improved TypeScript type inference and IntelliSense
 */
interface AppSchema extends _AppSchema {}

/**
 * Exported schema instance for use throughout the application
 */
const schema: AppSchema = _schema

export type { AppSchema }
export default schema

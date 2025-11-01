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
      token: i.string().indexed().optional(), // Optional share token for link-based access
      createdAt: i.number().indexed(),
      acceptedAt: i.number().optional(), // Timestamp when user accepted the share
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

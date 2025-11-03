// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from '@instantdb/react'

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    concepts: i.entity({
      createdAt: i.number().indexed(),
      label: i.string().indexed(),
      mapId: i.string().indexed(),
      metadata: i.string().optional(),
      notes: i.string().optional(),
      positionX: i.number(),
      positionY: i.number(),
      updatedAt: i.number().indexed(),
    }),
    maps: i.entity({
      createdAt: i.number().indexed(),
      createdBy: i.string().indexed(),
      name: i.string().indexed(),
      updatedAt: i.number().indexed(),
    }),
    perspectives: i.entity({
      conceptIds: i.string().optional(),
      createdAt: i.number().indexed(),
      createdBy: i.string().indexed(),
      mapId: i.string().indexed(),
      name: i.string().indexed(),
      relationshipIds: i.string().optional(),
    }),
    relationships: i.entity({
      createdAt: i.number().indexed(),
      fromConceptId: i.string().indexed(),
      mapId: i.string().indexed(),
      metadata: i.string().optional(),
      notes: i.string().optional(),
      primaryLabel: i.string().indexed(),
      reverseLabel: i.string().indexed(),
      toConceptId: i.string().indexed(),
      updatedAt: i.number().indexed(),
    }),
    shares: i.entity({
      acceptedAt: i.number().optional(),
      createdAt: i.number().indexed(),
      mapId: i.string().indexed(),
      permission: i.string(),
      userId: i.string().indexed(),
    }),
  },
  links: {
    $usersLinkedPrimaryUser: {
      forward: {
        on: '$users',
        has: 'one',
        label: 'linkedPrimaryUser',
        onDelete: 'cascade',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'linkedGuestUsers',
      },
    },
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
        color: i.string(),
        cursor: i.json().optional(),
        editingEdgeId: i.string().optional(),
        editingNodeId: i.string().optional(),
        userId: i.string(),
        userName: i.string(),
      }),
    },
  },
})

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema

export type { AppSchema }
export default schema

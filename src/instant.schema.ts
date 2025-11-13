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
    comments: i.entity({
      createdAt: i.number().indexed(),
      deletedAt: i.number().optional(),
      positionX: i.number(),
      positionY: i.number(),
      resolved: i.boolean().optional(),
      text: i.string(),
      updatedAt: i.number().indexed(),
      userPlaced: i.boolean().optional(),
    }),
    concepts: i.entity({
      createdAt: i.number().indexed(),
      deletedAt: i.number().optional(),
      label: i.string().indexed(),
      metadata: i.string().optional(),
      notes: i.string().optional(),
      positionX: i.number(),
      positionY: i.number(),
      updatedAt: i.number().indexed(),
      userPlaced: i.boolean().optional(),
    }),
    maps: i.entity({
      createdAt: i.number().indexed(),
      deletedAt: i.number().optional(),
      layoutAlgorithm: i.string().optional(),
      name: i.string().indexed(),
      updatedAt: i.number().indexed(),
    }),
    perspectives: i.entity({
      conceptIds: i.string().optional(),
      createdAt: i.number().indexed(),
      name: i.string().indexed(),
      relationshipIds: i.string().optional(),
    }),
    relationships: i.entity({
      createdAt: i.number().indexed(),
      deletedAt: i.number().optional(),
      metadata: i.string().optional(),
      notes: i.string().optional(),
      primaryLabel: i.string().indexed(),
      reverseLabel: i.string().indexed(),
      updatedAt: i.number().indexed(),
    }),
    shareInvitations: i.entity({
      createdAt: i.number().indexed(),
      expiresAt: i.number().indexed().optional(),
      invitedEmail: i.string().indexed(),
      invitedUserId: i.string().indexed().optional(),
      permission: i.string(),
      respondedAt: i.number().optional(),
      revokedAt: i.number().optional(),
      status: i.string().indexed(),
      token: i.string().indexed(),
    }),
    shares: i.entity({
      acceptedAt: i.number().optional(),
      createdAt: i.number().indexed(),
      permission: i.string(),
      revokedAt: i.number().optional(),
      status: i.string().indexed(),
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
    commentsConcepts: {
      forward: {
        on: 'comments',
        has: 'many',
        label: 'concepts',
      },
      reverse: {
        on: 'concepts',
        has: 'many',
        label: 'comments',
      },
    },
    commentsCreator: {
      forward: {
        on: 'comments',
        has: 'one',
        label: 'creator',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'createdComments',
      },
    },
    commentsMap: {
      forward: {
        on: 'comments',
        has: 'one',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'comments',
      },
    },
    conceptsMap: {
      forward: {
        on: 'concepts',
        has: 'one',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'concepts',
      },
    },
    mapsCreator: {
      forward: {
        on: 'maps',
        has: 'one',
        label: 'creator',
        required: true,
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'createdMaps',
      },
    },
    mapsManagePermissions: {
      forward: {
        on: 'maps',
        has: 'many',
        label: 'managePermissions',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'manageAccessMaps',
      },
    },
    mapsReadPermissions: {
      forward: {
        on: 'maps',
        has: 'many',
        label: 'readPermissions',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'readAccessMaps',
      },
    },
    mapsWritePermissions: {
      forward: {
        on: 'maps',
        has: 'many',
        label: 'writePermissions',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'writeAccessMaps',
      },
    },
    perspectivesCreator: {
      forward: {
        on: 'perspectives',
        has: 'one',
        label: 'creator',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'createdPerspectives',
      },
    },
    perspectivesMap: {
      forward: {
        on: 'perspectives',
        has: 'one',
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
        has: 'one',
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
        has: 'one',
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
        has: 'one',
        label: 'toConcept',
      },
      reverse: {
        on: 'concepts',
        has: 'many',
        label: 'incomingRelationships',
      },
    },
    shareInvitationsCreator: {
      forward: {
        on: 'shareInvitations',
        has: 'one',
        label: 'creator',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'createdShareInvitations',
      },
    },
    shareInvitationsMap: {
      forward: {
        on: 'shareInvitations',
        has: 'one',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'shareInvitations',
      },
    },
    sharesCreator: {
      forward: {
        on: 'shares',
        has: 'one',
        label: 'creator',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'createdShares',
      },
    },
    sharesInvitation: {
      forward: {
        on: 'shares',
        has: 'one',
        label: 'invitation',
      },
      reverse: {
        on: 'shareInvitations',
        has: 'one',
        label: 'share',
      },
    },
    sharesMap: {
      forward: {
        on: 'shares',
        has: 'one',
        label: 'map',
      },
      reverse: {
        on: 'maps',
        has: 'many',
        label: 'shares',
      },
    },
    sharesUser: {
      forward: {
        on: 'shares',
        has: 'one',
        label: 'user',
      },
      reverse: {
        on: '$users',
        has: 'many',
        label: 'shares',
      },
    },
  },
  rooms: {
    map: {
      presence: i.entity({
        avatarUrl: i.string().optional(),
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

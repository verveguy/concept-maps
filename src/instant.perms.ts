// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from '@instantdb/react'

const rules = {
  maps: {
    bind: [
      'isOwner',
      'auth.id != null && auth.id in data.ref("creator.id")',
      'hasReadPermission',
      'auth.id != null && auth.id in data.ref("readPermissions.id")',
      'hasWritePermission',
      'auth.id != null && auth.id in data.ref("writePermissions.id")',
      'hasPendingInvitation',
      'auth.id != null && ((auth.id in data.ref("shareInvitations.invitedUserId") || (auth.email != null && auth.email in data.ref("shareInvitations.invitedEmail"))) && "pending" in data.ref("shareInvitations.status")) || (auth.email != null && auth.email in data.ref("shareInvitations.invitedEmail") && "pending" in data.ref("shareInvitations.status"))',
      'isOwnerOrReader',
      'isOwner || hasReadPermission || hasWritePermission || hasPendingInvitation',
      'isOwnerOrEditor',
      'isOwner || hasWritePermission || hasPendingInvitation',
    ],
    allow: {
      view: 'isOwnerOrReader',
      create: 'auth.id != null',
      delete: 'isOwner',
      update: 'isOwnerOrEditor',
    },
  },
  $users: {
    allow: {
      view: 'auth.id != null',
    },
  },
  shares: {
    bind: [
      'mapOwnerOnly',
      'auth.id != null && auth.id in data.ref("creator.id")',
      'shareRecipient',
      'auth.id != null && auth.id in data.ref("user.id")',
      'isActiveShare',
      'data.status == "active"',
      'isEditShare',
      'data.permission == "edit"',
      'mapOwnerOrShareRecipient',
      'mapOwnerOnly || (shareRecipient && isActiveShare)',
      'shareRecipientWithEdit',
      'shareRecipient && isActiveShare && isEditShare',
      'mapOwnerOrEditShareRecipient',
      'mapOwnerOnly || shareRecipientWithEdit',
      'hasInvitationForMap',
      '(auth.id != null && auth.id in data.ref("map.shareInvitations.invitedUserId")) || (auth.email != null && auth.email in data.ref("map.shareInvitations.invitedEmail"))',
      'hasPendingInvitationForMap',
      'hasInvitationForMap && "pending" in data.ref("map.shareInvitations.status")',
      'canUpdateLinkedInvitation',
      'data.invitation != null && ((auth.id != null && auth.id in data.ref("invitation.invitedUserId")) || (auth.email != null && auth.email in data.ref("invitation.invitedEmail")))',
      'ownerOrInvitee',
      'mapOwnerOnly || hasInvitationForMap || canUpdateLinkedInvitation',
    ],
    allow: {
      view: 'mapOwnerOrShareRecipient',
      create: 'ownerOrInvitee',
      delete: 'mapOwnerOnly',
      update: 'mapOwnerOnly',
    },
  },
  concepts: {
    bind: [
      'mapIsOwned',
      'auth.id != null && auth.id in data.ref("map.creator.id")',
      'mapHasReadPermission',
      'auth.id != null && auth.id in data.ref("map.readPermissions.id")',
      'mapHasWritePermission',
      'auth.id != null && auth.id in data.ref("map.writePermissions.id")',
      'canReadParentMap',
      'mapIsOwned || mapHasReadPermission || mapHasWritePermission',
      'canEditParentMap',
      'mapIsOwned || mapHasWritePermission',
    ],
    allow: {
      view: 'canReadParentMap',
      create: 'canEditParentMap',
      delete: 'canEditParentMap',
      update: 'canEditParentMap',
    },
  },
  perspectives: {
    bind: [
      'mapIsOwned',
      'auth.id != null && auth.id in data.ref("map.creator.id")',
      'mapHasReadPermission',
      'auth.id != null && auth.id in data.ref("map.readPermissions.id")',
      'mapHasWritePermission',
      'auth.id != null && auth.id in data.ref("map.writePermissions.id")',
      'canReadParentMap',
      'mapIsOwned || mapHasReadPermission || mapHasWritePermission',
      'canEditParentMap',
      'mapIsOwned || mapHasWritePermission',
    ],
    allow: {
      view: 'canReadParentMap',
      create: 'canEditParentMap',
      delete: 'canEditParentMap',
      update: 'canEditParentMap',
    },
  },
  relationships: {
    bind: [
      'mapIsOwned',
      'auth.id != null && auth.id in data.ref("map.creator.id")',
      'mapHasReadPermission',
      'auth.id != null && auth.id in data.ref("map.readPermissions.id")',
      'mapHasWritePermission',
      'auth.id != null && auth.id in data.ref("map.writePermissions.id")',
      'canReadParentMap',
      'mapIsOwned || mapHasReadPermission || mapHasWritePermission',
      'canEditParentMap',
      'mapIsOwned || mapHasWritePermission',
    ],
    allow: {
      view: 'canReadParentMap',
      create: 'canEditParentMap',
      delete: 'canEditParentMap',
      update: 'canEditParentMap',
    },
  },
  shareInvitations: {
    bind: [
      'mapOwnerCreator',
      'auth.id != null && auth.id in data.ref("creator.id")',
      'authMatchesInvitee',
      '(auth.id != null && (auth.id == data.invitedEmail || auth.id == data.invitedUserId)) || (auth.email != null && (auth.email == data.invitedEmail || auth.email == data.invitedUserId))',
      'mapOwnerOrInvitee',
      'mapOwnerCreator || authMatchesInvitee',
    ],
    allow: {
      view: 'mapOwnerOrInvitee',
      create: 'mapOwnerCreator',
      delete: 'mapOwnerCreator',
      update: 'mapOwnerOrInvitee',
    },
  },
} satisfies InstantRules

export default rules

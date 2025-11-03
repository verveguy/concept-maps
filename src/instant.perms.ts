// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from '@instantdb/react'

const rules = {
  /**
   * Permission model for concept maps.
   * Owners always have full access, collaborators inherit access through
   * accepted shares or invitations with matching permissions.
   */
  maps: {
    allow: {
      view: 'isOwnerOrReader',
      create: 'auth.id != null',
      update: 'isOwnerOrEditor',
      delete: 'isOwner',
    },
    bind: [
      'isOwner',
      'auth.id != null && auth.id == data.createdBy',
      'hasActiveShare',
      'auth.id != null && exists(shares, share => share.mapId == data.id && share.userId == auth.id && share.status == "active")',
      'hasEditableShare',
      'auth.id != null && exists(shares, share => share.mapId == data.id && share.userId == auth.id && share.status == "active" && share.permission == "edit")',
      'hasAcceptedInvitation',
      'exists(shareInvitations, invitation => invitation.mapId == data.id && invitation.status == "accepted" && ((auth.id != null && (invitation.invitedUserId == auth.id || invitation.invitedEmail == auth.id)) || (auth.email != null && (invitation.invitedUserId == auth.email || invitation.invitedEmail == auth.email))))',
      'hasEditableInvitation',
      'exists(shareInvitations, invitation => invitation.mapId == data.id && invitation.status == "accepted" && invitation.permission == "edit" && ((auth.id != null && (invitation.invitedUserId == auth.id || invitation.invitedEmail == auth.id)) || (auth.email != null && (invitation.invitedUserId == auth.email || invitation.invitedEmail == auth.email))))',
      'isOwnerOrReader',
      'isOwner || hasActiveShare || hasAcceptedInvitation',
      'isOwnerOrEditor',
      'isOwner || hasEditableShare || hasEditableInvitation',
    ],
  },

  /**
   * Concepts inherit permissions from their parent map.
   */
  concepts: {
    allow: {
      view: 'canReadParentMap',
      create: 'canEditParentMap',
      update: 'canEditParentMap',
      delete: 'canEditParentMap',
    },
    bind: [
      'mapIsOwned',
      'auth.id != null && exists(maps, map => map.id == data.mapId && map.createdBy == auth.id)',
      'mapHasShareReader',
      'auth.id != null && exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.status == "active")',
      'mapHasShareEditor',
      'auth.id != null && exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.status == "active" && share.permission == "edit")',
      'mapHasInvitationReader',
      'exists(shareInvitations, invitation => invitation.mapId == data.mapId && invitation.status == "accepted" && ((auth.id != null && (invitation.invitedUserId == auth.id || invitation.invitedEmail == auth.id)) || (auth.email != null && (invitation.invitedUserId == auth.email || invitation.invitedEmail == auth.email))))',
      'mapHasInvitationEditor',
      'exists(shareInvitations, invitation => invitation.mapId == data.mapId && invitation.status == "accepted" && invitation.permission == "edit" && ((auth.id != null && (invitation.invitedUserId == auth.id || invitation.invitedEmail == auth.id)) || (auth.email != null && (invitation.invitedUserId == auth.email || invitation.invitedEmail == auth.email))))',
      'canReadParentMap',
      'mapIsOwned || mapHasShareReader || mapHasInvitationReader',
      'canEditParentMap',
      'mapIsOwned || mapHasShareEditor || mapHasInvitationEditor',
    ],
  },

  /**
   * Relationships share the same access pattern as concepts.
   */
  relationships: {
    allow: {
      view: 'canReadParentMap',
      create: 'canEditParentMap',
      update: 'canEditParentMap',
      delete: 'canEditParentMap',
    },
    bind: [
      'mapIsOwned',
      'auth.id != null && exists(maps, map => map.id == data.mapId && map.createdBy == auth.id)',
      'mapHasShareReader',
      'auth.id != null && exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.status == "active")',
      'mapHasShareEditor',
      'auth.id != null && exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.status == "active" && share.permission == "edit")',
      'mapHasInvitationReader',
      'exists(shareInvitations, invitation => invitation.mapId == data.mapId && invitation.status == "accepted" && ((auth.id != null && (invitation.invitedUserId == auth.id || invitation.invitedEmail == auth.id)) || (auth.email != null && (invitation.invitedUserId == auth.email || invitation.invitedEmail == auth.email))))',
      'mapHasInvitationEditor',
      'exists(shareInvitations, invitation => invitation.mapId == data.mapId && invitation.status == "accepted" && invitation.permission == "edit" && ((auth.id != null && (invitation.invitedUserId == auth.id || invitation.invitedEmail == auth.id)) || (auth.email != null && (invitation.invitedUserId == auth.email || invitation.invitedEmail == auth.email))))',
      'canReadParentMap',
      'mapIsOwned || mapHasShareReader || mapHasInvitationReader',
      'canEditParentMap',
      'mapIsOwned || mapHasShareEditor || mapHasInvitationEditor',
    ],
  },

  /**
   * Perspectives are editable and readable following the same rules as their map.
   */
  perspectives: {
    allow: {
      view: 'canReadParentMap',
      create: 'canEditParentMap',
      update: 'canEditParentMap',
      delete: 'canEditParentMap',
    },
    bind: [
      'mapIsOwned',
      'auth.id != null && exists(maps, map => map.id == data.mapId && map.createdBy == auth.id)',
      'mapHasShareReader',
      'auth.id != null && exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.status == "active")',
      'mapHasShareEditor',
      'auth.id != null && exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.status == "active" && share.permission == "edit")',
      'mapHasInvitationReader',
      'exists(shareInvitations, invitation => invitation.mapId == data.mapId && invitation.status == "accepted" && ((auth.id != null && (invitation.invitedUserId == auth.id || invitation.invitedEmail == auth.id)) || (auth.email != null && (invitation.invitedUserId == auth.email || invitation.invitedEmail == auth.email))))',
      'mapHasInvitationEditor',
      'exists(shareInvitations, invitation => invitation.mapId == data.mapId && invitation.status == "accepted" && invitation.permission == "edit" && ((auth.id != null && (invitation.invitedUserId == auth.id || invitation.invitedEmail == auth.id)) || (auth.email != null && (invitation.invitedUserId == auth.email || invitation.invitedEmail == auth.email))))',
      'canReadParentMap',
      'mapIsOwned || mapHasShareReader || mapHasInvitationReader',
      'canEditParentMap',
      'mapIsOwned || mapHasShareEditor || mapHasInvitationEditor',
    ],
  },

  /**
   * Shares define durable collaborator access. Creation requires either the map owner
   * or an invited collaborator with an accepted invitation. Updates are owner-only to
   * prevent privilege escalation by collaborators.
   */
  shares: {
    allow: {
      view: 'mapOwnerOrShareRecipient',
      create: 'ownerOrAcceptedInvitee',
      update: 'mapOwnerOnly',
      delete: 'mapOwnerOnly',
    },
    bind: [
      'mapOwnerOnly',
      'auth.id != null && exists(maps, map => map.id == data.mapId && map.createdBy == auth.id)',
      'shareRecipient',
      'auth.id != null && auth.id == data.userId',
      'mapOwnerOrShareRecipient',
      'mapOwnerOnly || shareRecipient',
      'ownerOrAcceptedInvitee',
      'mapOwnerOnly || (auth.id != null && auth.id == data.userId && data.invitationId != null && exists(shareInvitations, invitation => invitation.id == data.invitationId && invitation.status == "accepted" && invitation.invitedUserId == auth.id))',
    ],
  },

  /**
   * Share invitations control pending access and token-based acceptance.
   */
  shareInvitations: {
    allow: {
      view: 'mapOwnerOrInvitee',
      create: 'mapOwnerCreator',
      update: 'mapOwnerOrInvitee',
      delete: 'mapOwnerCreator',
    },
    bind: [
      'mapOwnerCreator',
      'auth.id != null && auth.id == data.createdBy',
      'authMatchesInvitee',
      '(auth.id != null && (auth.id == data.invitedEmail || auth.id == data.invitedUserId)) || (auth.email != null && (auth.email == data.invitedEmail || auth.email == data.invitedUserId))',
      'mapOwnerOrInvitee',
      'mapOwnerCreator || authMatchesInvitee',
    ],
  },
} satisfies InstantRules

export default rules

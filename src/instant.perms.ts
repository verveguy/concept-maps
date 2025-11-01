/**
 * InstantDB permission rules configuration.
 * 
 * Defines access control rules for entities in the application.
 * Uses InstantDB's powerful permissions model to automatically filter
 * queries based on user access (maps they created or maps shared with them).
 * 
 * @see https://www.instantdb.com/docs/permissions
 */

import type { InstantRules } from '@instantdb/react'

/**
 * Permission rules for InstantDB entities.
 * 
 * The permissions system automatically filters queries based on these rules,
 * so queries will only return data the user has access to.
 */
const rules = {
  /**
   * Maps: Users can view maps they created OR maps that have been shared with them.
   * Users can create maps (any authenticated user).
   * Users can update/delete maps they own OR maps they have edit permission for.
   */
  maps: {
    allow: {
      view: 'canViewMap',
      create: 'auth.id != null',
      update: 'canEditMap',
      delete: 'canEditMap',
    },
    bind: {
      // User can view a map if they created it OR if there's a share for them
      canViewMap:
        'auth.id != null && (data.createdBy == auth.id || exists(shares, share => share.mapId == data.id && share.userId == auth.id))',
      // User can edit a map if they created it OR if there's a share with edit permission
      canEditMap:
        'auth.id != null && (data.createdBy == auth.id || exists(shares, share => share.mapId == data.id && share.userId == auth.id && share.permission == "edit"))',
    },
  },

  /**
   * Concepts: Users can view concepts that belong to maps they can access.
   * Users can create/update/delete concepts in maps they can edit.
   */
  concepts: {
    allow: {
      view: 'canViewConcept',
      create: 'canEditConcept',
      update: 'canEditConcept',
      delete: 'canEditConcept',
    },
    bind: {
      // User can view a concept if they can view the map it belongs to
      // Traverse the map link to check map ownership or shares
      canViewConcept:
        'auth.id != null && (data.map.createdBy == auth.id || exists(shares, share => share.mapId == data.mapId && share.userId == auth.id))',
      // User can edit a concept if they can edit the map it belongs to
      canEditConcept:
        'auth.id != null && (data.map.createdBy == auth.id || exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.permission == "edit"))',
    },
  },

  /**
   * Relationships: Users can view relationships that belong to maps they can access.
   * Users can create/update/delete relationships in maps they can edit.
   */
  relationships: {
    allow: {
      view: 'canViewRelationship',
      create: 'canEditRelationship',
      update: 'canEditRelationship',
      delete: 'canEditRelationship',
    },
    bind: {
      // User can view a relationship if they can view the map it belongs to
      canViewRelationship:
        'auth.id != null && (data.map.createdBy == auth.id || exists(shares, share => share.mapId == data.mapId && share.userId == auth.id))',
      // User can edit a relationship if they can edit the map it belongs to
      canEditRelationship:
        'auth.id != null && (data.map.createdBy == auth.id || exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.permission == "edit"))',
    },
  },

  /**
   * Perspectives: Users can view perspectives for maps they can access.
   * Users can create/update/delete perspectives in maps they can edit.
   */
  perspectives: {
    allow: {
      view: 'canViewPerspective',
      create: 'canEditPerspective',
      update: 'canEditPerspective',
      delete: 'canEditPerspective',
    },
    bind: {
      // User can view a perspective if they can view the map it belongs to
      canViewPerspective:
        'auth.id != null && (data.map.createdBy == auth.id || exists(shares, share => share.mapId == data.mapId && share.userId == auth.id))',
      // User can edit a perspective if they can edit the map it belongs to
      canEditPerspective:
        'auth.id != null && (data.map.createdBy == auth.id || exists(shares, share => share.mapId == data.mapId && share.userId == auth.id && share.permission == "edit"))',
    },
  },

  /**
   * Shares: Users can view shares for maps they own or shares that belong to them.
   * Users can create/update/delete shares for maps they own.
   */
  shares: {
    allow: {
      view: 'canViewShare',
      create: 'canCreateShare',
      update: 'canUpdateShare',
      delete: 'canDeleteShare',
    },
    bind: {
      // User can view a share if they own the map OR if the share is for them
      canViewShare: 'auth.id != null && (data.map.createdBy == auth.id || data.userId == auth.id)',
      // User can create a share if they own the map
      canCreateShare: 'auth.id != null && data.map.createdBy == auth.id',
      // User can update a share if they own the map
      canUpdateShare: 'auth.id != null && data.map.createdBy == auth.id',
      // User can delete a share if they own the map
      canDeleteShare: 'auth.id != null && data.map.createdBy == auth.id',
    },
  },
} satisfies InstantRules

export default rules

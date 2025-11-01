/**
 * InstantDB permission rules configuration.
 * 
 * Defines access control rules for entities in the application.
 * Uses rulesParams pattern to support sharing via share tokens.
 * 
 * @see https://www.instantdb.com/docs/permissions
 */

import type { InstantRules } from '@instantdb/react'

/**
 * Permission rules for InstantDB entities.
 * 
 * Uses rulesParams pattern for sharing:
 * - shareToken: Optional share token passed via URL for shared access
 * - Checks if user is owner OR has a valid share record
 * - Supports view/edit permissions based on share type
 */
const rules = {
  /**
   * Maps permissions:
   * - View: Owner OR has valid share (via shareToken param or userId match)
   * - Create: Authenticated users can create maps
   * - Update: Owner OR has edit share permission
   * - Delete: Owner only
   */
  maps: {
    allow: {
      view: "isOwner || hasShare",
      create: "auth.id != null",
      update: "isOwner || hasEditShare",
      delete: "isOwner",
    },
    bind: [
      // Owner check: user created the map
      ["isOwner", "auth.id != null && auth.id == data.createdBy"],
      // Share check: has valid share record (via shareToken param or userId)
      [
        "hasShare",
        "auth.id != null && (exists(shares, share => share.mapId == data.id && share.token != null && share.token == rulesParams.shareToken && share.acceptedAt != null) || exists(shares, share => share.mapId == data.id && share.userId == auth.id && share.acceptedAt != null))"
      ],
      // Edit share check: has share with edit permission
      [
        "hasEditShare",
        "auth.id != null && (exists(shares, share => share.mapId == data.id && share.token != null && share.token == rulesParams.shareToken && share.permission == 'edit' && share.acceptedAt != null) || exists(shares, share => share.mapId == data.id && share.userId == auth.id && share.permission == 'edit' && share.acceptedAt != null))"
      ],
    ],
  },

  /**
   * Concepts permissions:
   * - View: If user can view the parent map
   * - Create: If user can update the parent map (edit permission)
   * - Update: If user can update the parent map (edit permission)
   * - Delete: If user can update the parent map (edit permission)
   */
  concepts: {
    allow: {
      view: "canViewMap",
      create: "canEditMap",
      update: "canEditMap",
      delete: "canEditMap",
    },
    bind: [
      // Check if user can view the parent map
      [
        "canViewMap",
        "auth.id != null && exists(maps, map => map.id == data.mapId && (map.createdBy == auth.id || exists(shares, share => share.mapId == map.id && share.token != null && share.token == rulesParams.shareToken && share.acceptedAt != null) || exists(shares, share => share.mapId == map.id && share.userId == auth.id && share.acceptedAt != null)))"
      ],
      // Check if user can edit the parent map
      [
        "canEditMap",
        "auth.id != null && exists(maps, map => map.id == data.mapId && (map.createdBy == auth.id || exists(shares, share => share.mapId == map.id && share.token != null && share.token == rulesParams.shareToken && share.permission == 'edit' && share.acceptedAt != null) || exists(shares, share => share.mapId == map.id && share.userId == auth.id && share.permission == 'edit' && share.acceptedAt != null)))"
      ],
    ],
  },

  /**
   * Relationships permissions:
   * - View: If user can view the parent map
   * - Create: If user can update the parent map (edit permission)
   * - Update: If user can update the parent map (edit permission)
   * - Delete: If user can update the parent map (edit permission)
   */
  relationships: {
    allow: {
      view: "canViewMap",
      create: "canEditMap",
      update: "canEditMap",
      delete: "canEditMap",
    },
    bind: [
      // Check if user can view the parent map
      [
        "canViewMap",
        "auth.id != null && exists(maps, map => map.id == data.mapId && (map.createdBy == auth.id || exists(shares, share => share.mapId == map.id && share.token != null && share.token == rulesParams.shareToken && share.acceptedAt != null) || exists(shares, share => share.mapId == map.id && share.userId == auth.id && share.acceptedAt != null)))"
      ],
      // Check if user can edit the parent map
      [
        "canEditMap",
        "auth.id != null && exists(maps, map => map.id == data.mapId && (map.createdBy == auth.id || exists(shares, share => share.mapId == map.id && share.token != null && share.token == rulesParams.shareToken && share.permission == 'edit' && share.acceptedAt != null) || exists(shares, share => share.mapId == map.id && share.userId == auth.id && share.permission == 'edit' && share.acceptedAt != null)))"
      ],
    ],
  },

  /**
   * Perspectives permissions:
   * - View: If user can view the parent map
   * - Create: If user can update the parent map (edit permission)
   * - Update: If user can update the parent map (edit permission) OR is the creator
   * - Delete: If user can update the parent map (edit permission) OR is the creator
   */
  perspectives: {
    allow: {
      view: "canViewMap",
      create: "canEditMap",
      update: "canEditMap || isCreator",
      delete: "canEditMap || isCreator",
    },
    bind: [
      // Check if user can view the parent map
      [
        "canViewMap",
        "auth.id != null && exists(maps, map => map.id == data.mapId && (map.createdBy == auth.id || exists(shares, share => share.mapId == map.id && share.token != null && share.token == rulesParams.shareToken && share.acceptedAt != null) || exists(shares, share => share.mapId == map.id && share.userId == auth.id && share.acceptedAt != null)))"
      ],
      // Check if user can edit the parent map
      [
        "canEditMap",
        "auth.id != null && exists(maps, map => map.id == data.mapId && (map.createdBy == auth.id || exists(shares, share => share.mapId == map.id && share.token != null && share.token == rulesParams.shareToken && share.permission == 'edit' && share.acceptedAt != null) || exists(shares, share => share.mapId == map.id && share.userId == auth.id && share.permission == 'edit' && share.acceptedAt != null)))"
      ],
      // Check if user is the creator of the perspective
      ["isCreator", "auth.id != null && auth.id == data.createdBy"],
    ],
  },

  /**
   * Shares permissions:
   * - View: Owner of the map OR the share is for the current user
   * - Create: Owner of the map
   * - Update: Owner of the map
   * - Delete: Owner of the map
   */
  shares: {
    allow: {
      view: "isMapOwner || isShareRecipient",
      create: "isMapOwner",
      update: "isMapOwner",
      delete: "isMapOwner",
    },
    bind: [
      // Check if user owns the parent map
      [
        "isMapOwner",
        "auth.id != null && exists(maps, map => map.id == data.mapId && map.createdBy == auth.id)"
      ],
      // Check if the share is for the current user
      ["isShareRecipient", "auth.id != null && auth.id == data.userId"],
    ],
  },
} satisfies InstantRules

export default rules

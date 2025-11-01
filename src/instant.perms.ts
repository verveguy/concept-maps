/**
 * InstantDB permission rules configuration.
 * 
 * Defines access control rules for entities in the application.
 * Currently empty - permissions can be added here to control who can
 * view, create, update, or delete entities.
 * 
 * @see https://www.instantdb.com/docs/permissions
 */

import type { InstantRules } from '@instantdb/react'

/**
 * Permission rules for InstantDB entities.
 * 
 * Example structure:
 * ```
 * posts: {
 *   allow: {
 *     view: "true",
 *     create: "isOwner",
 *     update: "isOwner",
 *     delete: "isOwner",
 *   },
 *   bind: ["isOwner", "auth.id != null && auth.id == data.ownerId"],
 * }
 * ```
 */
const rules = {
  /**
   * Welcome to Instant's permission system!
   * Right now your rules are empty. To start filling them in, check out the docs:
   * https://www.instantdb.com/docs/permissions
   *
   * Here's an example to give you a feel:
   * posts: {
   *   allow: {
   *     view: "true",
   *     create: "isOwner",
   *     update: "isOwner",
   *     delete: "isOwner",
   *   },
   *   bind: ["isOwner", "auth.id != null && auth.id == data.ownerId"],
   * },
   */
} satisfies InstantRules

export default rules

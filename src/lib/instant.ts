/**
 * InstantDB client initialization and configuration.
 * Sets up the database connection and exports transaction utilities.
 * 
 * App ID should be set via VITE_INSTANTDB_APP_ID environment variable.
 */

import { init, tx, id } from '@instantdb/react'
import schema from '../instant.schema'
// Rules are configured in InstantDB dashboard, not passed here
// import rules from '../instant.perms'

/**
 * InstantDB application ID.
 * Must be set via VITE_INSTANTDB_APP_ID environment variable.
 */
const APP_ID = import.meta.env.VITE_INSTANTDB_APP_ID

if (!APP_ID) {
  throw new Error(
    'InstantDB App ID not found. Please set VITE_INSTANTDB_APP_ID in your .env file'
  )
}

/**
 * Initialized InstantDB database instance.
 * Use this to query and mutate data throughout the application.
 * Note: Rules are configured in the InstantDB dashboard, not in code.
 * The rules file is kept for reference but should be configured via the dashboard.
 */
export const db = init({
  appId: APP_ID,
  schema,
  // Rules are configured in InstantDB dashboard, not passed here
  // See: https://www.instantdb.com/docs/permissions
  // rules,
})

/**
 * Transaction helper for batch database operations.
 * Use to perform multiple mutations atomically.
 */
export { tx }

/**
 * ID generator for creating new entity IDs.
 * Generates unique identifiers for new entities.
 */
export { id }

/**
 * Application schema type exported for type safety.
 */
export type { AppSchema } from '../instant.schema'

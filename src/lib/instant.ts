/**
 * InstantDB client initialization and configuration.
 * Sets up the database connection and exports transaction utilities.
 * 
 * App ID: 58e6b84c-91aa-49d6-8159-ab1ecafb93f5
 */

import { init, tx, id } from '@instantdb/react'
import schema from '../instant.schema'
import rules from '../instant.perms'

/**
 * InstantDB application ID.
 * Can be overridden via VITE_INSTANTDB_APP_ID environment variable.
 */
const APP_ID = import.meta.env.VITE_INSTANTDB_APP_ID || '58e6b84c-91aa-49d6-8159-ab1ecafb93f5'

if (!APP_ID) {
  console.warn(
    'InstantDB credentials not found. Please set VITE_INSTANTDB_APP_ID in your .env file'
  )
}

/**
 * Initialized InstantDB database instance.
 * Use this to query and mutate data throughout the application.
 * Permissions are automatically applied to all queries.
 */
export const db = init({
  appId: APP_ID,
  schema,
  rules,
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

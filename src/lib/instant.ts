import { init, tx, id } from '@instantdb/react'
import schema from '../instant.schema'

// InstantDB App Configuration
// App ID: 58e6b84c-91aa-49d6-8159-ab1ecafb93f5
const APP_ID = import.meta.env.VITE_INSTANTDB_APP_ID || '58e6b84c-91aa-49d6-8159-ab1ecafb93f5'

if (!APP_ID) {
  console.warn(
    'InstantDB credentials not found. Please set VITE_INSTANTDB_APP_ID in your .env file'
  )
}

export const db = init({
  appId: APP_ID,
  schema,
})

export { tx, id }
export type { AppSchema } from '../instant.schema'

---
sidebar_position: 4
---

# InstantDB Integration

InstantDB serves as the complete backend for the application, handling data storage, real-time synchronization, and permissions.

## Setup

InstantDB is configured in `src/lib/instant.ts`:

```typescript
import { init } from '@instantdb/react'

const db = init({
  appId: import.meta.env.VITE_INSTANTDB_APP_ID,
  apiKey: import.meta.env.VITE_INSTANTDB_API_KEY,
})
```

## Schema Definition

The schema is defined in `src/instant.schema.ts` and includes:

- **Entities**: Maps, concepts, relationships, perspectives, shares, shareInvitations
- **Links**: Relationships between entities (e.g., concepts → maps)
- **Rooms**: Presence tracking for real-time collaboration

## Permissions

Permissions are defined in `src/instant.perms.ts`:

- **Map Owners**: Full control over their maps
- **Shared Users**: Based on share permission (view/edit)
- **Pending Invitations**: Access based on invitation status

## Querying Data

Use `useQuery()` hook:

```typescript
const { data, isLoading } = useQuery({
  concepts: {
    $: { where: { mapId } }
  },
  relationships: {
    $: { where: { mapId } }
  }
})
```

## Mutating Data

Use `useTransact()` hook:

```typescript
const { transact } = useTransact()

// Create
transact.insert({ concepts: { mapId, label: 'New Concept' } })

// Update
transact.update({ concepts: { id: conceptId, label: 'Updated' } })

// Delete
transact.delete({ concepts: { id: conceptId } })
```

## Real-time Updates

All queries automatically update when data changes:

- Local changes: Immediate optimistic updates
- Remote changes: Synchronized via InstantDB subscriptions
- Conflict resolution: Last-write-wins

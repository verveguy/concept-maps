---
sidebar_position: 5
---

# Real-time Synchronization

The application provides real-time collaboration through InstantDB's automatic synchronization.

## How It Works

1. **Local Changes**: When a user makes a change, it's immediately applied locally (optimistic update)
2. **Sync**: InstantDB syncs the change to the server
3. **Broadcast**: The server broadcasts the change to all connected clients
4. **Update**: All clients receive the update and apply it

## Presence System

The presence system tracks where users are working:

- **Current User**: Tracked via `usePresence()` hook
- **Other Users**: Visible via `otherUsersPresence` from `usePresence()`
- **Indicators**: Avatars, cursors, editing highlights

## Conflict Resolution

InstantDB uses **last-write-wins** semantics:

- Last update wins
- Timestamps determine order
- Conflicts are rare due to collaborative UI patterns

## Performance Considerations

- **Optimistic Updates**: UI updates immediately
- **Debouncing**: Some operations are debounced (e.g., position updates)
- **Selective Updates**: Only subscribed queries receive updates
- **Batching**: Multiple mutations can be batched

## Limitations

- No conflict merging (last-write-wins only)
- Requires internet connection
- All data stored in InstantDB

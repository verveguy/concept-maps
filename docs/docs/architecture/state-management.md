---
sidebar_position: 3
---

# State Management

The application uses a hybrid state management approach: InstantDB for data state and Zustand for UI state.

## Data State (InstantDB)

All persistent data is managed by InstantDB:

- **Access**: Via `useQuery()` hooks
- **Updates**: Via `useTransact()` hooks
- **Real-time**: Automatic synchronization
- **Persistence**: Handled by InstantDB

### Example

```typescript
// Query data
const { data } = useQuery({
  concepts: {
    $: { where: { mapId } }
  }
})

// Mutate data
const { transact } = useTransact()
transact.update({ concepts: { id: conceptId, label: newLabel } })
```

## UI State (Zustand)

Local UI state is managed with Zustand stores:

### UI Store (`uiStore.ts`)

Manages UI state like:
- Selected concept/relationship IDs
- Editor open/closed states
- View mode (graph/text)

### Map Store (`mapStore.ts`)

Manages map-specific UI state:
- Current map ID
- Current perspective ID
- Layout preferences

## State Flow

1. **Initial Load**: `useQuery()` fetches data from InstantDB
2. **User Action**: Component calls action hook
3. **Mutation**: Action uses `useTransact()` to update InstantDB
4. **Sync**: InstantDB syncs to all clients
5. **Update**: `useQuery()` hooks receive updates automatically
6. **Render**: Components re-render with new data

## Benefits

- **Separation of Concerns**: Data vs UI state
- **Real-time Sync**: Automatic via InstantDB
- **Type Safety**: Full TypeScript support
- **Performance**: Optimistic updates possible

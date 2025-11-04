# InstantDB Best Practices Guide

This document captures key learnings and patterns for working with InstantDB, based on extensive work refactoring the concept-mapping application.

## Schema Design

### 1. Use Links, Not Foreign Keys
- **NEVER** store foreign key IDs as attributes (e.g., `createdBy: i.string()`, `mapId: i.string()`)
- **ALWAYS** use links instead: 
  ```typescript
  mapsCreator: {
    forward: {
      on: 'maps',
      has: 'one',
      label: 'creator',
    },
    reverse: {
      on: '$users',
      has: 'many',
      label: 'createdMaps',
    },
  }
  ```
- Links are bidirectional and provide type safety
- InstantDB handles referential integrity automatically

### 2. Link Direction and Cardinality
- `has: 'one'` on forward = single entity points to one related entity (e.g., concept → map)
- `has: 'many'` on reverse = one entity can have many related entities (e.g., map → concepts)
- For one-to-many relationships: forward `has: 'one'`, reverse `has: 'many'`
- For many-to-many relationships: forward `has: 'many'`, reverse `has: 'many'`
- Set `onDelete: 'cascade'` when child entities should be deleted with parent

### 3. Denormalization for Permissions
- When CEL (Common Expression Language) can't correlate arrays (e.g., checking if user has specific share permission), denormalize:
- Add direct links: 
  ```typescript
  mapsWritePermissions: {
    forward: {
      on: 'maps',
      has: 'many',
      label: 'writePermissions',
    },
    reverse: {
      on: '$users',
      has: 'many',
      label: 'writeAccessMaps',
    },
  }
  ```
- Maintain these links when shares are created/updated/revoked using `link()` and `unlink()`

## Queries

### 1. Always Include Links Needed for Traversal
- When transforming data uses `entity.link?.id`, include that link in the query:
  ```typescript
  db.useQuery({
    maps: {
      $: { where: { id: currentMapId } },
      concepts: {
        map: {
          creator: {},
          readPermissions: {},
          writePermissions: {},
        }, // Include for permission checks
      },
      relationships: {
        map: {
          creator: {},
          readPermissions: {},
          writePermissions: {},
        },
        fromConcept: {}, // Include if you need fromConceptId
        toConcept: {},   // Include if you need toConceptId
      },
    },
  })
  ```

### 2. Include Permission Links for Permission Checks
- If permissions traverse links (e.g., `data.ref("map.creator.id")`), include those links:
- For concepts: include `map: { creator: {}, readPermissions: {}, writePermissions: {} }`
- For relationships: include `map: { creator: {}, readPermissions: {}, writePermissions: {} }`
- For shares: include `map: { creator: {} }` and `creator: {}` if checking share creator

### 3. Query Structure
- Prefer querying through parent entities when possible: `maps: { concepts: {} }` instead of `concepts: { $: { where: { mapId: X } } }`
- This ensures permission checks work correctly and follows InstantDB's recommended patterns

## Mutations

### 1. Creating Entities with Links
- Use `.link()` method, NOT attributes:
  ```typescript
  await db.transact([
    tx.concepts[conceptId]
      .update({ label: 'My Concept', ... })
      .link({ map: mapId }) // ✅ Correct - link, not attribute
  ])
  ```
- **NEVER** do: `update({ mapId: mapId })` ❌

### 2. Updating Links
- Use `.link()` to add/change links:
  ```typescript
  tx.shares[shareId].link({ map: mapId, creator: creatorId })
  ```
- Use `.unlink()` to remove links:
  ```typescript
  tx.maps[mapId].unlink({ writePermissions: userId })
  ```

### 3. Atomic Transactions
- Combine related operations in a single `db.transact()` call:
  ```typescript
  await db.transact([
    tx.shareInvitations[invitationId].update({ status: 'accepted' }),
    tx.shares[shareId]
      .update({ status: 'active' })
      .link({ user: userId, map: mapId }),
    tx.maps[mapId].link({ writePermissions: userId }),
  ])
  ```
- This ensures atomicity and prevents permission checks from failing due to intermediate states

## Permissions (CEL - Common Expression Language)

### 1. Link Traversal with `data.ref()`
- `data.ref()` always returns an array-like structure, even for single-valued links
- **ALWAYS** use `in` operator, never `==`:
  ```typescript
  // ✅ Correct
  'auth.id != null && auth.id in data.ref("creator.id")'
  'auth.id != null && auth.id in data.ref("map.creator.id")'
  
  // ❌ Wrong
  'auth.id == data.ref("creator.id")'
  ```

### 2. Single vs Multi-Valued Links
- Both use `in` operator (no difference in syntax)
- `data.ref("creator.id")` - single creator link
- `data.ref("writePermissions.id")` - multiple users link
- Both: `auth.id in data.ref("...")`

### 3. Double Link Traversal
- Can traverse multiple links: `data.ref("map.creator.id")` works
- But for permission checks, consider denormalizing if it becomes complex
- Example: Add `creator` link directly to `shares` entity instead of `data.ref("map.creator.id")`

### 4. Array Correlation Limitation
- CEL cannot correlate arrays (e.g., "find share where user matches AND permission matches")
- Solution: Denormalize permissions as separate link sets (`writePermissions`, `readPermissions`)
- Example: Instead of checking `auth.id in data.ref("shares.user.id") && "edit" in data.ref("shares.permission")`, use `auth.id in data.ref("writePermissions.id")`

### 5. $users View Permission
- Always include `$users: { allow: { view: 'auth.id != null' } }` to enable viewing linked user entities in nested queries
- This is required when queries traverse to user entities (e.g., `creator: {}`)

### 6. Permission Bind Rules
- Use `bind` to create reusable permission expressions:
  ```typescript
  bind: [
    'isOwner',
    'auth.id != null && auth.id in data.ref("creator.id")',
    'hasReadPermission',
    'auth.id != null && auth.id in data.ref("readPermissions.id")',
    'isOwnerOrReader',
    'isOwner || hasReadPermission || hasWritePermission',
  ]
  ```
- Then reference in `allow` rules: `view: 'isOwnerOrReader'`

## Common Patterns

### Pattern 1: Query with Transformation
```typescript
const { data } = db.useQuery({
  maps: {
    $: { where: { id: mapId } },
    concepts: {
      map: {
        creator: {},
        readPermissions: {},
        writePermissions: {},
      },
    },
  },
})

const concepts = data?.maps?.[0]?.concepts?.map((c: any) => ({
  id: c.id,
  mapId: c.map?.id || mapId, // Access via link
  label: c.label,
})) || []
```

### Pattern 2: Create with Links
```typescript
const conceptId = id()
await db.transact([
  tx.concepts[conceptId]
    .update({
      label: 'My Concept',
      positionX: 100,
      positionY: 200,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .link({ map: mapId })
])
```

### Pattern 3: Update Permission Links (Idempotent)
```typescript
// Idempotent: unlink from old, link to new
await db.transact([
  tx.maps[mapId].unlink({ writePermissions: userId }),
  tx.maps[mapId].link({ readPermissions: userId }),
])
```

### Pattern 4: Query Relationships with Concepts
```typescript
const { data } = db.useQuery({
  maps: {
    $: { where: { id: mapId } },
    relationships: {
      map: {
        creator: {},
        readPermissions: {},
        writePermissions: {},
      },
      fromConcept: {}, // Required for fromConceptId
      toConcept: {},   // Required for toConceptId
    },
  },
})

const relationships = data?.maps?.[0]?.relationships?.map((r: any) => ({
  id: r.id,
  mapId: r.map?.id || mapId,
  fromConceptId: r.fromConcept?.id || '',
  toConceptId: r.toConcept?.id || '',
  primaryLabel: r.primaryLabel,
})) || []
```

## Common Pitfalls

1. **Missing links in queries**: If transformation uses `entity.link?.id`, query must include that link
   - Symptom: `fromConceptId: ""` or `toConceptId: ""` in transformed data
   - Fix: Add `fromConcept: {}` and `toConcept: {}` to relationship queries

2. **Using `==` instead of `in`**: Always use `in` for `data.ref()` comparisons
   - Symptom: Permission denied errors even when user should have access
   - Fix: Change `auth.id == data.ref("creator.id")` to `auth.id in data.ref("creator.id")`

3. **Foreign keys as attributes**: Never store `mapId`, `userId`, etc. as attributes - use links
   - Symptom: `QueryValidationError: Attribute or link 'mapId' does not exist`
   - Fix: Use `.link({ map: mapId })` instead of `update({ mapId: mapId })`

4. **Not including permission links**: If permissions check `map.creator.id`, query must include `map: { creator: {} }`
   - Symptom: Permission denied errors
   - Fix: Add permission links to query structure

5. **Incomplete transactions**: Group related operations (updates + link changes) in single transaction
   - Symptom: Permission checks fail because links aren't set yet
   - Fix: Combine all related operations in one `db.transact()` call

6. **Incorrect link cardinality**: Using `has: 'many'` when it should be `has: 'one'`
   - Symptom: `entity.link` is an array when it should be a single object
   - Fix: Check schema and correct `has` value (forward vs reverse)

## Debugging Tips

- Check console for `fromConceptId: ""` or `toConceptId: ""` - indicates missing links in query
- Permission denied errors often mean missing links needed for permission traversal
- Verify schema matches query structure (correct `has: 'one'` vs `has: 'many'`)
- Add debug logging to inspect raw query data: `console.log('Raw data:', data?.maps?.[0]?.relationships)`
- Check that `$users` has view permission if queries include `creator: {}` or `user: {}`

## References

- [InstantDB Schema Documentation](https://www.instantdb.com/docs/modeling-data)
- [InstantDB Permissions Documentation](https://www.instantdb.com/docs/permissions)
- [InstantDB Query Documentation](https://www.instantdb.com/docs/queries)
- [InstantDB Mutations Documentation](https://www.instantdb.com/docs/instaml#link-data)


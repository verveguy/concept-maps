---
sidebar_position: 2
---

# Data Model

The Concept Mapping Tool uses InstantDB as its data store. All data is stored as entities with relationships.

## Entity Types

### Maps

Maps are the top-level containers:

```typescript
interface Map {
  id: string
  name: string
  createdBy: string
  createdAt: number
  updatedAt: number
}
```

### Concepts

Concepts represent nodes in the concept map:

```typescript
interface Concept {
  id: string
  mapId: string
  label: string
  positionX: number
  positionY: number
  notes?: string
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
}
```

### Relationships

Relationships connect concepts:

```typescript
interface Relationship {
  id: string
  mapId: string
  fromConceptId: string
  toConceptId: string
  primaryLabel: string
  reverseLabel?: string
  notes?: string
  metadata?: Record<string, unknown>
  createdAt: number
  updatedAt: number
}
```

### Perspectives

Perspectives define filtered views:

```typescript
interface Perspective {
  id: string
  mapId: string
  name: string
  conceptIds: string[]
  relationshipIds: string[]
  createdBy: string
  createdAt: number
}
```

### Shares

Shares control access:

```typescript
interface Share {
  id: string
  mapId: string
  userId: string
  permission: 'view' | 'edit'
  createdAt: number
}
```

## Relationships

- Maps → Concepts (one-to-many)
- Maps → Relationships (one-to-many)
- Maps → Perspectives (one-to-many)
- Maps → Shares (one-to-many)
- Concepts → Relationships (via fromConceptId/toConceptId)

## Schema Definition

The schema is defined in `src/instant.schema.ts` and synchronized with InstantDB.

import { db } from '@/lib/instant'

// Define schema for InstantDB
// This will be used when you set up your InstantDB app
export const schema = {
  maps: {
    name: { type: 'string' },
    createdBy: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
  },
  concepts: {
    mapId: { type: 'string' },
    label: { type: 'string' },
    positionX: { type: 'number' },
    positionY: { type: 'number' },
    notes: { type: 'string' },
    metadata: { type: 'string' }, // JSON string
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
  },
  relationships: {
    mapId: { type: 'string' },
    fromConceptId: { type: 'string' },
    toConceptId: { type: 'string' },
    primaryLabel: { type: 'string' },
    reverseLabel: { type: 'string' },
    notes: { type: 'string' },
    metadata: { type: 'string' }, // JSON string
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
  },
  perspectives: {
    mapId: { type: 'string' },
    name: { type: 'string' },
    conceptIds: { type: 'string' }, // JSON array string
    relationshipIds: { type: 'string' }, // JSON array string
    createdBy: { type: 'string' },
    createdAt: { type: 'number' },
  },
  shares: {
    mapId: { type: 'string' },
    userId: { type: 'string' },
    permission: { type: 'string' }, // 'view' | 'edit'
    createdAt: { type: 'number' },
  },
}

// Note: This schema definition is for reference.
// The actual schema should be defined in your InstantDB dashboard.
// Use this as a guide when setting up your InstantDB app schema.

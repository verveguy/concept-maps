export interface Map {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Concept {
  id: string
  mapId: string
  label: string
  position: { x: number; y: number }
  notes: string // markdown
  metadata: Record<string, unknown> // flexible key-value pairs
  createdAt: Date
  updatedAt: Date
}

export interface Relationship {
  id: string
  mapId: string
  fromConceptId: string
  toConceptId: string
  primaryLabel: string // direction: from -> to
  reverseLabel: string // direction: to -> from
  notes: string // markdown
  metadata: Record<string, unknown> // flexible key-value pairs
  createdAt: Date
  updatedAt: Date
}

export interface Perspective {
  id: string
  mapId: string
  name: string
  conceptIds: string[]
  relationshipIds: string[]
  createdBy: string
  createdAt: Date
}

export interface Share {
  id: string
  mapId: string
  userId: string
  permission: 'view' | 'edit'
  createdAt: Date
  acceptedAt: Date | null // Timestamp when user accepted the share
}

---
sidebar_position: 2
---

# ConceptNode

The `ConceptNode` component is a custom React Flow node that represents a concept in the concept map.

## Overview

`ConceptNode` renders a visual node on the canvas with:

- Editable label (double-click to edit)
- Multiple connection handles (top and bottom)
- Notes display (expandable)
- Metadata display
- Presence indicators
- Visual styling based on metadata

## Props

```typescript
interface ConceptNodeData {
  conceptId: string
  label: string
  notes?: string
  metadata?: Record<string, unknown>
  position?: { x: number; y: number }
}
```

## Usage

```tsx
import { ConceptNode } from '@/components/concept/ConceptNode'

// ConceptNode is registered as a custom node type with React Flow
// Used automatically when rendering concept nodes
```

## Features

- **Inline Editing**: Double-click to edit the label
- **Multiple Handles**: Supports multiple edges between the same nodes
- **Notes**: Expandable notes section with Markdown rendering
- **Metadata**: Custom key-value pairs
- **Presence**: Shows avatars of users viewing/editing the concept
- **Styling**: Customizable colors via metadata

## Related Components

- [ConceptEditor](/docs/developing/components/concept-editor): Full-featured editor panel
- [ConceptMapCanvas](/docs/developing/components/concept-map-canvas): Container component

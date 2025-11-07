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
- **Triple Entry Mode**: When editing a label, entering text in the format "Noun verb phrase Noun" automatically creates a relationship and new concept
- **Multiple Handles**: Supports multiple edges between the same nodes
- **Notes**: Expandable notes section with Markdown rendering
- **Metadata**: Custom key-value pairs
- **Presence**: Shows avatars of users viewing/editing the concept
- **Styling**: Customizable colors via metadata

## Triple Entry Mode

When a user edits a concept label and enters text matching the triple pattern (e.g., "Diagrams explain Architecture"), the component:

1. Parses the input using `parseTripleText()` from `@/lib/textRepresentation`
2. Updates the current concept label to the first noun
3. Creates a new relationship with the verb phrase
4. Creates a new concept with the second noun
5. Sets `shouldStartEditing: true` on the new concept node to automatically enter edit mode

This enables rapid keyboard-based diagram creation without mouse interaction.

## Related Components

- [ConceptEditor](/docs/developing/components/concept-editor): Full-featured editor panel
- [ConceptMapCanvas](/docs/developing/components/concept-map-canvas): Container component

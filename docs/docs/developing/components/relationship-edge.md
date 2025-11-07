---
sidebar_position: 4
---

# RelationshipEdge

The `RelationshipEdge` component is a custom React Flow edge that represents relationships between concepts.

## Overview

`RelationshipEdge` renders a visual connection between concept nodes with:

- Editable labels
- Bidirectional label support (primary and reverse)
- Notes display
- Custom styling

## Props

The edge receives data through React Flow's edge data structure:

```typescript
interface RelationshipEdgeData {
  relationshipId: string
  primaryLabel: string
  reverseLabel?: string
  notes?: string
}
```

## Features

- **Label Editing**: Click to edit labels inline
- **Bidirectional Labels**: Support for different labels in each direction
- **Notes**: Expandable notes section
- **Custom Styling**: Configurable appearance

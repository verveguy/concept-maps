---
sidebar_position: 5
---

# RelationshipEditor

The `RelationshipEditor` component provides a full-featured editing panel for relationship properties.

## Overview

`RelationshipEditor` displays and allows editing of:

- Primary label
- Reverse label
- Notes (Markdown editor)
- Metadata (key-value pairs)

## Props

```typescript
interface RelationshipEditorProps {
  relationshipId: string
  onClose?: () => void
}
```

## Usage

```tsx
import { RelationshipEditor } from '@/components/relationship/RelationshipEditor'

<RelationshipEditor relationshipId={selectedRelationshipId} onClose={handleClose} />
```

## Features

- Real-time updates to InstantDB
- Markdown preview for notes
- Metadata editor
- Permission-based editing

---
sidebar_position: 3
---

# ConceptEditor

The `ConceptEditor` component provides a full-featured editing panel for concept properties.

## Overview

`ConceptEditor` displays and allows editing of:

- Concept label
- Notes (Markdown editor)
- Metadata (key-value pairs)
- Style properties (colors, border style)

## Props

```typescript
interface ConceptEditorProps {
  conceptId: string
  onClose?: () => void
}
```

## Usage

```tsx
import { ConceptEditor } from '@/components/concept/ConceptEditor'

<ConceptEditor conceptId={selectedConceptId} onClose={handleClose} />
```

## Features

- Real-time updates to InstantDB
- Markdown preview for notes
- Metadata editor with add/remove functionality
- Style customization
- Permission-based editing (read-only if no write access)

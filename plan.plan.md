<!-- e644740f-3cf9-44f8-8ecf-8e3ccd41a589 a1561f49-6c70-42d3-aac5-2d5b4b7e99b4 -->
# Concept Mapping Tool - Implementation Plan

## Architectural Principles

### State Management Strategy

- **Model State**: All Concepts, Relationships, Maps, Perspectives stored in InstantDB
- **Data Access**: Use `db.useQuery()` hooks for real-time model state (automatic updates)
- **Mutations**: Use `db.transact()` with `tx` objects for all model updates
- **UI State**: Use Zustand stores for local UI state only (selectedConceptId, viewMode, sidebarOpen, etc.)
- **No Custom Sync**: Text and Graph views both read/write directly to InstantDB - no custom sync logic needed
- **Real-time**: Automatic via InstantDB `db.useQuery()` subscriptions

## Phase 1: Project Setup & Foundation

### 1.1 Project Initialization

- Initialize Vite + React 19 project with TypeScript
- Configure pnpm workspace
- Set up Tailwind CSS and shadcn/ui
- Configure ESLint, Prettier, TypeScript strict mode
- Add Zustand for UI state management

**Files:**

- `package.json` - Dependencies including Zustand
- `vite.config.ts`
- `tsconfig.json`
- `tailwind.config.js`
- `components.json` (shadcn/ui config)
- `.gitignore`

### 1.2 InstantDB Setup

- Create InstantDB app
- Define schema entities:
  - `Map`: id, name, createdBy, createdAt, updatedAt
  - `Concept`: id, mapId, label, positionX, positionY, notes (markdown), metadata (json string)
  - `Relationship`: id, mapId, fromConceptId, toConceptId, primaryLabel, reverseLabel, notes (markdown), metadata (json string)
  - `Perspective`: id, mapId, name, conceptIds (json string), relationshipIds (json string), createdBy, createdAt
  - `Share`: id, mapId, userId, permission (view/edit), createdAt

**Files:**

- `src/lib/instant.ts` - InstantDB client setup
- `src/lib/schema.ts` - TypeScript types for entities
- `instant/index.ts` - InstantDB schema definition

### 1.3 Zustand UI State Stores

- Create Zustand stores for UI state management
- Stores: viewMode, selectedConceptId, selectedRelationshipId, sidebarOpen, etc.

**Files:**

- `src/stores/uiStore.ts` - Main UI state store
- `src/stores/mapStore.ts` - Map-specific UI state (currentMapId, currentPerspectiveId)

### 1.4 Basic UI Structure

- Set up layout with sidebar (maps/perspectives browser) and main content area
- Implement authentication UI (login/signup using InstantDB auth)
- Create basic routing structure

**Files:**

- `src/App.tsx` - Main app component
- `src/components/layout/AppLayout.tsx` - Main layout
- `src/components/layout/Sidebar.tsx` - Maps/perspectives browser
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/pages/MapPage.tsx` - Main map editor page

## Phase 2: Core Data Management

### 2.1 InstantDB Data Hooks

- Create hooks using `db.useQuery()` for model state access
- Real-time updates handled automatically by InstantDB
- No custom subscription logic needed

**Files:**

- `src/hooks/useMap.ts` - `db.useQuery()` for map data
- `src/hooks/useMaps.ts` - `db.useQuery()` for all maps (for sidebar)
- `src/hooks/useConcepts.ts` - `db.useQuery()` for concepts (filtered by mapId/perspective)
- `src/hooks/useRelationships.ts` - `db.useQuery()` for relationships (filtered by mapId/perspective)
- `src/hooks/usePerspectives.ts` - `db.useQuery()` for perspectives

### 2.2 Mutation Hooks

- Create hooks using `db.transact()` with `tx` objects for CRUD operations
- All mutations go directly to InstantDB
- Use `tx.entity[id()].update()` for creates, `tx.entity[id].update()`/`delete()` for updates/deletes

**Files:**

- `src/hooks/useConceptActions.ts` - `db.transact()` with `tx.concepts` for concept CRUD
- `src/hooks/useRelationshipActions.ts` - `db.transact()` with `tx.relationships` for relationship CRUD
- `src/hooks/useMapActions.ts` - `db.transact()` with `tx.maps` for map CRUD
- `src/hooks/usePerspectiveActions.ts` - `db.transact()` with `tx.perspectives` for perspective CRUD

### 2.3 Data Transformation Utilities

- Helper functions for transforming InstantDB data to UI formats
- React Flow node/edge conversion
- Text representation generation

**Files:**

- `src/lib/data.ts` - Data transformation utilities
- `src/lib/reactFlowTypes.ts` - Type definitions for React Flow

## Phase 3: Graph View Implementation

### 3.1 React Flow Integration

- Set up React Flow canvas
- Configure custom node types (ConceptNode)
- Configure custom edge types (RelationshipEdge)
- Implement zoom/pan controls

**Files:**

- `src/components/graph/ConceptMapCanvas.tsx` - Main React Flow component
- `src/components/graph/ReactFlowConfig.ts` - Flow configuration
- `src/lib/reactFlowTypes.ts` - Type definitions

### 3.2 Node Customization

- Rich nodes with expandable metadata panels
- Display concept label, notes preview
- Click to expand/collapse metadata
- Visual indicators for editing state (from presence)

**Files:**

- `src/components/concept/ConceptNode.tsx` - React Flow node component
- `src/components/concept/ConceptMetadataPanel.tsx` - Expandable metadata view

### 3.3 Edge Customization

- Customizable edge styles (dashed, colored, curved vs straight)
- Display relationship labels
- Click to select/edit relationship

**Files:**

- `src/components/relationship/RelationshipEdge.tsx` - React Flow edge component

### 3.4 Layout Management

- Manual drag-and-drop positioning (updates position via `db.transact()`)
- Automatic layout algorithms (force-directed, hierarchical)
- Layout controls UI

**Files:**

- `src/lib/layouts/forceDirected.ts` - Force-directed layout
- `src/lib/layouts/hierarchical.ts` - Hierarchical layout
- `src/components/graph/LayoutControls.tsx` - Layout selection UI

## Phase 4: Structured Text View

### 4.1 Text Representation Format

- Create structured text representation format
- Display Concept->Relationship->Concept triples as editable text
- Make Concepts and Relationships clickable links
- Format: "Concept Label [relationship label] Concept Label"
- Both views read/write directly to InstantDB (no sync logic needed)

**Files:**

- `src/lib/textRepresentation.ts` - Parser/serializer for text view (generates text from InstantDB data)
- `src/components/text/StructuredTextView.tsx` - Text view component (reads from `db.useQuery()`)
- `src/components/text/EditableTriple.tsx` - Individual triple editor (uses `db.transact()`)

### 4.2 Text Editor Features

- Inline editing of concept labels (updates via `db.transact()`)
- Inline editing of relationship labels (updates via `db.transact()`)
- Add/remove triples from text view (creates/deletes via `db.transact()`)
- Navigate to graph view when clicking links (updates Zustand UI state)

**Files:**

- `src/components/text/StructuredTextView.tsx` - Enhanced with editing capabilities

## Phase 5: Collaboration Features

### 5.1 Presence Implementation

- Set up InstantDB presence tracking
- Display colored cursors with usernames
- Show avatars/icons at cursor positions
- Highlight nodes/areas being edited

**Files:**

- `src/hooks/usePresence.ts` - Presence tracking hook (uses InstantDB presence API)
- `src/components/presence/PresenceCursor.tsx` - Cursor component
- `src/components/presence/PresenceAvatar.tsx` - Avatar component
- `src/components/presence/EditingHighlight.tsx` - Highlight overlay

### 5.2 Real-time Updates

- Handled automatically by InstantDB `db.useQuery()` hooks
- No additional subscription logic needed
- UI updates automatically when InstantDB data changes

### 5.3 Sharing & Permissions

- Implement share link generation
- Handle view/edit permissions
- UI for sharing management

**Files:**

- `src/components/share/ShareDialog.tsx` - Sharing UI
- `src/hooks/useSharing.ts` - Share management hooks (`db.useQuery()`/`db.transact()`)

## Phase 6: Advanced Features

### 6.1 Perspectives

- Create/edit perspectives (filtered subsets)
- Switch between perspectives (updates Zustand UI state)
- Display perspective in sidebar
- Filter `db.useQuery()` hooks by perspective conceptIds/relationshipIds

**Files:**

- `src/components/perspective/PerspectiveEditor.tsx`
- `src/components/perspective/PerspectiveSelector.tsx`

### 6.2 Notes/Documentation (Markdown)

- Markdown editor for Concept notes (updates via `db.transact()`)
- Markdown editor for Relationship notes (updates via `db.transact()`)
- Preview mode for notes

**Files:**

- `src/components/notes/MarkdownEditor.tsx` - Markdown editor component
- `src/components/notes/MarkdownViewer.tsx` - Rendered markdown display

### 6.3 Search & Navigation

- Search concepts by name/metadata (client-side filtering of `db.useQuery()` results)
- Filter by tags/metadata (client-side filtering)
- Navigation breadcrumbs/path highlights

**Files:**

- `src/components/search/SearchBar.tsx`
- `src/components/search/FilterPanel.tsx`
- `src/lib/search.ts` - Search utilities (filters InstantDB data)
- `src/components/navigation/Breadcrumbs.tsx`

### 6.4 Version History

- Create version snapshots (export current InstantDB state to JSON)
- Manual snapshot creation
- Auto-snapshot on navigation away
- Git-friendly JSON export format

**Files:**

- `src/lib/versioning.ts` - Version snapshot logic
- `src/components/version/VersionHistory.tsx` - Version UI
- `src/lib/export.ts` - JSON export utilities

### 6.5 Export/Import

- Export to JSON (exports InstantDB state)
- Export to SVG (renders React Flow to SVG)
- Import from JSON (bulk insert via `db.transact()`)

**Files:**

- `src/lib/export.ts` - Export functions
- `src/lib/import.ts` - Import functions
- `src/components/export/ExportDialog.tsx`
- `src/components/import/ImportDialog.tsx`

## Key Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "reactflow": "^11.11.0",
    "@instantdb/react": "^0.10.0",
    "zustand": "^4.5.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "zod": "^3.22.0",
    "date-fns": "^3.0.0"
  }
}
```

## File Structure

```
src/
├── components/
│   ├── auth/
│   ├── concept/
│   ├── relationship/
│   ├── graph/
│   ├── text/
│   ├── presence/
│   ├── share/
│   ├── perspective/
│   ├── notes/
│   ├── search/
│   ├── navigation/
│   ├── export/
│   ├── import/
│   ├── version/
│   └── layout/
├── hooks/
│   ├── useMap.ts (db.useQuery)
│   ├── useMaps.ts (db.useQuery)
│   ├── useConcepts.ts (db.useQuery)
│   ├── useRelationships.ts (db.useQuery)
│   ├── usePerspectives.ts (db.useQuery)
│   ├── useConceptActions.ts (db.transact)
│   ├── useRelationshipActions.ts (db.transact)
│   ├── useMapActions.ts (db.transact)
│   ├── usePerspectiveActions.ts (db.transact)
│   ├── usePresence.ts (InstantDB presence API)
│   └── useSharing.ts (db.useQuery/db.transact)
├── stores/
│   ├── uiStore.ts (Zustand)
│   └── mapStore.ts (Zustand)
├── lib/
│   ├── instant.ts
│   ├── schema.ts
│   ├── data.ts
│   ├── textRepresentation.ts
│   ├── layouts/
│   ├── search.ts
│   ├── versioning.ts
│   ├── export.ts
│   └── import.ts
├── pages/
│   └── MapPage.tsx
├── App.tsx
└── main.tsx
```

## Implementation Notes

1. **No Custom Sync Logic**: Text and Graph views both use `db.useQuery()` and `db.transact()` - InstantDB handles synchronization automatically
2. **Real-time Updates**: Automatic via `db.useQuery()` subscriptions
3. **UI State Only**: Zustand stores only hold UI state (selectedConceptId, viewMode, sidebarOpen, etc.), never model state
4. **All Mutations**: Use `db.transact()` with `tx` objects for all model updates (create, update, delete)
   - Creates: `tx.entity[id()].update({ ... })`
   - Updates: `tx.entity[id].update({ ... })`
   - Deletes: `tx.entity[id].delete()`
5. **Presence**: Use InstantDB presence API to track cursor positions and editing state
6. **Perspectives**: Filter `db.useQuery()` results by perspective conceptIds/relationshipIds arrays
7. **InstantDB Schema**: Store position as `positionX`/`positionY` numbers, metadata as JSON strings, conceptIds/relationshipIds as JSON strings


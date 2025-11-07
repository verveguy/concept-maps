# Project Questions & Answers

This document contains questions and clarifications about the Concept Mapping Tool project requirements and design decisions.

## Status

This document reflects the original design decisions and requirements. Most features described here have been implemented. See `implementation-plan.md` for current completion status.

**Implemented Features**:
- ✅ Two-way editing (graph ↔ text)
- ✅ Collaborative editing with real-time sync
- ✅ Presence cursors, avatars, and editing highlights
- ✅ Perspectives with editing support
- ✅ Search functionality
- ✅ Sharing and permissions
- ✅ Markdown notes for concepts and relationships
- ✅ Layout algorithms (force-directed, hierarchical)

**Planned Features**:
- ⏳ Export/Import (JSON, SVG)
- ⏳ Version History (snapshots)
- ⏳ Comments system

## Data Model & Schema

### Concept Map Structure
- **Approach**: Separate entities (normalized)
- **Storage**: Concepts and Relationships stored as separate entities in InstantDB
- **Perspectives**: Allow defined subsets of the global concept map to be worked on

### Metadata Properties
- **Schema Type**: Hybrid (some fixed + custom fields)
- Concepts support flexible metadata while maintaining core required fields

### Relationships
- **Richness**: Relationships are rich entities in their own right
- **Direction**: Logically bi-directional but with different labels for each direction
- **Primary Direction**: Important for default text representation
- **Future**: May need to render perspectives starting from a given Concept, following relationships in non-primary direction

## Text View

### Format
- **Not Markdown**: Structured text representation, not Markdown
- **Editable**: Simple structured text with clickable links to Concepts and Relationships
- **Format**: "Concept Label [relationship label] Concept Label"
- **Notes**: Markdown IS used for Notes/Documentation support for each Concept and Relationship

### Synchronization
- **Conflict Resolution**: Let InstantDB handle conflicts automatically
- **No Custom Sync**: Both text and graph views read/write directly to InstantDB

### Text Editor Features
- **Type**: Structured text editor (not Markdown editor)
- **Features**: Inline editing, clickable links, navigation to graph view

## User Authentication & Access Control

### Authentication
- **Method**: Use InstantDB built-in auth mechanisms

### Access Control
- **Sharing**: Yes, with view/edit permissions
- **Public/Private**: No public/private settings for now

### Multi-Map Support
- **Multiple Maps**: Yes, users can create multiple maps
- **Perspectives**: Users can create multiple Perspectives (sub maps) of any given map
- **Browser**: Sidebar style browser showing Maps and Perspectives nested underneath Maps

## UI/UX & Technical Preferences

### UI Framework
- **Library**: shadcn/ui with Tailwind CSS
- **React Version**: React 19

### Package Manager
- **Manager**: pnpm

### Build Tool
- **Tool**: Vite (fast for SPAs, no need for Next.js at this time)

### Presence Cursors
- **Display**: All of the following:
  - Simple colored cursors with usernames
  - Avatars/icons at cursor position
  - Highlighted nodes/areas being edited

## React Flow Customization

### Node Customization
- **Type**: Rich nodes with expandable metadata panels
- **Shapes**: Not customizable shapes (fixed design)
- **Metadata**: Expandable metadata panels supported

### Layout
- **Support**: Both manual positioning and automatic layout algorithms
- **Manual**: Drag-and-drop positioning
- **Automatic**: Force-directed, hierarchical, etc.

### Edge/Relationship Customization
- **Options**: Customizable styles (dashed, colored, curved vs straight)
- **Labels**: Relationship labels displayed on edges

## Feature Priorities

### MVP Scope
- **Core Features** (✅ Implemented):
  - ✅ Two-way editing (graph ↔ text)
  - ✅ Collaborative editing
  - ✅ Presence cursors
- **Optional Features**:
  - ✅ Search (implemented)
  - ✅ Zoom/pan controls (implemented via React Flow)
  - ⏳ Export/import (planned)
  - ⏳ Version history (planned)
  - ⏳ Comments (planned)

### Performance
- **Scale**: 10-1000 concepts per map
- **Concurrent Users**: Multiple users per map (exact number TBD)

## Additional Features

### Export/Import
- **Formats**: JSON, SVG
- **Git-Friendly**: Stable JSON export format for version control

### Version History
- **Type**: Version snapshots (save points)
- **Trigger**: User-initiated or when navigating away from a graph
- **Format**: Git-friendly stable JSON export

### Search & Navigation
- **Search**: ✅ Concepts by name/metadata (implemented via SearchBox component)
- **Filter**: ⏳ By tags/metadata (planned)
- **Navigation**: ⏳ Breadcrumbs/path highlights (planned)
- **All**: Yes to all features (search implemented, others planned)


# Implementation Plan

This document outlines the overall implementation plan for the Concept Mapping Tool and tracks completion status.

## Architectural Principles

### State Management Strategy

- **Model State**: All Concepts, Relationships, Maps, Perspectives stored in InstantDB
- **Data Access**: Use `db.useQuery()` hooks for real-time model state (automatic updates)
- **Mutations**: Use `db.transact()` with `tx` objects for all model updates
- **UI State**: Use Zustand stores for local UI state only (selectedConceptId, viewMode, sidebarOpen, etc.)
- **No Custom Sync**: Text and Graph views both read/write directly to InstantDB - no custom sync logic needed
- **Real-time**: Automatic via InstantDB `db.useQuery()` subscriptions

## Implementation Phases

### Phase 1: Project Setup & Foundation ✅ COMPLETE
- ✅ Project initialization (Vite + React 19 + TypeScript)
- ✅ InstantDB setup and schema definition
- ✅ Zustand UI state stores
- ✅ Basic UI structure and authentication

### Phase 2: Core Data Management ✅ COMPLETE
- ✅ InstantDB data hooks (`db.useQuery()`)
- ✅ Mutation hooks (`db.transact()`)
- ✅ Data transformation utilities

### Phase 3: Graph View Implementation ✅ COMPLETE
- ✅ React Flow integration
- ✅ Node customization
- ✅ Edge customization
- ✅ Layout management (force-directed, hierarchical)

### Phase 4: Structured Text View ✅ COMPLETE
- ✅ Text representation format
- ✅ Text editor features (EditableTriple component)

### Phase 5: Collaboration Features ✅ COMPLETE
- ✅ Presence implementation (cursors, avatars, editing highlights)
- ✅ Real-time updates (automatic via InstantDB)
- ✅ Sharing & permissions (ShareDialog, invitation system)

### Phase 6: Advanced Features 🟡 PARTIALLY COMPLETE
- ✅ Perspectives (fully implemented with editing support)
- ✅ Notes/Documentation (Markdown support for concepts and relationships)
- ✅ Search & Navigation (SearchBox component)
- ⏳ Version History (planned, not yet implemented)
- ⏳ Export/Import (planned, not yet implemented)

## Key Dependencies

- React 19
- React Flow
- InstantDB React
- Zustand
- React Markdown
- Tailwind CSS + shadcn/ui

## File Structure

See the full plan document for detailed file structure and implementation notes.

## Current Implementation Status

### ✅ Completed Features:
- Real-time collaborative editing via InstantDB
- Dual editing modes: Graph view (React Flow) and Structured Text view
- Presence indicators (cursors, avatars, editing highlights)
- Perspectives with editing support (Shift+Click to toggle concepts)
- Rich metadata support for concepts and relationships
- Markdown notes/documents for concepts and relationships
- Sharing and permissions system with invitations
- Search functionality
- Layout algorithms (force-directed, hierarchical)
- Undo/redo for deletions

### ⏳ Planned Features:
- Version History (snapshots)
- Export/Import (JSON, SVG)
- Command pattern for comprehensive undo/redo (see `command-pattern.md`)
- Concept map comparison feature (see `concept-map-comparison.md`)

## Notes

1. **No Custom Sync Logic**: Text and Graph views both use `db.useQuery()` and `db.transact()` - InstantDB handles synchronization automatically
2. **Real-time Updates**: Automatic via `db.useQuery()` subscriptions
3. **UI State Only**: Zustand stores only hold UI state, never model state
4. **All Mutations**: Use `db.transact()` with `tx` objects for all model updates

For the complete detailed plan, see `plan.plan.md` in the project root.


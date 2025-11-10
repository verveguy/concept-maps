# Concept Map Canvas Refactoring Plan

## Overview

The `ConceptMapCanvas` component has grown to **1889 lines** and handles too many responsibilities. This plan outlines a systematic refactoring to extract components, hooks, and state management to reduce complexity and prepare for undo functionality.

## Current State Analysis

### Component Size & Complexity
- **1889 lines** in a single component file
- **102+ declarations** (hooks, refs, callbacks, effects)
- **Multiple responsibilities** mixed together
- **Scattered state management** across hooks, refs, and stores
- **Direct database mutations** throughout, making undo difficult

### Key Responsibilities Identified

1. **Data Management**
   - Fetching concepts, relationships, comments
   - Transforming domain models to React Flow format
   - Synchronizing InstantDB ↔ React Flow state
   - Perspective filtering

2. **Event Handling**
   - Node changes (drag, delete, click)
   - Edge changes (delete, click)
   - Connection creation (drag-to-connect, handle-to-handle)
   - Pane interactions (click, double-click, right-click)
   - Keyboard shortcuts

3. **Layout Management**
   - Layout algorithm selection
   - Sticky layout behavior
   - Incremental layout updates
   - Auto-layout on new nodes

4. **Creation Logic**
   - Concept creation (double-click, context menu, drag-to-create)
   - Comment creation (context menu)
   - Relationship creation (connection handlers)
   - Initial concept creation for empty maps

5. **UI State**
   - Context menu visibility/position
   - Selection state
   - TextView visibility/position
   - Connection start tracking

6. **Presence & Collaboration**
   - Cursor tracking
   - Editing state tracking
   - Peer cursor rendering

7. **Deep Linking**
   - Concept centering from URL
   - Auto-selection

8. **Undo Preparation**
   - Deletion tracking
   - Operation grouping

## Refactoring Strategy

### Phase 1: Extract State Management (Zustand Store)

**Goal**: Centralize canvas-specific state in a Zustand store

**New Store**: `stores/canvasStore.ts`
- Connection state (connectionStart, connectionMade)
- Context menu state (visible, position)
- Layout state (activeLayout, selectedLayout, laidOutNodeIds)
- Creation tracking (newlyCreatedRelationshipIds, hasCheckedInitialConcept)
- Throttling state (lastUpdateTime)
- Refs that can be moved to store (pendingConcept, prevConceptIds)

**Benefits**:
- Reduces prop drilling
- Makes state testable
- Enables easier undo integration
- Separates state from UI logic

### Phase 2: Extract Mutation Layer (Command Pattern)

**Goal**: Centralize all database mutations to enable undo

**New Hook**: `hooks/useCanvasMutations.ts`
- Wraps all mutation actions (create, update, delete)
- Records mutations for undo
- Groups related mutations into operations
- Provides consistent mutation interface

**New Store**: `stores/mutationStore.ts` (optional, if needed)
- Tracks mutation history
- Groups mutations into undoable operations
- Provides undo/redo state

**Benefits**:
- Single point for undo integration
- Consistent mutation patterns
- Easier to add undo/redo later
- Better error handling

### Phase 3: Extract Event Handlers

**Goal**: Move event handling logic into focused hooks

**New Hooks**:
1. `hooks/useCanvasNodeHandlers.ts`
   - `onNodesChange` wrapper
   - `onNodeDrag` / `onNodeDragStop`
   - `onNodeClick`
   - Handles deletion, position updates

2. `hooks/useCanvasEdgeHandlers.ts`
   - `onEdgesChange` wrapper
   - `onEdgeClick`
   - Handles relationship deletion

3. `hooks/useCanvasConnectionHandlers.ts`
   - `onConnectStart` / `onConnectEnd` / `onConnect`
   - Drag-to-create logic
   - Handle-to-handle connection logic
   - Comment linking logic

4. `hooks/useCanvasPaneHandlers.ts`
   - `onPaneClick`
   - Double-click handler
   - Right-click handler
   - Context menu management

**Benefits**:
- Separates concerns
- Makes handlers testable
- Reduces component size
- Easier to understand flow

### Phase 4: Extract Layout Management

**Goal**: Isolate layout logic into dedicated hook/store

**New Hook**: `hooks/useCanvasLayout.ts`
- Layout application logic
- Sticky layout tracking
- Incremental layout detection
- Auto-layout triggers
- Layout state management

**New Component**: `components/graph/LayoutManager.tsx` (if needed)
- Handles layout UI interactions
- Manages layout selector integration

**Benefits**:
- Isolates complex layout logic
- Makes layout behavior testable
- Easier to add new layout algorithms
- Reduces component complexity

### Phase 5: Extract Data Synchronization

**Goal**: Separate React Flow ↔ InstantDB sync logic

**New Hook**: `hooks/useCanvasDataSync.ts`
- Watches InstantDB data changes
- Transforms to React Flow format
- Updates React Flow state efficiently
- Handles perspective filtering
- Manages comment nodes/edges

**Benefits**:
- Single source of truth for sync logic
- Easier to optimize performance
- Clearer data flow
- Easier to debug sync issues

### Phase 6: Extract Creation Logic

**Goal**: Centralize creation logic

**New Hook**: `hooks/useCanvasCreation.ts`
- Concept creation (all methods)
- Comment creation
- Relationship creation
- Initial concept creation
- Edit mode triggering

**Benefits**:
- Consistent creation patterns
- Easier to add new creation methods
- Better error handling
- Centralized edit mode logic

### Phase 7: Extract Deep Linking Logic

**Goal**: Isolate URL-based navigation

**New Hook**: `hooks/useCanvasDeepLinking.ts`
- Concept centering from URL
- Auto-selection logic
- Viewport management

**Benefits**:
- Isolated navigation logic
- Easier to test
- Clearer separation of concerns

### Phase 8: Extract Presence Integration

**Goal**: Isolate presence/collaboration logic

**New Hook**: `hooks/useCanvasPresence.ts`
- Cursor tracking setup
- Editing state updates
- Peer cursor integration

**Benefits**:
- Clear separation of collaboration features
- Easier to test presence logic
- Can be disabled/enabled easily

## Implementation Order

### Recommended Sequence

1. **Phase 1: Canvas Store** (Foundation)
   - Create `canvasStore.ts`
   - Move connection, context menu, layout state
   - Update component to use store

2. **Phase 2: Mutation Layer** (Critical for undo)
   - Create `useCanvasMutations.ts`
   - Wrap all mutations
   - Add undo tracking

3. **Phase 3: Event Handlers** (Reduces complexity)
   - Extract node handlers
   - Extract edge handlers
   - Extract connection handlers
   - Extract pane handlers

4. **Phase 4: Layout Management** (Isolates complex logic)
   - Extract layout hook
   - Move layout state to store

5. **Phase 5: Data Sync** (Clean separation)
   - Extract data sync hook
   - Simplify component data flow

6. **Phase 6: Creation Logic** (Consolidation)
   - Extract creation hook
   - Centralize creation methods

7. **Phase 7: Deep Linking** (Isolation)
   - Extract deep linking hook

8. **Phase 8: Presence** (Final cleanup)
   - Extract presence hook

## File Structure After Refactoring

```
src/
├── components/
│   └── graph/
│       ├── ConceptMapCanvas.tsx          (~200 lines - orchestrator)
│       ├── ConceptMapCanvasInner.tsx      (~150 lines - React Flow wrapper)
│       ├── LayoutSelector.tsx            (existing)
│       ├── CanvasContextMenu.tsx         (existing)
│       └── CustomConnectionLine.tsx      (existing)
├── hooks/
│   ├── useCanvasMutations.ts             (~150 lines - mutation wrapper)
│   ├── useCanvasNodeHandlers.ts         (~200 lines - node events)
│   ├── useCanvasEdgeHandlers.ts         (~150 lines - edge events)
│   ├── useCanvasConnectionHandlers.ts   (~250 lines - connection logic)
│   ├── useCanvasPaneHandlers.ts         (~150 lines - pane events)
│   ├── useCanvasLayout.ts               (~200 lines - layout management)
│   ├── useCanvasDataSync.ts             (~200 lines - data synchronization)
│   ├── useCanvasCreation.ts             (~200 lines - creation logic)
│   ├── useCanvasDeepLinking.ts          (~100 lines - URL navigation)
│   └── useCanvasPresence.ts             (~100 lines - presence integration)
├── stores/
│   ├── canvasStore.ts                   (~150 lines - canvas state)
│   ├── mapStore.ts                      (existing)
│   ├── uiStore.ts                       (existing)
│   └── undoStore.ts                     (existing, enhanced)
```

## Key Design Decisions

### 1. Zustand Store for Canvas State
- **Why**: Centralizes canvas-specific state, reduces prop drilling
- **What**: Connection state, context menu, layout tracking, creation tracking
- **Benefits**: Testable, debuggable, easier undo integration

### 2. Mutation Layer (Command Pattern)
- **Why**: Enables undo/redo, consistent error handling, operation grouping
- **What**: Wraps all database mutations with undo tracking
- **Benefits**: Single point for undo, consistent patterns, easier testing

### 3. Event Handler Hooks
- **Why**: Separates concerns, makes handlers testable, reduces component size
- **What**: One hook per event category (nodes, edges, connections, pane)
- **Benefits**: Clear separation, easier to understand, easier to test

### 4. Layout Hook
- **Why**: Complex logic, multiple responsibilities, needs isolation
- **What**: All layout application, tracking, and auto-apply logic
- **Benefits**: Isolated complexity, easier to test, easier to extend

### 5. Data Sync Hook
- **Why**: Complex synchronization logic, performance optimizations
- **What**: InstantDB ↔ React Flow transformation and sync
- **Benefits**: Single source of truth, easier to optimize, clearer flow

## Undo Framework Preparation

### Current State
- Basic undo store exists (`undoStore.ts`)
- Deletion tracking implemented
- Operation grouping implemented

### Enhancements Needed

1. **Mutation Recording**
   - Record all mutations (not just deletions)
   - Track before/after state
   - Group related mutations

2. **Command Pattern**
   - Each mutation becomes a command
   - Commands can be executed/undone
   - Commands can be grouped into operations

3. **Undo Stack**
   - Maintain undo/redo stacks
   - Limit stack size
   - Clear on map change

4. **Mutation Wrapper**
   - Wrap all mutations in `useCanvasMutations`
   - Automatically record for undo
   - Provide undo/redo functions

## Testing Strategy

### Unit Tests
- Test each hook independently
- Test store actions
- Test mutation recording

### Integration Tests
- Test hook interactions
- Test event handler chains
- Test data synchronization

### Component Tests
- Test component rendering
- Test user interactions
- Test undo/redo flow

## Migration Strategy

### Incremental Migration
1. Create new hooks/stores alongside existing code
2. Migrate one responsibility at a time
3. Test after each migration
4. Remove old code once verified

### Backward Compatibility
- Keep existing API during migration
- Add new hooks incrementally
- Don't break existing functionality

### Rollback Plan
- Keep old code until new code is verified
- Use feature flags if needed
- Can revert individual phases if issues arise

## Success Metrics

### Code Quality
- Component size: < 300 lines (from 1889)
- Cyclomatic complexity: Reduced by 60%+
- Test coverage: > 80%

### Maintainability
- Clear separation of concerns
- Easy to add new features
- Easy to debug issues

### Undo Readiness
- All mutations recorded
- Undo/redo infrastructure ready
- Can implement undo UI easily

## Risks & Mitigations

### Risk 1: Breaking Existing Functionality
- **Mitigation**: Incremental migration, comprehensive testing, keep old code until verified

### Risk 2: Performance Regression
- **Mitigation**: Profile before/after, optimize hooks, use memoization

### Risk 3: Increased Complexity
- **Mitigation**: Clear documentation, consistent patterns, code reviews

### Risk 4: Undo Implementation Complexity
- **Mitigation**: Start with mutation layer, test incrementally, use proven patterns

## Timeline Estimate

- **Phase 1**: 2-3 days (Canvas Store)
- **Phase 2**: 3-4 days (Mutation Layer)
- **Phase 3**: 4-5 days (Event Handlers)
- **Phase 4**: 2-3 days (Layout Management)
- **Phase 5**: 2-3 days (Data Sync)
- **Phase 6**: 2-3 days (Creation Logic)
- **Phase 7**: 1-2 days (Deep Linking)
- **Phase 8**: 1-2 days (Presence)

**Total**: ~3-4 weeks of focused development

## Next Steps

1. Review and approve this plan
2. Set up testing infrastructure
3. Create initial canvas store
4. Begin Phase 1 implementation
5. Iterate based on learnings

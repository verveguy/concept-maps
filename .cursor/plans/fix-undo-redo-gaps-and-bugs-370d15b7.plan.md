<!-- 370d15b7-a780-47d9-8ace-fc7c6a4f0ce7 3ad28793-afca-4fb9-92b8-5de0d50e02a9 -->
# Fix Undo/Redo Gaps and Bugs - Comprehensive Plan

## Overview

This plan addresses gaps in the undo/redo system by normalizing all **map-scoped** mutations with the command pattern. The existing codebase has a mutation/action pattern established (`useConceptActions`, `useRelationshipActions`, etc.), and we need to ensure all mutations **within a map context** are properly tracked and reversible.

**Scope**: Undo/redo applies only to operations within a single map (concepts, relationships, comments, perspectives, map metadata). Map-level operations (creating/deleting maps, sharing) are intentionally excluded as they operate outside the map context.

## Critical Issues Identified

### Existing Issues (from original plan)
1. **Missing previousState for drag operations** - Position updates during drag don't capture previous state, making them un-undoable
   - **Impact**: Node dragging (concepts/comments) creates `updateConcept`/`updateComment` mutations but without `previousState`, undo cannot restore original position
   - **Current behavior**: Each drag event calls `updateConcept`/`updateComment` without tracking initial position
2. **Drag operations not grouped** - Each drag event creates separate mutations instead of grouping into one operation
   - **Impact**: Dragging a node multiple times creates multiple undo entries instead of one "move node" operation
   - **Current behavior**: Each throttled position update during drag creates a separate command
3. **Missing previousState for all updates** - `updateConcept`, `updateComment`, `updateRelationship` don't capture previous state before updating
   - **Impact**: Any update operation cannot be properly undone without knowing what was changed from
4. **Missing IDs in create commands** - Create commands don't populate entity IDs needed for undo
   - **Impact**: Cannot undo create operations because the command doesn't know which entity was created
5. **updateMap not undoable** - Missing implementation in useUndo

### New Issues Discovered
6. **Missing mutation types** - Several mutation types within a map are not tracked:
   - Perspective operations: `createPerspective`, `updatePerspective`, `deletePerspective`, `toggleConceptInPerspective`, `toggleRelationshipInPerspective`
   - Map metadata updates: `updateMap` (partially tracked but missing undo implementation)

7. **Inconsistent mutation tracking** - Some mutations go through `useCanvasMutations` (which tracks commands), while others call action hooks directly (bypassing command tracking)

8. **Redo double-recording** - When redo executes commands via `useCanvasMutations`, they get recorded again, potentially causing issues

### Scope Definition
**Undo/Redo Scope**: Operations within a single map context only. This includes:
- ✅ Concept operations (create, update, delete)
- ✅ Relationship operations (create, update, reverse, delete)
- ✅ Comment operations (create, update, delete, link/unlink)
- ✅ Perspective operations (create, update, delete, toggle concept/relationship)
- ✅ Map metadata updates (name, layoutAlgorithm)

**Out of Scope** (no undo/redo support):
- ❌ Map creation/deletion (map-level operations)
- ❌ Sharing operations (invitations, permissions - map-level operations)
- ❌ Trash operations (permanent deletion - intentionally excluded)

## Architecture Analysis

### Current Mutation Flow
1. **Tracked mutations** (via `useCanvasMutations`):
   - Concept: create, update (including drag position updates), delete
   - Relationship: create, update, reverse, delete
   - Comment: create, update (including drag position updates), delete, link/unlink
   - Map: update (partial - missing undo implementation)
   
   **Note**: Drag operations (node dragging) are mutations that update position via `updateConcept`/`updateComment`. These are currently tracked but lack proper undo support due to missing `previousState` and operation grouping.

**Drag Operations Inventory**:
- ✅ **Node dragging** (concepts/comments): Creates `updateConcept`/`updateComment` mutations - **NEEDS FIX** (missing previousState, not grouped)
- ❌ **Edge dragging**: Not supported in React Flow (edges connect nodes and move when nodes move)
- ❌ **Canvas pan/zoom**: Not mutations (UI state only, doesn't modify database)
- ✅ **Connection creation drag**: Creates relationships via `createRelationship` - already tracked (but needs ID fix from Phase 1)

2. **Untracked mutations** (direct action calls, but should be tracked):
   - Perspective: all operations (within map scope)
   - Map: update (partially tracked but missing undo implementation)

3. **Out of scope** (intentionally not tracked):
   - Map: create, delete (map-level operations)
   - Sharing: all operations (map-level operations)
   - Trash: emptyTrash (permanent deletion)

### Command Pattern Structure
- Commands are stored in `undoStore.ts` with types defined in `MutationCommandUnion`
- Commands have `operationId` for grouping related mutations
- Undo/redo hooks (`useUndo.ts`, `useRedo.ts`) reverse/re-execute commands
- Action hooks (`useConceptActions.ts`, etc.) perform actual database operations

## Implementation Plan

### Phase 1: Fix Existing Tracked Mutations

#### 1.1 Capture Previous State Before Updates

**Critical**: Drag operations are mutations that need undo support. When a user drags a node (concept or comment), it creates `updateConcept`/`updateComment` mutations that must be undoable.

**File: `src/hooks/useCanvasMutations.ts`**

- Modify `updateConcept`, `updateComment`, `updateRelationship` to accept optional `previousState` parameter
- When `previousState` is not provided, fetch current state from passed entity arrays (concepts/comments/relationships)
- Store `previousState` in mutation command for proper undo
- **Approach**: Accept `previousState` as optional parameter, capture at call site when available, otherwise fetch from entity arrays
- **For drag operations**: The `previousState` should contain the position at drag start, not the current position

**File: `src/hooks/useCanvasNodeHandlers.ts`**

- **CRITICAL**: Drag operations create mutations via `updateConcept`/`updateComment` calls in `onNodeDrag` and `onNodeDragStop`
- Track initial position when drag starts (store in ref or canvas store)
- Pass `previousState` to `updateConcept`/`updateComment` calls in `onNodeDrag` and `onNodeDragStop`
- Use the initial position from when drag started, not the current position
- Ensure all position updates during a drag operation use the same initial `previousState`

**File: `src/stores/canvasStore.ts`**

- Add state to track drag start positions: `dragStartPositions: Map<string, { x: number; y: number }>`
- Store initial position when drag starts (`onNodeDragStart`)
- Clear when drag ends (`onNodeDragStop`)
- This ensures we can always provide `previousState` for drag-related position updates

#### 1.2 Group Drag Operations

**Critical**: Drag operations create multiple mutations (one per throttled update during drag, plus final update on drag stop). These must be grouped into a single undoable operation.

**File: `src/hooks/useCanvasNodeHandlers.ts`**

- Add `onNodeDragStart` handler (React Flow supports this)
- Call `startOperation()` when drag starts - this groups all subsequent mutations into one operation
- Call `endOperation()` when drag stops (`onNodeDragStop`) - this closes the operation group
- Ensure all drag-related mutations (throttled updates during drag + final update on stop) use the same operationId
- **Result**: Dragging a node creates one undo entry, not multiple entries for each position update

#### 1.3 Populate IDs in Create Commands

**File: `src/hooks/useCanvasMutations.ts`**

- For `createConcept`, `createRelationship`, `createComment`:
  - Generate ID before creating (using `id()` from instant)
  - Pass ID to create action
  - Store ID in command for undo

**File: `src/hooks/useConceptActions.ts`** (and similar)

- Modify create functions to accept optional `id` parameter
- Use provided ID if available, otherwise generate internally
- This allows `useCanvasMutations` to generate IDs before calling actions

#### 1.4 Fix updateMap Undo

**File: `src/hooks/useUndo.ts`**

- Import `useMapActions` to get `updateMapAction`
- Implement undo for `updateMap` command using `previousState`
- Handle case where `previousState` may be undefined

### Phase 2: Add Missing Mutation Types

#### 2.1 Perspective Operations

**File: `src/stores/undoStore.ts`**

- Add command types:
  - `CreatePerspectiveCommand` - with perspectiveId, mapId, name, conceptIds, relationshipIds
  - `UpdatePerspectiveCommand` - with perspectiveId, updates, previousState
  - `DeletePerspectiveCommand` - with perspectiveId, previousState
  - `ToggleConceptInPerspectiveCommand` - with perspectiveId, conceptId, wasIncluded, previousConceptIds, previousRelationshipIds
  - `ToggleRelationshipInPerspectiveCommand` - with perspectiveId, relationshipId, wasIncluded, previousRelationshipIds

**File: `src/hooks/usePerspectiveMutations.ts`** (new file)

- Create wrapper hook similar to `useCanvasMutations`
- Wrap all perspective actions from `usePerspectiveActions`
- Record commands for all operations
- Capture previous state before updates/deletes

**File: `src/hooks/useUndo.ts`**

- Add undo handlers for all perspective command types

**File: `src/hooks/useRedo.ts`**

- Add redo handlers for all perspective command types

**Files using perspectives**: `Sidebar.tsx`, `PerspectiveEditor.tsx`, `ConceptNode.tsx`
- Update to use `usePerspectiveMutations` instead of direct `usePerspectiveActions` calls

**Note**: Map create/delete and sharing operations are intentionally excluded from undo/redo scope as they are map-level operations, not operations within a map.

### Phase 3: Fix Redo Double-Recording

**Problem**: When `useRedo` calls mutations via `useCanvasMutations`, they get recorded again in mutation history.

**Solution**: Add a flag to prevent recording during redo execution.

**File: `src/stores/undoStore.ts`**

- Add state: `isRedoing: boolean`
- Add setter: `setIsRedoing: (value: boolean) => void`

**File: `src/hooks/useCanvasMutations.ts`**

- Check `isRedoing` flag before recording mutations
- Skip `recordMutation` if `isRedoing` is true

**File: `src/hooks/useRedo.ts`**

- Set `isRedoing` to true before re-executing commands
- Set `isRedoing` to false after completion (in finally block)
- Ensure flag is cleared even on error

**Apply same pattern to**: `usePerspectiveMutations.ts`

### Phase 4: Ensure Consistent Mutation Tracking

**Goal**: Ensure all mutations go through command tracking, not direct action calls.

**Files to audit and update**:
1. `src/components/perspective/PerspectiveEditor.tsx` - Perspective operations
2. `src/components/concept/ConceptNode.tsx` - Perspective toggle operations
3. `src/components/layout/Sidebar.tsx` - Perspective operations (map create/delete remain direct)

**Pattern**: Replace direct action calls with mutation wrapper calls for in-scope operations:
```typescript
// Before (perspective operations)
const { createPerspective } = usePerspectiveActions()
await createPerspective(data)

// After
const { createPerspective } = usePerspectiveMutations()
await createPerspective(data)
```

**Note**: Map create/delete and sharing operations remain direct (out of scope).

## Files to Modify

### Core Files
1. `src/stores/undoStore.ts` - Add new command types, add `isRedoing` flag
2. `src/hooks/useCanvasMutations.ts` - Fix previousState capture, fix create IDs, add isRedoing check
3. `src/hooks/useCanvasNodeHandlers.ts` - Add drag operation grouping, pass previousState
4. `src/stores/canvasStore.ts` - Add drag start position tracking
5. `src/hooks/useUndo.ts` - Fix updateMap undo, add handlers for new command types
6. `src/hooks/useRedo.ts` - Add handlers for new command types, add isRedoing flag management

### New Files
7. `src/hooks/usePerspectiveMutations.ts` - Wrap perspective operations

### Action Hook Updates
8. `src/hooks/useConceptActions.ts` - Accept optional ID parameter
9. `src/hooks/useRelationshipActions.ts` - Accept optional ID parameter  
10. `src/hooks/useCommentActions.ts` - Accept optional ID parameter

### Component Updates
11. `src/components/perspective/PerspectiveEditor.tsx` - Use mutation wrappers
12. `src/components/concept/ConceptNode.tsx` - Use mutation wrappers
13. `src/components/layout/Sidebar.tsx` - Use mutation wrappers for perspective operations (map create/delete remain direct)

## Testing Considerations

### Unit Tests
- Test previousState capture for all update operations
- Test drag operation grouping
- Test create commands with IDs
- Test undo/redo for all new command types
- Test isRedoing flag prevents double-recording

### Integration Tests
- Test drag undo/redo works correctly
- Test multiple rapid drags don't create too many operations
- Test undo after partial drag (drag started but cancelled)
- Test concurrent drags of multiple nodes
- Test undo/redo for perspective operations
- Test undo/redo for map metadata updates (name, layoutAlgorithm)
- Verify redo doesn't double-record mutations

### Edge Cases
- Test undo when entity was deleted by another user (multiplayer conflict)
- Test undo when entity was modified by another user (partial reversal)
- Test undo for operations with missing previousState (graceful degradation)
- Test undo for create operations without IDs (should fail gracefully)

## Implementation Order

1. **Phase 1** - Fix existing tracked mutations (highest priority, affects current functionality)
2. **Phase 3** - Fix redo double-recording (prevents bugs in current system)
3. **Phase 2** - Add missing mutation types (extends functionality)
4. **Phase 4** - Ensure consistent tracking (polish and completeness)

## To-dos

### Phase 1: Fix Existing Tracked Mutations
- [ ] **CRITICAL: Fix drag operations** - Drag operations are mutations that need undo support
  - [ ] Add onNodeDragStart handler to start operation, endOperation on drag stop - group all drag mutations into single undoable operation
  - [ ] Add drag start position tracking to canvasStore - store initial position when drag starts, use for previousState in updates
  - [ ] Modify onNodeDrag and onNodeDragStop to pass previousState from drag start position to updateConcept/updateComment calls
- [ ] Modify useCanvasMutations to capture previousState before updates - updateConcept, updateComment, updateRelationship need to fetch current state and store in command (when previousState not provided)
- [ ] Fix create commands to populate entity IDs - generate ID before creating and store in command for undo
- [ ] Modify action hooks to accept optional ID parameter - useConceptActions, useRelationshipActions, useCommentActions
- [ ] Implement updateMap undo in useUndo.ts - import useMapActions and properly reverse updateMap commands

### Phase 2: Add Missing Mutation Types
- [ ] Add perspective command types to undoStore - CreatePerspectiveCommand, UpdatePerspectiveCommand, DeletePerspectiveCommand, ToggleConceptInPerspectiveCommand, ToggleRelationshipInPerspectiveCommand
- [ ] Create usePerspectiveMutations wrapper - wrap all perspective actions
- [ ] Add perspective undo/redo handlers - implement in useUndo and useRedo
- [ ] Update components to use mutation wrappers - PerspectiveEditor, ConceptNode, Sidebar (for perspective operations only)

### Phase 3: Fix Redo Double-Recording
- [ ] Add isRedoing flag to undoStore - state and setter
- [ ] Modify useCanvasMutations to check isRedoing flag - skip recordMutation if isRedoing is true
- [ ] Modify useRedo to set isRedoing flag - set true before re-execution, false after (in finally)
- [ ] Apply same pattern to usePerspectiveMutations

### Phase 4: Ensure Consistent Tracking
- [ ] Audit component files for direct action calls - identify in-scope mutations that bypass command tracking
- [ ] Update PerspectiveEditor.tsx to use mutation wrappers
- [ ] Update ConceptNode.tsx to use mutation wrappers
- [ ] Update Sidebar.tsx to use mutation wrappers for perspective operations (map create/delete remain direct)
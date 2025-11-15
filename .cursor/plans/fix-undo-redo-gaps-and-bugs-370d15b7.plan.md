<!-- 370d15b7-a780-47d9-8ace-fc7c6a4f0ce7 3ad28793-afca-4fb9-92b8-5de0d50e02a9 -->
# Fix Undo/Redo Gaps and Bugs - Comprehensive Plan

## Overview

This plan addresses gaps in the undo/redo system by normalizing all mutations with the command pattern. The existing codebase has a mutation/action pattern established (`useConceptActions`, `useRelationshipActions`, etc.), and we need to ensure all mutations are properly tracked and reversible.

## Critical Issues Identified

### Existing Issues (from original plan)
1. **Missing previousState for drag operations** - Position updates during drag don't capture previous state, making them un-undoable
2. **Drag operations not grouped** - Each drag event creates separate mutations instead of grouping into one operation
3. **Missing previousState for all updates** - `updateConcept`, `updateComment`, `updateRelationship` don't capture previous state before updating
4. **Missing IDs in create commands** - Create commands don't populate entity IDs needed for undo
5. **updateMap not undoable** - Missing implementation in useUndo

### New Issues Discovered
6. **Missing mutation types** - Several mutation types are not tracked at all:
   - Map operations: `createMap`, `deleteMap` (only `updateMap` is partially tracked)
   - Perspective operations: `createPerspective`, `updatePerspective`, `deletePerspective`, `toggleConceptInPerspective`, `toggleRelationshipInPerspective`
   - Sharing operations: `createInvitation`, `acceptInvitation`, `declineInvitation`, `revokeInvitation`, `updateSharePermission`, `revokeShare`
   - Trash operations: `emptyTrash` (permanent deletion - may be intentionally excluded)

7. **Inconsistent mutation tracking** - Some mutations go through `useCanvasMutations` (which tracks commands), while others call action hooks directly (bypassing command tracking)

8. **Redo double-recording** - When redo executes commands via `useCanvasMutations`, they get recorded again, potentially causing issues

## Architecture Analysis

### Current Mutation Flow
1. **Tracked mutations** (via `useCanvasMutations`):
   - Concept: create, update, delete
   - Relationship: create, update, reverse, delete
   - Comment: create, update, delete, link/unlink
   - Map: update (partial - missing undo implementation)

2. **Untracked mutations** (direct action calls):
   - Map: create, delete
   - Perspective: all operations
   - Sharing: all operations
   - Trash: emptyTrash

### Command Pattern Structure
- Commands are stored in `undoStore.ts` with types defined in `MutationCommandUnion`
- Commands have `operationId` for grouping related mutations
- Undo/redo hooks (`useUndo.ts`, `useRedo.ts`) reverse/re-execute commands
- Action hooks (`useConceptActions.ts`, etc.) perform actual database operations

## Implementation Plan

### Phase 1: Fix Existing Tracked Mutations

#### 1.1 Capture Previous State Before Updates

**File: `src/hooks/useCanvasMutations.ts`**

- Modify `updateConcept`, `updateComment`, `updateRelationship` to accept optional `previousState` parameter
- When `previousState` is not provided, fetch current state from passed entity arrays (concepts/comments/relationships)
- Store `previousState` in mutation command for proper undo
- **Approach**: Accept `previousState` as optional parameter, capture at call site when available, otherwise fetch from entity arrays

**File: `src/hooks/useCanvasNodeHandlers.ts`**

- Track initial position when drag starts (store in ref or canvas store)
- Pass `previousState` to `updateConcept`/`updateComment` calls in `onNodeDrag` and `onNodeDragStop`
- Use the initial position from when drag started, not the current position

**File: `src/stores/canvasStore.ts`**

- Add state to track drag start positions: `dragStartPositions: Map<string, { x: number; y: number }>`
- Store initial position when drag starts (`onNodeDragStart`)
- Clear when drag ends (`onNodeDragStop`)

#### 1.2 Group Drag Operations

**File: `src/hooks/useCanvasNodeHandlers.ts`**

- Add `onNodeDragStart` handler (React Flow supports this)
- Call `startOperation()` when drag starts
- Call `endOperation()` when drag stops (`onNodeDragStop`)
- Ensure all drag-related mutations use the same operationId

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

#### 2.1 Map Operations

**File: `src/stores/undoStore.ts`**

- Add command types:
  - `CreateMapCommand` - with mapId, name, creatorId
  - `DeleteMapCommand` - with mapId, previousState (name, layoutAlgorithm, etc.)

**File: `src/hooks/useCanvasMutations.ts`** (or create `useMapMutations.ts`)

- Wrap `createMap` from `useMapActions`
- Wrap `deleteMap` from `useMapActions` (capture previous state before deletion)
- Record commands for both operations

**File: `src/hooks/useUndo.ts`**

- Add undo handlers for `createMap` (delete) and `deleteMap` (recreate with previousState)

**File: `src/hooks/useRedo.ts`**

- Add redo handlers for `createMap` and `deleteMap`

**Note**: Map operations may be called from `Sidebar.tsx` - need to ensure they go through mutation wrapper

#### 2.2 Perspective Operations

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

#### 2.3 Sharing Operations

**File: `src/stores/undoStore.ts`**

- Add command types:
  - `CreateInvitationCommand` - with invitationId, mapId, invitedEmail, permission, token
  - `AcceptInvitationCommand` - with invitationId, shareId, previousInvitationState
  - `DeclineInvitationCommand` - with invitationId, previousInvitationState
  - `RevokeInvitationCommand` - with invitationId, previousInvitationState
  - `UpdateSharePermissionCommand` - with shareId, previousPermission, newPermission
  - `RevokeShareCommand` - with shareId, previousShareState

**File: `src/hooks/useSharingMutations.ts`** (new file, or extend `useSharing.ts`)

- Wrap sharing actions from `useSharing`
- Record commands for all operations
- Capture previous state before updates/revocations

**File: `src/hooks/useUndo.ts`**

- Add undo handlers for all sharing command types
- **Note**: Some operations may be complex (e.g., acceptInvitation creates share + updates invitation)

**File: `src/hooks/useRedo.ts`**

- Add redo handlers for all sharing command types

**Files using sharing**: `ShareDialog.tsx`, `InvitationAcceptScreen.tsx`
- Update to use mutation wrapper instead of direct `useSharing` calls

#### 2.4 Trash Operations

**Decision**: `emptyTrash` performs permanent deletion. This is typically not undoable by design (trash is meant to be permanent). However, we could:
- Option A: Track it but mark as non-reversible (for audit purposes)
- Option B: Exclude it from undo/redo (current approach)

**Recommendation**: Option B - exclude from undo/redo. Trash operations are meant to be permanent.

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

**Apply same pattern to**: `usePerspectiveMutations.ts`, `useSharingMutations.ts`, `useMapMutations.ts`

### Phase 4: Ensure Consistent Mutation Tracking

**Goal**: Ensure all mutations go through command tracking, not direct action calls.

**Files to audit and update**:
1. `src/components/layout/Sidebar.tsx` - Map and perspective operations
2. `src/components/perspective/PerspectiveEditor.tsx` - Perspective operations
3. `src/components/concept/ConceptNode.tsx` - Perspective toggle operations
4. `src/components/share/ShareDialog.tsx` - Sharing operations
5. `src/components/invitation/InvitationAcceptScreen.tsx` - Invitation acceptance

**Pattern**: Replace direct action calls with mutation wrapper calls:
```typescript
// Before
const { createMap } = useMapActions()
await createMap(name)

// After
const { createMap } = useMapMutations() // or useCanvasMutations if map ops are there
await createMap(name)
```

## Files to Modify

### Core Files
1. `src/stores/undoStore.ts` - Add new command types, add `isRedoing` flag
2. `src/hooks/useCanvasMutations.ts` - Fix previousState capture, fix create IDs, add isRedoing check
3. `src/hooks/useCanvasNodeHandlers.ts` - Add drag operation grouping, pass previousState
4. `src/stores/canvasStore.ts` - Add drag start position tracking
5. `src/hooks/useUndo.ts` - Fix updateMap undo, add handlers for new command types
6. `src/hooks/useRedo.ts` - Add handlers for new command types, add isRedoing flag management

### New Files
7. `src/hooks/useMapMutations.ts` - Wrap map operations (or extend useCanvasMutations)
8. `src/hooks/usePerspectiveMutations.ts` - Wrap perspective operations
9. `src/hooks/useSharingMutations.ts` - Wrap sharing operations (or extend useSharing)

### Action Hook Updates
10. `src/hooks/useConceptActions.ts` - Accept optional ID parameter
11. `src/hooks/useRelationshipActions.ts` - Accept optional ID parameter  
12. `src/hooks/useCommentActions.ts` - Accept optional ID parameter
13. `src/hooks/useMapActions.ts` - Accept optional ID parameter (for createMap)

### Component Updates
14. `src/components/layout/Sidebar.tsx` - Use mutation wrappers
15. `src/components/perspective/PerspectiveEditor.tsx` - Use mutation wrappers
16. `src/components/concept/ConceptNode.tsx` - Use mutation wrappers
17. `src/components/share/ShareDialog.tsx` - Use mutation wrappers
18. `src/components/invitation/InvitationAcceptScreen.tsx` - Use mutation wrappers

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
- Test undo/redo for sharing operations
- Test undo/redo for map operations
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
- [ ] Modify useCanvasMutations to capture previousState before updates - updateConcept, updateComment, updateRelationship need to fetch current state and store in command
- [ ] Add onNodeDragStart handler to start operation, endOperation on drag stop - group all drag mutations into single undoable operation
- [ ] Add drag start position tracking to canvasStore - store initial position when drag starts, use for previousState in updates
- [ ] Modify onNodeDrag and onNodeDragStop to pass previousState from drag start position to updateConcept/updateComment calls
- [ ] Fix create commands to populate entity IDs - generate ID before creating and store in command for undo
- [ ] Modify action hooks to accept optional ID parameter - useConceptActions, useRelationshipActions, useCommentActions
- [ ] Implement updateMap undo in useUndo.ts - import useMapActions and properly reverse updateMap commands

### Phase 2: Add Missing Mutation Types
- [ ] Add map command types to undoStore - CreateMapCommand, DeleteMapCommand
- [ ] Create useMapMutations wrapper or extend useCanvasMutations - wrap createMap and deleteMap
- [ ] Add map undo/redo handlers - implement in useUndo and useRedo
- [ ] Add perspective command types to undoStore - CreatePerspectiveCommand, UpdatePerspectiveCommand, DeletePerspectiveCommand, ToggleConceptInPerspectiveCommand, ToggleRelationshipInPerspectiveCommand
- [ ] Create usePerspectiveMutations wrapper - wrap all perspective actions
- [ ] Add perspective undo/redo handlers - implement in useUndo and useRedo
- [ ] Add sharing command types to undoStore - CreateInvitationCommand, AcceptInvitationCommand, DeclineInvitationCommand, RevokeInvitationCommand, UpdateSharePermissionCommand, RevokeShareCommand
- [ ] Create useSharingMutations wrapper or extend useSharing - wrap all sharing actions
- [ ] Add sharing undo/redo handlers - implement in useUndo and useRedo
- [ ] Update components to use mutation wrappers - Sidebar, PerspectiveEditor, ConceptNode, ShareDialog, InvitationAcceptScreen

### Phase 3: Fix Redo Double-Recording
- [ ] Add isRedoing flag to undoStore - state and setter
- [ ] Modify useCanvasMutations to check isRedoing flag - skip recordMutation if isRedoing is true
- [ ] Modify useRedo to set isRedoing flag - set true before re-execution, false after (in finally)
- [ ] Apply same pattern to usePerspectiveMutations, useSharingMutations, useMapMutations

### Phase 4: Ensure Consistent Tracking
- [ ] Audit all component files for direct action calls - identify mutations that bypass command tracking
- [ ] Update Sidebar.tsx to use mutation wrappers
- [ ] Update PerspectiveEditor.tsx to use mutation wrappers
- [ ] Update ConceptNode.tsx to use mutation wrappers
- [ ] Update ShareDialog.tsx to use mutation wrappers
- [ ] Update InvitationAcceptScreen.tsx to use mutation wrappers
<!-- 370d15b7-a780-47d9-8ace-fc7c6a4f0ce7 3ad28793-afca-4fb9-92b8-5de0d50e02a9 -->
# Fix Undo/Redo Gaps and Bugs

## Critical Issues Identified

1. **Missing previousState for drag operations** - Position updates during drag don't capture previous state, making them un-undoable
2. **Drag operations not grouped** - Each drag event creates separate mutations instead of grouping into one operation
3. **Missing previousState for all updates** - `updateConcept`, `updateComment`, `updateRelationship` don't capture previous state before updating
4. **Missing IDs in create commands** - Create commands don't populate entity IDs needed for undo
5. **updateMap not undoable** - Missing implementation in useUndo

## Implementation Plan

### 1. Capture Previous State Before Updates

**File: `src/hooks/useCanvasMutations.ts`**

- Modify `updateConcept` to accept optional `previousState` parameter
- Before calling `updateConceptAction`, fetch current concept state from the concepts array passed via hook options
- Store previousState in the mutation command
- Apply same pattern to `updateComment` and `updateRelationship`

**File: `src/hooks/useCanvasNodeHandlers.ts`**

- Track initial position when drag starts (store in ref or canvas store)
- Pass previousState to `updateConcept`/`updateComment` calls in `onNodeDrag` and `onNodeDragStop`
- Use the initial position from when drag started, not the current position

### 2. Group Drag Operations

**File: `src/hooks/useCanvasNodeHandlers.ts`**

- Add `onNodeDragStart` handler (React Flow supports this)
- Call `startOperation()` when drag starts
- Call `endOperation()` when drag stops (`onNodeDragStop`)
- Ensure all drag-related mutations use the same operationId

**File: `src/stores/canvasStore.ts`**

- Add state to track drag start position: `dragStartPositions: Map<string, { x: number; y: number }>`
- Store initial position when drag starts
- Clear when drag ends

### 3. Fix Missing Previous State Capture

**File: `src/hooks/useCanvasMutations.ts`**

- Modify mutation functions to accept concepts/comments/relationships arrays as dependencies
- Before updating, find current entity and extract previous state
- Store previousState in command for all update operations

**Alternative approach**: Pass previousState as optional parameter to mutation functions, capture at call site

### 4. Populate IDs in Create Commands

**File: `src/hooks/useCanvasMutations.ts`**

- For `createConcept`, `createRelationship`, `createComment`:
- Generate ID before creating (using `id()` from instant)
- Pass ID to create action
- Store ID in command for undo

**File: `src/hooks/useConceptActions.ts`** (and similar)

- Modify create functions to accept optional ID parameter
- Use provided ID if available, otherwise generate

### 5. Fix updateMap Undo

**File: `src/hooks/useUndo.ts`**

- Import `useMapActions` to get `updateMapAction`
- Implement undo for `updateMap` command using previousState

### 6. Handle Edge Cases

- Ensure operation grouping works correctly with time windows
- Handle concurrent drag operations (multiple nodes)
- Ensure redo properly re-records mutations (currently may double-record)

## Files to Modify

1. `src/hooks/useCanvasMutations.ts` - Add previousState capture, fix create IDs
2. `src/hooks/useCanvasNodeHandlers.ts` - Add drag operation grouping, pass previousState
3. `src/stores/canvasStore.ts` - Add drag start position tracking
4. `src/hooks/useUndo.ts` - Fix updateMap undo
5. `src/hooks/useConceptActions.ts` - Accept optional ID parameter
6. `src/hooks/useRelationshipActions.ts` - Accept optional ID parameter  
7. `src/hooks/useCommentActions.ts` - Accept optional ID parameter

## Testing Considerations

- Test drag undo/redo works correctly
- Test multiple rapid drags don't create too many operations
- Test undo after partial drag (drag started but cancelled)
- Test concurrent drags of multiple nodes
- Verify redo doesn't double-record mutations

### To-dos

- [ ] Modify useCanvasMutations to capture previousState before updates - updateConcept, updateComment, updateRelationship need to fetch current state and store in command
- [ ] Add onNodeDragStart handler to start operation, endOperation on drag stop - group all drag mutations into single undoable operation
- [ ] Add drag start position tracking to canvasStore - store initial position when drag starts, use for previousState in updates
- [ ] Modify onNodeDrag and onNodeDragStop to pass previousState from drag start position to updateConcept/updateComment calls
- [ ] Fix create commands to populate entity IDs - generate ID before creating and store in command for undo
- [ ] Implement updateMap undo in useUndo.ts - import useMapActions and properly reverse updateMap commands
- [ ] Fix redo to prevent double-recording mutations - ensure re-executed commands dont get recorded again in mutation history
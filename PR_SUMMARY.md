## Summary

Complete undo/redo system implementation with Command Pattern architecture and comprehensive mutation tracking for all map-scoped operations.

## Functional Intent

Implements a complete undo/redo system that allows users to undo and redo all operations within a map context (concepts, relationships, comments, perspectives, and map metadata). This solves the problem of accidental deletions and edits by providing a robust, user-friendly undo/redo mechanism.

**Key improvements:**
- Drag operations are now properly undoable (previously created multiple undo entries)
- All perspective operations (create, update, delete, toggle) are now undoable
- Map metadata updates (name, layout algorithm) are now undoable
- Redo functionality prevents double-recording of commands
- Clear architectural separation between actions (database operations) and commands (undo/redo tracking)

## Nature of Change

- [x] Bug fix
- [x] New feature
- [ ] Performance improvement
- [x] Refactoring
- [ ] Documentation
- [x] Test coverage
- [ ] Dependency update
- [ ] Build/config change

## Changes Made

### Core Architecture
- **Renamed mutation hooks to command hooks** (`useCanvasMutations` → `useCanvasCommands`, `usePerspectiveMutations` → `usePerspectiveCommands`) to better reflect Command Pattern implementation
- Implemented comprehensive command tracking system in `undoStore.ts` with operation grouping
- Added `isRedoing` flag to prevent double-recording during redo operations

### Drag Operations Fix
- Added `onNodeDragStart` handler to group all drag-related mutations into a single undoable operation
- Implemented drag start position tracking in `canvasStore` to capture initial position for proper undo
- Modified `onNodeDrag` and `onNodeDragStop` to use initial drag position as `previousState` for undo support
- Result: Dragging a node now creates one undo entry instead of multiple entries

### Perspective Operations
- Created `usePerspectiveCommands` hook wrapping all perspective actions with command tracking
- Added undo/redo handlers for all perspective command types:
  - `createPerspective`
  - `updatePerspective`
  - `deletePerspective`
  - `toggleConceptInPerspective`
  - `toggleRelationshipInPerspective`
- Updated components (`PerspectiveEditor`, `ConceptNode`, `Sidebar`) to use command hooks

### Create Operations
- Modified action hooks (`useConceptActions`, `useRelationshipActions`, `useCommentActions`) to accept optional ID parameter
- Updated command hooks to generate IDs before creating entities, storing them in commands for proper undo

### Map Operations
- Implemented `updateMap` undo handler in `useUndo.ts`
- Map metadata updates (name, layoutAlgorithm) are now fully undoable

### Component Updates
- Updated all components to use command hooks instead of direct action calls for in-scope operations
- Maintained direct action calls for out-of-scope operations (map create/delete, sharing)

## Risks & Considerations

- **Breaking changes**: None - all changes are internal refactoring
- **Performance**: Command history is limited to 100 entries (configurable via `MAX_MUTATION_HISTORY_SIZE`)
- **Multiplayer conflicts**: Undo operations may fail gracefully if entities were modified/deleted by another user (handled with try/catch and console warnings)
- **Operation grouping**: Drag operations are grouped by `operationId` - if drag is interrupted, operation grouping may not be perfect
- **Previous state**: Some update operations may not have `previousState` if not provided at call site - undo will log a warning but won't crash

## Review Focus Areas

1. **Command Pattern Implementation**: Review `useCanvasCommands.ts` and `usePerspectiveCommands.ts` to ensure proper command recording and operation grouping
2. **Drag Operation Handling**: Review `useCanvasNodeHandlers.ts` to verify drag start position tracking and operation grouping logic
3. **Undo/Redo Logic**: Review `useUndo.ts` and `useRedo.ts` to ensure all command types are properly handled and `isRedoing` flag prevents double-recording
4. **Test Coverage**: Review test files to ensure comprehensive coverage of undo/redo scenarios, especially edge cases
5. **Component Integration**: Verify that all components correctly use command hooks instead of direct action calls

## Testing

- [x] Unit tests added/updated
  - Added comprehensive tests for `useUndo.ts` and `useRedo.ts`
  - Updated tests for `useCanvasCommands.ts` (renamed from `useCanvasMutations.test.ts`)
  - Updated integration tests for undo/redo scenarios
- [x] Manual testing performed
  - Tested drag undo/redo functionality
  - Tested perspective operations undo/redo
  - Tested create/update/delete operations for all entity types
  - Verified redo doesn't double-record commands
- [x] Integration tests pass
  - All existing tests updated and passing
  - New integration tests for undo/redo scenarios
- [x] Build succeeds
  - TypeScript compilation successful
  - No linter errors

## Related Issues

Related to the undo/redo implementation plan: `.cursor/plans/fix-undo-redo-gaps-and-bugs-370d15b7.plan.md`

## Additional Notes

### Files Changed
- **40 files changed**: 3,832 insertions(+), 292 deletions(-)
- **New files**: `useCanvasCommands.ts`, `usePerspectiveCommands.ts`, `useRedo.ts`, comprehensive test files
- **Renamed files**: `useCanvasMutations.ts` → `useCanvasCommands.ts`, `usePerspectiveMutations.ts` → `usePerspectiveCommands.ts`
- **Deleted files**: Old mutation hook files after migration

### Architecture Decisions
- **Command Pattern**: All undoable operations are recorded as commands, making the system extensible and maintainable
- **Operation Grouping**: Related mutations are grouped by `operationId` for better UX (e.g., all drag updates are one undo entry)
- **Separation of Concerns**: Action hooks handle database operations, command hooks handle undo/redo tracking
- **Scope Definition**: Undo/redo applies only to map-scoped operations (concepts, relationships, comments, perspectives, map metadata). Map-level operations (create/delete maps, sharing) are intentionally excluded.

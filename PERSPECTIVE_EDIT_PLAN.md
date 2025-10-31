# Perspective Editing Implementation Plan

## Overview
Add perspective editing functionality where users can click concepts on the canvas to toggle their inclusion/exclusion in the perspective. All perspective state is stored in InstantDB (no local React state for model data).

## Key Principles

1. **InstantDB for Model State**: All perspective conceptIds/relationshipIds are stored in InstantDB. No local useState for model data.
2. **UI State Only**: Only truly ephemeral UI state (like "is dragging", "is editing") goes in Zustand/useState.
3. **Real-time Updates**: Use `db.useQuery()` to read perspective data - changes propagate automatically.
4. **Direct Updates**: When toggling concepts, update InstantDB directly via `db.transact()` - no intermediate state.

## Current State Analysis

### Problems Identified:
1. `PerspectiveEditor` uses local `useState` for `selectedConceptIds` and `selectedRelationshipIds` - these should come from InstantDB
2. `useConcepts()` and `useRelationships()` filter by perspective when `currentPerspectiveId` is set - this prevents showing all concepts when editing
3. `ConceptNode` doesn't handle perspective editing clicks
4. Canvas doesn't show greyed-out concepts when editing perspective
5. No mechanism to toggle concepts directly to InstantDB when clicking on canvas

### Current Architecture:
- `usePerspectives()` - reads from InstantDB ✓
- `usePerspectiveActions()` - updates InstantDB ✓
- `useConcepts()` - filters by perspective when `currentPerspectiveId` is set
- `useRelationships()` - filters by perspective when `currentPerspectiveId` is set
- `ConceptMapCanvas` - renders nodes/edges from hooks
- `ConceptNode` - handles clicks for editor opening

## Implementation Plan

### Phase 1: Separate View vs Edit Mode

**Goal**: Distinguish between viewing a perspective (show only selected concepts) and editing a perspective (show all concepts, grey out non-selected).

**Changes**:
1. Add `isEditingPerspective: boolean` to `mapStore` (UI state only)
2. Create `useAllConcepts()` hook - always returns ALL concepts for map (no perspective filter)
3. Create `useAllRelationships()` hook - always returns ALL relationships for map (no perspective filter)
4. Modify `ConceptMapCanvas` to:
   - Use `useAllConcepts()` and `useAllRelationships()` when `isEditingPerspective === true`
   - Use `useConcepts()` and `useRelationships()` when `isEditingPerspective === false` or no perspective selected
5. Modify `ConceptNode` to:
   - Check if `isEditingPerspective` is true
   - If true, check if concept is in perspective (grey out if not)
   - Handle Shift+Click to toggle concept inclusion (updates InstantDB directly)

### Phase 2: Canvas Toggle Functionality

**Goal**: Allow clicking concepts on canvas to toggle their inclusion in the perspective.

**Changes**:
1. Modify `ConceptNode`:
   - Add prop `isInPerspective: boolean` (computed from current perspective data)
   - Add prop `isEditingPerspective: boolean` (from mapStore)
   - When `isEditingPerspective && event.shiftKey`:
     - Prevent default editor opening
     - Call `toggleConceptInPerspective()` action
   - Style node with reduced opacity when `!isInPerspective && isEditingPerspective`
2. Create `usePerspectiveActions().toggleConceptInPerspective()`:
   - Reads current perspective from InstantDB
   - Adds/removes conceptId from conceptIds array
   - Updates InstantDB directly via `db.transact()`
   - Also handles relationship cleanup (remove relationships if both concepts not selected)

### Phase 3: Visual Feedback

**Goal**: Show visual distinction between selected and non-selected concepts during editing.

**Changes**:
1. Modify `ConceptNode` styling:
   - When `isEditingPerspective && !isInPerspective`:
     - Apply `opacity: 0.3` or `opacity: 0.5`
     - Apply `filter: grayscale(1)` or similar
     - Keep node interactive (clickable)
2. Update `ConceptMapCanvas`:
   - Pass `isInPerspective` prop to ConceptNode via node data
   - Pass `isEditingPerspective` flag via node data

### Phase 4: Relationships Handling

**Goal**: Automatically handle relationships when concepts are toggled.

**Changes**:
1. In `toggleConceptInPerspective()`:
   - When removing a concept:
     - Remove all relationships where this concept is fromConceptId or toConceptId
   - When adding a concept:
     - Optionally auto-add relationships where both concepts are now selected
   - Update perspective relationshipIds accordingly

### Phase 5: Perspective Editor Integration

**Goal**: Make PerspectiveEditor use InstantDB data directly, remove local state.

**Changes**:
1. Modify `PerspectiveEditor`:
   - Remove `useState` for `selectedConceptIds` and `selectedRelationshipIds`
   - Read perspective data directly from `usePerspectives()` hook
   - Update InstantDB immediately when toggling in sidebar (no "Save" button needed)
   - Keep "Save" button only for name changes, or remove entirely
2. Make sidebar checkboxes reactive to InstantDB changes

### Phase 6: Edge Cases & Polish

**Changes**:
1. Handle edge cases:
   - Prevent editing when no perspective selected
   - Handle rapid clicks (debounce/throttle InstantDB updates)
   - Show loading state during updates
   - Handle errors gracefully
2. Update UI:
   - Show indicator when in "edit perspective" mode
   - Update PerspectiveEditor to show current state from InstantDB
   - Remove "Save Changes" button if using immediate updates

## File Changes Summary

### New Files:
- None (using existing hooks/stores)

### Modified Files:

1. **`src/stores/mapStore.ts`**
   - Add `isEditingPerspective: boolean` flag
   - Add `setIsEditingPerspective: (on: boolean) => void`

2. **`src/hooks/useConcepts.ts`**
   - Add `useAllConcepts()` hook (no perspective filter)

3. **`src/hooks/useRelationships.ts`**
   - Add `useAllRelationships()` hook (no perspective filter)

4. **`src/hooks/usePerspectiveActions.ts`**
   - Add `toggleConceptInPerspective(perspectiveId, conceptId)` function
   - Add `toggleRelationshipInPerspective(perspectiveId, relationshipId)` function

5. **`src/components/graph/ConceptMapCanvas.tsx`**
   - Add `isEditingPerspective` check from mapStore
   - Use `useAllConcepts()`/`useAllRelationships()` when editing
   - Pass `isInPerspective` and `isEditingPerspective` to node data

6. **`src/components/concept/ConceptNode.tsx`**
   - Add `isInPerspective` prop from node data
   - Add `isEditingPerspective` prop from node data
   - Handle Shift+Click to toggle (when editing)
   - Apply greyed-out styling when not in perspective
   - Import `usePerspectiveActions` and `useMapStore`

7. **`src/components/perspective/PerspectiveEditor.tsx`**
   - Remove local `useState` for selection
   - Read from InstantDB via `usePerspectives()`
   - Update InstantDB immediately on toggle
   - Remove "Save Changes" button (or keep only for name)

8. **`src/lib/data.ts`**
   - Update `conceptsToNodes()` to accept `isInPerspective` and `isEditingPerspective` params
   - Pass through to node data

## State Flow

### Viewing Perspective (default):
```
currentPerspectiveId set → useConcepts() filters → ConceptMapCanvas shows filtered nodes
```

### Editing Perspective:
```
isEditingPerspective = true → useAllConcepts() no filter → ConceptMapCanvas shows all nodes
→ ConceptNode checks isInPerspective → applies grey styling if not included
→ Shift+Click → toggleConceptInPerspective() → db.transact() → InstantDB updated
→ usePerspectives() re-renders → ConceptNode updates styling
```

## Key Implementation Details

### Preventing Re-render Issues:
- Use `db.useQuery()` for perspective data - React will re-render when InstantDB updates
- Don't store perspective conceptIds in local state - always read from InstantDB
- Use `useMemo` for expensive computations (checking if concept is in perspective)
- Pass `isInPerspective` as part of node data (stable reference)

### InstantDB Update Pattern:
```typescript
const toggleConceptInPerspective = async (perspectiveId: string, conceptId: string) => {
  // Read current perspective
  const { data } = await db.query({ perspectives: { $: { where: { id: perspectiveId } } } })
  const perspective = data?.perspectives?.[0]
  const conceptIds = perspective?.conceptIds ? JSON.parse(perspective.conceptIds) : []
  
  // Toggle
  const newConceptIds = conceptIds.includes(conceptId)
    ? conceptIds.filter(id => id !== conceptId)
    : [...conceptIds, conceptId]
  
  // Update InstantDB
  await db.transact([
    tx.perspectives[perspectiveId].update({
      conceptIds: JSON.stringify(newConceptIds)
    })
  ])
}
```

## Testing Considerations

1. **Visual**: Nodes should grey out when not in perspective (when editing)
2. **Interaction**: Shift+Click should toggle inclusion immediately
3. **Persistence**: Changes should persist after page refresh
4. **Real-time**: Changes from other users should appear automatically
5. **Relationships**: Removing a concept should remove its relationships
6. **Performance**: No unnecessary re-renders when toggling


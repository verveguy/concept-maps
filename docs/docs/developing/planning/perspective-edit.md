# Perspective Editing Implementation Plan

## Status: ✅ COMPLETED

This feature has been fully implemented. This document serves as historical reference for the implementation approach.

## Overview
Perspective editing functionality allows users to click concepts on the canvas to toggle their inclusion/exclusion in the perspective. All perspective state is stored in InstantDB (no local React state for model data).

## Key Principles

1. **InstantDB for Model State**: All perspective conceptIds/relationshipIds are stored in InstantDB. No local useState for model data.
2. **UI State Only**: Only truly ephemeral UI state (like "is dragging", "is editing") goes in Zustand/useState.
3. **Real-time Updates**: Use `db.useQuery()` to read perspective data - changes propagate automatically.
4. **Direct Updates**: When toggling concepts, update InstantDB directly via `db.transact()` - no intermediate state.

## Implementation Summary

### ✅ Completed Features:

1. **View vs Edit Mode Separation**:
   - `isEditingPerspective` flag added to `mapStore` (UI state only) ✓
   - `useAllConcepts()` hook created - always returns ALL concepts for map (no perspective filter) ✓
   - `useAllRelationships()` hook created - always returns ALL relationships for map (no perspective filter) ✓
   - `ConceptMapCanvas` uses `useAllConcepts()`/`useAllRelationships()` when editing ✓
   - `ConceptMapCanvas` uses `useConcepts()`/`useRelationships()` when viewing ✓

2. **Canvas Toggle Functionality**:
   - `ConceptNode` handles Shift+Click to toggle concept inclusion ✓
   - `toggleConceptInPerspective()` function in `usePerspectiveActions()` ✓
   - `toggleRelationshipInPerspective()` function in `usePerspectiveActions()` ✓
   - Automatic relationship cleanup when concepts are removed ✓
   - Automatic relationship addition when concepts are added ✓

3. **Visual Feedback**:
   - Nodes greyed out (opacity 0.3, grayscale filter) when not in perspective during editing ✓
   - `isInPerspective` and `isEditingPerspective` props passed to ConceptNode via node data ✓

4. **PerspectiveEditor Integration**:
   - `PerspectiveEditor` reads perspective data directly from InstantDB via `usePerspectives()` ✓
   - No local `useState` for `selectedConceptIds` and `selectedRelationshipIds` ✓
   - Immediate updates to InstantDB when toggling in sidebar ✓
   - Edit/View mode toggle button ✓

### Current Architecture:
- `usePerspectives()` - reads from InstantDB ✓
- `usePerspectiveActions()` - updates InstantDB, includes toggle functions ✓
- `useConcepts()` - filters by perspective when viewing ✓
- `useAllConcepts()` - returns all concepts when editing ✓
- `useRelationships()` - filters by perspective when viewing ✓
- `useAllRelationships()` - returns all relationships when editing ✓
- `ConceptMapCanvas` - conditionally uses filtered/unfiltered hooks based on edit mode ✓
- `ConceptNode` - handles Shift+Click to toggle, shows greyed-out styling ✓
- `PerspectiveEditor` - reads from InstantDB, immediate updates ✓

## Implementation Details

### Phase 1: Separate View vs Edit Mode ✅

**Completed**: Distinguish between viewing a perspective (show only selected concepts) and editing a perspective (show all concepts, grey out non-selected).

**Implementation**:
- `isEditingPerspective: boolean` added to `mapStore` (UI state only)
- `useAllConcepts()` hook created - always returns ALL concepts for map (no perspective filter)
- `useAllRelationships()` hook created - always returns ALL relationships for map (no perspective filter)
- `ConceptMapCanvas` conditionally uses hooks based on `isEditingPerspective` flag
- `ConceptNode` checks `isEditingPerspective` and applies visual styling

### Phase 2: Canvas Toggle Functionality ✅

**Completed**: Allow clicking concepts on canvas to toggle their inclusion in the perspective.

**Implementation**:
- `ConceptNode` handles Shift+Click to toggle concept inclusion
- `isInPerspective` and `isEditingPerspective` props passed via node data
- `toggleConceptInPerspective()` function in `usePerspectiveActions()`
- Updates InstantDB directly via `db.transact()`

### Phase 3: Visual Feedback ✅

**Completed**: Show visual distinction between selected and non-selected concepts during editing.

**Implementation**:
- `ConceptNode` applies `opacity: 0.3` and `filter: grayscale(0.5)` when `isEditingPerspective && !isInPerspective`
- Nodes remain interactive (clickable) when greyed out
- `ConceptMapCanvas` passes `isInPerspective` and `isEditingPerspective` via node data

### Phase 4: Relationships Handling ✅

**Completed**: Automatically handle relationships when concepts are toggled.

**Implementation**:
- `toggleConceptInPerspective()` removes relationships when concept is removed
- `toggleConceptInPerspective()` auto-adds relationships when both concepts are selected
- `toggleRelationshipInPerspective()` function for manual relationship toggling

### Phase 5: Perspective Editor Integration ✅

**Completed**: Make PerspectiveEditor use InstantDB data directly, remove local state.

**Implementation**:
- `PerspectiveEditor` reads from `usePerspectives()` hook (no local state for selections)
- Immediate updates to InstantDB when toggling checkboxes
- Name changes saved on blur/Enter
- Edit/View mode toggle button

### Phase 6: Edge Cases & Polish ✅

**Completed**: Handle edge cases and polish UI.

**Implementation**:
- Edit mode indicator in PerspectiveEditor
- Error handling for failed updates
- Real-time updates via InstantDB subscriptions
- Visual feedback for edit mode

## Files Modified

### ✅ Completed Changes:

1. **`src/stores/mapStore.ts`**
   - ✅ Added `isEditingPerspective: boolean` flag
   - ✅ Added `setIsEditingPerspective: (on: boolean) => void`

2. **`src/hooks/useConcepts.ts`**
   - ✅ Added `useAllConcepts()` hook (no perspective filter)

3. **`src/hooks/useRelationships.ts`**
   - ✅ Added `useAllRelationships()` hook (no perspective filter)

4. **`src/hooks/usePerspectiveActions.ts`**
   - ✅ Added `toggleConceptInPerspective()` function
   - ✅ Added `toggleRelationshipInPerspective()` function

5. **`src/components/graph/ConceptMapCanvas.tsx`**
   - ✅ Added `isEditingPerspective` check from mapStore
   - ✅ Uses `useAllConcepts()`/`useAllRelationships()` when editing
   - ✅ Passes `isInPerspective` and `isEditingPerspective` to node data

6. **`src/components/concept/ConceptNode.tsx`**
   - ✅ Reads `isInPerspective` and `isEditingPerspective` from node data
   - ✅ Handles Shift+Click to toggle (when editing)
   - ✅ Applies greyed-out styling when not in perspective

7. **`src/components/perspective/PerspectiveEditor.tsx`**
   - ✅ Removed local `useState` for selection
   - ✅ Reads from InstantDB via `usePerspectives()`
   - ✅ Updates InstantDB immediately on toggle
   - ✅ Edit/View mode toggle button

8. **`src/lib/data.ts`**
   - ✅ `conceptsToNodes()` accepts `isInPerspective` and `isEditingPerspective` params
   - ✅ Passes through to node data

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


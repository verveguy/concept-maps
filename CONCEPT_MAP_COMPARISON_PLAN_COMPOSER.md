# Concept Map Comparison Feature - Implementation Plan

## Overview

Enable team members to compare their individual concept maps for a shared Domain, visualize differences and similarities, and collaboratively reconcile differences to create a shared, agreed-upon concept map.

## Core Requirements

1. **Team Management**: Multiple users organized into Teams
2. **Domain Organization**: Concept maps grouped by Domain (e.g., "Microservices Architecture", "Customer Journey")
3. **Individual Map Creation**: Each team member creates their own concept map for a Domain
4. **Comparison Visualization**: Visualize similarities and differences between maps
5. **Interactive Exploration**: Multi-user interactive comparison sessions
6. **Reconciliation**: Help team members merge differences into a shared map

## New Entities

### Domain Entity

A Domain represents a topic/subject area that team members will create concept maps for.

**Attributes:**
- `id`: string (auto-generated)
- `name`: string (indexed) - e.g., "Microservices Architecture"
- `description`: string (optional) - description of the domain
- `teamId`: string (indexed) - links to Team
- `createdBy`: string (indexed) - userId who created the domain
- `createdAt`: number (indexed)
- `updatedAt`: number (indexed)

**Links:**
- `domainsTeam`: Domain -> Team (many-to-one)
- `mapsDomain`: Map -> Domain (many-to-one)

### Team Entity

A Team represents a group of users who collaborate on domains and concept maps.

**Attributes:**
- `id`: string (auto-generated)
- `name`: string (indexed) - e.g., "Engineering Team"
- `description`: string (optional)
- `createdBy`: string (indexed) - userId who created the team
- `createdAt`: number (indexed)
- `updatedAt`: number (indexed)

**Links:**
- `teamsMembers`: Team -> TeamMember (one-to-many)
- `teamsDomains`: Team -> Domain (one-to-many)

### TeamMember Entity

Represents membership of a user in a team, with role information.

**Attributes:**
- `id`: string (auto-generated)
- `teamId`: string (indexed) - links to Team
- `userId`: string (indexed) - links to User (via InstantDB auth)
- `role`: string (indexed) - 'owner' | 'admin' | 'member'
- `joinedAt`: number (indexed)
- `invitedBy`: string (indexed) - userId who invited/added member

**Links:**
- `teamMembersTeam`: TeamMember -> Team (many-to-one)

### DomainMap Entity (Updated)

Modify existing `maps` entity to include `domainId`:

**Additional Attributes:**
- `domainId`: string (indexed) - links Map to Domain

**Additional Links:**
- `mapsDomain`: Map -> Domain (many-to-one)

### ComparisonSession Entity

Represents an active comparison session where team members are comparing maps.

**Attributes:**
- `id`: string (auto-generated)
- `domainId`: string (indexed) - Domain being compared
- `mapIds`: string (indexed) - JSON array of map IDs being compared
- `createdBy`: string (indexed) - userId who created the session
- `createdAt`: number (indexed)
- `updatedAt`: number (indexed)
- `state`: string (indexed) - 'exploring' | 'reconciling' | 'completed'
- `sharedMapId`: string (optional) - if reconciled, link to the shared map

**Links:**
- `comparisonSessionsDomain`: ComparisonSession -> Domain (many-to-one)

### SharedMap Entity (Optional)

A reconciled map that represents the team's agreed-upon understanding.

**Attributes:**
- `id`: string (auto-generated)
- `domainId`: string (indexed)
- `name`: string (indexed) - e.g., "Shared [Domain Name] Map"
- `createdBy`: string (indexed) - userId who initiated reconciliation
- `createdAt`: number (indexed)
- `updatedAt`: number (indexed)
- `sourceMapIds`: string (optional) - JSON array of map IDs that were merged

**Links:**
- `sharedMapsDomain`: SharedMap -> Domain (many-to-one)

## Comparison Visualization Approaches

### Option 1: Side-by-Side Comparison (Pairwise)

**Approach**: Compare two maps at a time in a split-screen view.

**Pros:**
- Simple to implement and understand
- Easy to see differences clearly
- Familiar UI pattern
- Good for detailed analysis

**Cons:**
- Requires multiple comparisons for N maps (N*(N-1)/2 pairs)
- Can't see all differences at once
- May require multiple sessions

**Visualization:**
- Split canvas: Left map vs Right map
- Synchronized pan/zoom
- Color coding:
  - Green: Concepts/relationships present in both maps (similar)
  - Red: Concepts/relationships unique to left map
  - Blue: Concepts/relationships unique to right map
  - Yellow: Concepts present in both but with different relationships
- Side panel showing:
  - Common concepts (green)
  - Unique to Map A (red)
  - Unique to Map B (blue)
  - Differences in relationships (yellow)

### Option 2: Unified Overlay View

**Approach**: Overlay all maps on a single canvas with visual indicators.

**Pros:**
- See all maps simultaneously
- Quick overview of all differences
- Good for identifying consensus areas

**Cons:**
- Can become cluttered with many maps
- Harder to see individual map structures
- Complex visual encoding needed

**Visualization:**
- Single canvas with all maps overlaid
- Concepts:
  - Size/opacity indicates how many maps contain it
  - Color gradient shows consensus (green = all maps, red = only one map)
- Relationships:
  - Thickness indicates frequency across maps
  - Dashed = only in some maps, solid = in all maps
- Legend showing map-to-color mapping
- Filter controls to show/hide specific maps

### Option 3: Matrix/Heatmap View

**Approach**: Show concepts/relationships in a matrix with heatmap indicating presence.

**Pros:**
- Clear quantitative view of differences
- Easy to identify outliers
- Good for large numbers of maps

**Cons:**
- Less visual/spatial (doesn't preserve map structure)
- May not show relationship differences well
- Requires different mental model

**Visualization:**
- Rows: Concepts or Concept-Relationship-Concept triples
- Columns: Maps
- Cells: Color intensity shows presence/absence
- Sidebar: Concept similarity scores

### Option 4: Progressive Merging (Recommended)

**Approach**: Start with unified overlay, allow pairwise deep-dive, then progressive reconciliation.

**Pros:**
- Combines benefits of multiple approaches
- Supports iterative exploration
- Natural workflow from exploration to reconciliation

**Cons:**
- More complex to implement
- Requires mode switching

**Workflow:**
1. **Overview Mode**: Unified overlay showing all maps
2. **Compare Mode**: Side-by-side comparison of selected maps
3. **Reconcile Mode**: Collaborative editing of shared map

## Reconciliation Workflow

### Phase 1: Exploration

**Goal**: Team members explore and understand differences in their mental models.

**Features:**
- View all maps together (unified overlay)
- Select specific maps to compare (pairwise comparison)
- Filter concepts by:
  - Present in all maps (consensus)
  - Present in some maps (disagreement)
  - Unique to one map (outlier)
- Filter relationships by:
  - Same relationship exists in all maps
  - Different relationships between same concepts
  - Unique relationships

**UI:**
- Map selector (checkboxes to show/hide maps)
- Concept similarity indicators
- Relationship conflict indicators
- Comments/annotations on differences

### Phase 2: Discussion

**Goal**: Team members discuss and understand why differences exist.

**Features:**
- Comment threads on specific concepts/relationships
- Highlight differences for discussion
- Tag concepts/relationships with discussion topics
- Record decisions/reasons for differences

**UI:**
- Comment system integrated with concepts/relationships
- Discussion panel
- Vote/agree on concepts/relationships

### Phase 3: Reconciliation

**Goal**: Create a shared map that incorporates all team members' perspectives.

**Features:**
- Create new "Shared Map" from Domain
- Collaborative editing with real-time presence
- Merge concepts:
  - Auto-merge identical concepts (same label)
  - Manual merge for similar concepts (different labels)
  - Keep unique concepts if agreed upon
- Merge relationships:
  - Auto-merge identical relationships
  - Resolve conflicts (different labels for same edge)
  - Add missing relationships
- Track source of each concept/relationship (which maps contributed)

**UI:**
- Split view: Individual maps on left, Shared map on right
- Drag-and-drop to add concepts from individual maps
- Conflict resolution dialog for concept/relationship differences
- Attribution badges showing which map(s) contributed each element

### Phase 4: Validation

**Goal**: Team members review and approve the shared map.

**Features:**
- Side-by-side comparison: Shared map vs Individual maps
- Highlight what changed/merged
- Approval workflow (each team member approves)
- Version history of reconciliation process

**UI:**
- Approval status indicators
- Diff view showing changes
- Finalize button (only when all approve)

## Technical Implementation Considerations

### Concept Matching Algorithm

Need to identify when concepts across maps represent the same concept:

**Simple Matching:**
- Exact label match (case-insensitive)
- Normalized label match (remove punctuation, whitespace)

**Fuzzy Matching:**
- String similarity (Levenshtein distance)
- Semantic similarity (if we add embeddings later)
- Manual mapping (user can indicate concepts are the same)

**Relationship Matching:**
- Same fromConcept and toConcept (using matched concepts)
- Same relationship labels (exact or fuzzy)

### Data Structure for Comparison

**Concept Comparison Result:**
```typescript
interface ConceptComparison {
  conceptId: string // from one of the maps
  mapsPresent: string[] // map IDs containing this concept
  label: string // concept label (may differ slightly)
  similarityScore: number // 0-1, how similar labels are
  relationships: RelationshipComparison[] // relationships involving this concept
}
```

**Relationship Comparison Result:**
```typescript
interface RelationshipComparison {
  fromConceptId: string
  toConceptId: string
  mapsPresent: string[] // map IDs containing this relationship
  labels: Record<string, string> // map ID -> label used in that map
  conflict: boolean // true if labels differ significantly
}
```

### Performance Considerations

- **Large Maps**: May need lazy loading/pagination for maps with many concepts
- **Real-time Updates**: All comparison views should update in real-time as maps change
- **Caching**: Cache comparison results, invalidate when maps change
- **Web Workers**: Perform heavy comparison calculations in Web Workers

### UI State Management

**New Zustand Store: `comparisonStore.ts`**

```typescript
interface ComparisonState {
  currentDomainId: string | null
  selectedMapIds: string[] // maps to compare
  comparisonMode: 'overview' | 'pairwise' | 'reconcile'
  pairwiseLeftMapId: string | null
  pairwiseRightMapId: string | null
  filterMode: 'all' | 'consensus' | 'conflicts' | 'unique'
  reconcilingMapId: string | null // shared map being created
}
```

## Implementation Phases

### Phase 1: Schema Extensions

**Goal**: Add Domain, Team, TeamMember entities and update Map to include domainId.

**Tasks:**
1. Update `instant.schema.ts` with new entities and links
2. Update `instant-schema.json` (push to InstantDB)
3. Update TypeScript types in `lib/schema.ts`
4. Create migration script/data for existing maps (optional domainId)

**Files:**
- `src/instant.schema.ts` - Add Domain, Team, TeamMember entities
- `src/lib/schema.ts` - Add TypeScript types
- `src/instant-schema.json` - Update schema JSON

### Phase 2: Team and Domain Management

**Goal**: Allow users to create teams, add members, and create domains.

**Tasks:**
1. Create hooks: `useTeams()`, `useTeamMembers()`, `useDomains()`
2. Create actions: `useTeamActions()`, `useDomainActions()`
3. Create UI components:
   - Team creation/management page
   - Domain creation/management page
   - Team member invitation UI
4. Update Map creation to require Domain selection

**Files:**
- `src/hooks/useTeams.ts`
- `src/hooks/useTeamMembers.ts`
- `src/hooks/useDomains.ts`
- `src/hooks/useTeamActions.ts`
- `src/hooks/useDomainActions.ts`
- `src/components/team/TeamManagement.tsx`
- `src/components/domain/DomainManagement.tsx`
- `src/pages/TeamPage.tsx`
- `src/pages/DomainPage.tsx`

### Phase 3: Comparison Core Logic

**Goal**: Implement comparison algorithms and data structures.

**Tasks:**
1. Create comparison utilities:
   - Concept matching algorithm
   - Relationship matching algorithm
   - Comparison result generation
2. Create hooks: `useMapComparison()`
3. Performance optimization (Web Workers if needed)

**Files:**
- `src/lib/comparison.ts` - Core comparison algorithms
- `src/lib/matching.ts` - Concept/relationship matching
- `src/hooks/useMapComparison.ts` - React hook for comparison data

### Phase 4: Comparison Visualization - Overview Mode

**Goal**: Implement unified overlay view showing all maps.

**Tasks:**
1. Create `ComparisonCanvas` component
2. Implement unified overlay rendering:
   - Merge all maps onto single canvas
   - Color coding for consensus/conflicts
   - Map visibility toggles
3. Create comparison controls UI
4. Real-time updates as maps change

**Files:**
- `src/components/comparison/ComparisonCanvas.tsx`
- `src/components/comparison/ComparisonControls.tsx`
- `src/components/comparison/MapSelector.tsx`
- `src/components/comparison/ConceptLegend.tsx`

### Phase 5: Comparison Visualization - Pairwise Mode

**Goal**: Implement side-by-side comparison view.

**Tasks:**
1. Create `PairwiseComparisonView` component
2. Implement split-screen layout
3. Synchronized pan/zoom
4. Color coding for differences
5. Side panel showing comparison statistics

**Files:**
- `src/components/comparison/PairwiseComparisonView.tsx`
- `src/components/comparison/ComparisonSidebar.tsx`
- `src/components/comparison/DifferenceHighlights.tsx`

### Phase 6: Reconciliation Interface

**Goal**: Enable collaborative creation of shared map.

**Tasks:**
1. Create reconciliation UI:
   - Split view: individual maps + shared map
   - Drag-and-drop to add concepts
   - Conflict resolution dialogs
2. Implement merge actions:
   - Merge concepts
   - Merge relationships
   - Resolve conflicts
3. Track attribution (which maps contributed each element)

**Files:**
- `src/components/reconciliation/ReconciliationView.tsx`
- `src/components/reconciliation/MergeDialog.tsx`
- `src/components/reconciliation/ConflictResolver.tsx`
- `src/hooks/useReconciliation.ts`

### Phase 7: Discussion and Comments

**Goal**: Enable team discussion about differences.

**Tasks:**
1. Create comment system for concepts/relationships
2. Threading and replies
3. Integration with comparison views
4. Notification system for mentions

**Files:**
- `src/components/comments/CommentThread.tsx`
- `src/components/comments/CommentPanel.tsx`
- `src/hooks/useComments.ts`
- Database schema: Add `comments` entity

### Phase 8: Comparison Session Management

**Goal**: Manage comparison sessions and state.

**Tasks:**
1. Create `ComparisonSession` entity and hooks
2. Create session UI:
   - Start new comparison session
   - Resume existing session
   - Session history
3. Save comparison state and resume later

**Files:**
- `src/hooks/useComparisonSessions.ts`
- `src/components/comparison/SessionManager.tsx`
- `src/pages/ComparisonPage.tsx`

### Phase 9: Validation and Approval

**Goal**: Final review and approval workflow.

**Tasks:**
1. Create approval workflow
2. Diff view showing reconciliation changes
3. Approval status tracking
4. Finalize shared map

**Files:**
- `src/components/reconciliation/ApprovalWorkflow.tsx`
- `src/components/reconciliation/DiffView.tsx`
- `src/hooks/useApproval.ts`

### Phase 10: Polish and Optimization

**Tasks:**
1. Performance optimization
2. UI/UX improvements
3. Error handling
4. Loading states
5. Tutorial/onboarding

## Alternative Approaches to Consider

### Simpler MVP Approach

**Start with:**
- Domain entity (no Teams initially - use existing sharing)
- Simple pairwise comparison only
- Manual reconciliation (no automated merging)
- No comments/discussion initially

**Then add:**
- Teams
- Unified overlay view
- Automated merging
- Discussion features

### Advanced Features (Future)

- **Semantic Similarity**: Use embeddings to find similar concepts even with different labels
- **AI-Assisted Merging**: Suggest merges based on similarity
- **Change Tracking**: Track how shared map evolves over time
- **Map Versioning**: Version control for maps
- **Export Comparison Reports**: Generate PDF/HTML reports of differences
- **Comparison Templates**: Save comparison configurations

## Open Questions

1. **Teams vs Sharing**: Do we need Teams entity, or can we use existing Shares system?
   - Teams provide better organization and multi-user collaboration
   - Shares are simpler but less structured
   - Recommendation: Start with Teams for better UX

2. **Domain Scope**: Can a map belong to multiple domains?
   - Initial: One domain per map (simpler)
   - Future: Many-to-many relationship

3. **Comparison Granularity**: Compare entire maps or specific perspectives?
   - Initial: Entire maps
   - Future: Compare perspectives within maps

4. **Shared Map Ownership**: Who owns the shared map?
   - Option: Team-owned (all members can edit)
   - Option: Created by Domain creator
   - Recommendation: Team-owned with role-based permissions

5. **Real-time Updates**: Should comparison views update in real-time as maps are edited?
   - Yes, for collaborative exploration
   - Consider debouncing for performance

6. **Comparison Persistence**: Should comparison results be saved?
   - Option: Ephemeral (recalculate on demand)
   - Option: Persist comparison results for performance
   - Recommendation: Cache with invalidation

## Next Steps

1. **Review and Refine Plan**: Get feedback on this plan
2. **Choose Comparison Approach**: Decide on Option 1-4 or hybrid
3. **Prototype Core Comparison**: Build simple comparison algorithm
4. **User Testing**: Test comparison visualization with sample maps
5. **Iterate on Design**: Refine based on user feedback
6. **Implement Phases**: Start with Phase 1 (Schema Extensions)

## Related Files to Modify

- `src/instant.schema.ts` - Add new entities
- `src/lib/schema.ts` - Add TypeScript types  
- `src/stores/mapStore.ts` - Add comparison state (or create new store)
- `src/components/graph/ConceptMapCanvas.tsx` - May need comparison mode
- `src/pages/MapPage.tsx` - Add comparison mode toggle

## Dependencies

- Existing React Flow components
- InstantDB real-time subscriptions
- Zustand for UI state
- May need: Graph analysis libraries (for comparison algorithms)
- May need: String similarity libraries (fuzzy matching)

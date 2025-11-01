# Concept Map Comparison Feature - Integrated Implementation Plan

## Overview

Enable team members to compare their individual concept maps for a shared Domain, visualize differences and similarities, and collaboratively reconcile differences to create a shared, agreed-upon concept map.

**Core Goal**: Help teams discover differences in their mental models and work together to reconcile those differences into a shared, agreed-upon concept map.

### Key Principles

1. **InstantDB for Model State**: All data (domains, teams, comparison state) stored in InstantDB
2. **Real-time Collaboration**: Multiple team members can explore comparisons simultaneously
3. **Non-destructive**: Original maps remain unchanged during comparison/reconciliation
4. **Progressive Disclosure**: Start simple (pairwise), allow complexity (multi-map)
5. **Visual Clarity**: Clear visual distinction between common, unique, and conflicting elements
6. **Backward Compatibility**: Maintain support for standalone (non-team) map editing

## Success Criteria

- Teams can associate maps with domains and view all maps for a given domain in one place
- Users can enter a comparison workspace that visualizes similarities and differences across maps
- The comparison experience supports real-time, multi-user collaboration (presence, shared focus, annotations)
- The workflow guides the team toward reconciling differences and producing an updated shared map that everyone agrees on
- The solution scales to domains with many concepts/relationships (performance and layout considerations)

## Data Model Changes

### New Entities

#### 1. Teams

**Purpose**: Group users together for collaboration on domains.

**Attributes:**
- `id`: string (auto-generated)
- `name`: string (indexed) - e.g., "Engineering Team"
- `description`: string (optional)
- `createdBy`: string (indexed) - userId who created the team
- `createdAt`: number (indexed)
- `updatedAt`: number (indexed)

**InstantDB Schema:**
```typescript
teams: i.entity({
  name: i.string().indexed(),
  description: i.string().optional(),
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
})
```

#### 2. Team Memberships

**Purpose**: Define which users belong to which teams and their roles.

**Attributes:**
- `id`: string (auto-generated)
- `teamId`: string (indexed) - links to Team
- `userId`: string (indexed) - links to User (via InstantDB auth)
- `role`: string (indexed) - 'owner' | 'admin' | 'member'
- `joinedAt`: number (indexed)
- `invitedBy`: string (indexed) - userId who invited/added member (optional)

**InstantDB Schema:**
```typescript
teamMemberships: i.entity({
  teamId: i.string().indexed(),
  userId: i.string().indexed(),
  role: i.string().indexed(), // 'owner' | 'admin' | 'member'
  joinedAt: i.number().indexed(),
  invitedBy: i.string().indexed().optional(),
})
```

#### 3. Domains

**Purpose**: Define a subject area for which multiple maps can be created and compared.

**Attributes:**
- `id`: string (auto-generated)
- `name`: string (indexed) - e.g., "Microservices Architecture"
- `description`: string (optional) - description of the domain
- `teamId`: string (indexed) - links to Team (nullable for individual users)
- `createdBy`: string (indexed) - userId who created the domain
- `createdAt`: number (indexed)
- `updatedAt`: number (indexed)

**InstantDB Schema:**
```typescript
domains: i.entity({
  name: i.string().indexed(),
  description: i.string().optional(),
  teamId: i.string().indexed().optional(), // nullable for individual users
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
})
```

#### 4. Domain Maps (Link Table) - OPTIONAL APPROACH

**Question**: Should we use a direct `domainId` on maps or a link table?

**Option A: Direct domainId** (Simpler, recommended for MVP)
- Add `domainId` field directly to `maps` entity
- One-to-many relationship (one map belongs to one domain)
- Simpler queries and less complexity
- Constraint: Map can only belong to one domain

**Option B: Domain Maps Link Table** (More flexible)
- Separate `domainMaps` entity for many-to-many relationship
- Allows maps to belong to multiple domains
- More complex queries
- Better for future flexibility

**Recommendation**: Start with Option A (direct `domainId`) for MVP, migrate to Option B if needed.

**If Option A** - Modified Maps Entity:
```typescript
// Add to existing maps entity:
domainId: i.string().indexed().optional(), // nullable for legacy maps
```

**If Option B** - New Domain Maps Entity:
```typescript
domainMaps: i.entity({
  domainId: i.string().indexed(),
  mapId: i.string().indexed(),
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
})
```

#### 5. Comparison Sessions

**Purpose**: Track active comparison sessions where team members are comparing maps.

**Attributes:**
- `id`: string (auto-generated)
- `domainId`: string (indexed) - Domain being compared
- `name`: string (optional) - session name/description
- `mapIds`: string - JSON array of map IDs being compared
- `mode`: string (indexed) - 'pairwise' | 'multi' | 'overlay' | 'matrix'
- `createdBy`: string (indexed) - userId who created the session
- `createdAt`: number (indexed)
- `updatedAt`: number (indexed)
- `state`: string (indexed) - 'exploring' | 'reconciling' | 'completed'
- `sharedMapId`: string (optional) - if reconciled, link to the shared map

**InstantDB Schema:**
```typescript
comparisonSessions: i.entity({
  domainId: i.string().indexed(),
  name: i.string().optional(),
  mapIds: i.string(), // JSON array string
  mode: i.string().indexed(), // 'pairwise' | 'multi' | 'overlay' | 'matrix'
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
  state: i.string().indexed(), // 'exploring' | 'reconciling' | 'completed'
  sharedMapId: i.string().indexed().optional(),
})
```

#### 6. Consensus Maps / Shared Maps

**Question**: Should we create a separate entity or use existing maps with a flag?

**Option A: Separate ConsensusMap Entity** (Recommended)
- Tracks consensus maps separately
- Links to source comparison session
- Tracks status (draft/finalized)
- Clear separation of concerns

**Option B: Use Maps Entity with Flags**
- Add `isShared: boolean` flag to maps
- Add `sourceSessionId` and `isConsensus` fields
- Simpler schema, but mixes concerns

**Recommendation**: Option A for clarity and tracking.

**Attributes:**
- `id`: string (auto-generated)
- `domainId`: string (indexed)
- `mapId`: string (indexed) - The resulting shared map (references maps entity)
- `sourceSessionId`: string (indexed) - Which comparison session created this
- `sourceMapIds`: string (optional) - JSON array of map IDs that were merged
- `status`: string (indexed) - 'draft' | 'finalized'
- `createdBy`: string (indexed) - userId who initiated reconciliation
- `createdAt`: number (indexed)
- `finalizedAt`: number (optional)

**InstantDB Schema:**
```typescript
consensusMaps: i.entity({
  domainId: i.string().indexed(),
  mapId: i.string().indexed(),
  sourceSessionId: i.string().indexed(),
  sourceMapIds: i.string().optional(), // JSON array string
  status: i.string().indexed(), // 'draft' | 'finalized'
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  finalizedAt: i.number().optional(),
})
```

### Links (Relationships)

```typescript
links: {
  // Existing links...
  
  // NEW: Team memberships
  teamMembershipsTeam: {
    forward: { on: 'teamMemberships', has: 'many', label: 'team' },
    reverse: { on: 'teams', has: 'many', label: 'memberships' },
  },
  
  // NEW: Domains to teams
  domainsTeam: {
    forward: { on: 'domains', has: 'many', label: 'team' },
    reverse: { on: 'teams', has: 'many', label: 'domains' },
  },
  
  // NEW: Maps to domains (if using direct domainId)
  mapsDomain: {
    forward: { on: 'maps', has: 'many', label: 'domain' },
    reverse: { on: 'domains', has: 'many', label: 'maps' },
  },
  
  // OR: Domain maps links (if using link table)
  domainMapsDomain: {
    forward: { on: 'domainMaps', has: 'many', label: 'domain' },
    reverse: { on: 'domains', has: 'many', label: 'domainMaps' },
  },
  domainMapsMap: {
    forward: { on: 'domainMaps', has: 'many', label: 'map' },
    reverse: { on: 'maps', has: 'many', label: 'domainMaps' },
  },
  
  // NEW: Comparison sessions to domains
  comparisonSessionsDomain: {
    forward: { on: 'comparisonSessions', has: 'many', label: 'domain' },
    reverse: { on: 'domains', has: 'many', label: 'comparisonSessions' },
  },
  
  // NEW: Consensus maps to domains
  consensusMapsDomain: {
    forward: { on: 'consensusMaps', has: 'many', label: 'domain' },
    reverse: { on: 'domains', has: 'many', label: 'consensusMaps' },
  },
  
  // NEW: Consensus maps to maps
  consensusMapsMap: {
    forward: { on: 'consensusMaps', has: 'many', label: 'map' },
    reverse: { on: 'maps', has: 'many', label: 'consensusMaps' },
  },
}
```

## Comparison Visualization Approaches

### Approach 1: Side-by-Side Pairwise (MVP - Recommended)

**Description**: Display two maps side-by-side with visual highlighting of similarities and differences.

**Visual Indicators:**
- **Common concepts** (same label in both maps): Green border/background
- **Unique concepts** (only in one map): Blue border/background (left) / Red border/background (right)
- **Similar concepts** (fuzzy match on label): Yellow border with suggested match indicator
- **Common relationships**: Green edges
- **Unique relationships**: Gray/dashed edges with conflict indicator
- **Different relationships**: Yellow edges with conflict indicator

**Interactions:**
1. **Hover**: Show which concepts are matched between maps
2. **Click concept**: Highlight matches/similar concepts in other map
3. **Sync pan/zoom**: Optional synchronized navigation
4. **Link concepts**: Manually link similar concepts that weren't auto-matched

**Pros:**
- Simple to understand
- Clear visual distinction
- Easy to implement
- Works well for 2 maps
- Familiar UI pattern

**Cons:**
- Only compares 2 maps at a time
- Doesn't scale to 3+ maps without multiple sessions
- Screen space limited for large maps

### Approach 2: Unified Overlay View

**Description**: Overlay multiple maps on a single canvas with visual indicators.

**Visual Indicators:**
- **Concepts**: Size/opacity indicates how many maps contain it
- **Color gradient**: Shows consensus (green = all maps, red = only one map)
- **Relationships**: Thickness indicates frequency across maps
- **Dashed edges**: Only in some maps, solid = in all maps
- **Badges**: Show which users contributed each concept

**Interactions:**
1. **Filter by user**: Show/hide concepts from specific users
2. **Filter by agreement**: Show only concepts in N+ maps
3. **Click concept**: See which maps contain it, view details from each map
4. **Legend**: Map-to-color mapping

**Pros:**
- See all maps simultaneously
- Quick overview of all differences
- Good for identifying consensus areas
- Scales to 3+ maps

**Cons:**
- Can become cluttered with many maps
- Harder to see individual map structures
- Complex visual encoding needed
- Concept positioning ambiguous

### Approach 3: Matrix/Tabular View

**Description**: Show concepts/relationships in a matrix with heatmap indicating presence.

**Visual Layout:**
- Rows: Concepts or Concept-Relationship-Concept triples
- Columns: Maps
- Cells: Color intensity shows presence/absence
- Sidebar: Concept similarity scores and statistics

**Interactions:**
1. **Sort by agreement**: Show most-common concepts first
2. **Filter by presence**: Show only concepts in N maps
3. **Click concept**: Switch to graph view for that concept
4. **Expand relationships**: See relationships for each concept

**Pros:**
- Clear quantitative view of differences
- Easy to identify outliers
- Good for large numbers of maps
- Compact representation

**Cons:**
- Less visual/spatial (doesn't preserve map structure)
- May not show relationship differences well
- Requires different mental model
- Better as supplementary view than primary

### Approach 4: Difference View with Reference

**Description**: Choose one map as "reference" and show other maps as diffs against it.

**Visual Indicators:**
- **Base map**: Normal colors
- **Additions**: Green + icon, green border
- **Removals**: Red - icon, red strikethrough
- **Modifications**: Yellow ~ icon, yellow border

**Interactions:**
1. **Switch reference**: Change which map is the baseline
2. **Switch comparison**: Change which map's differences are shown
3. **Toggle diff**: Show/hide differences
4. **Accept/reject changes**: Git-like workflow for reconciliation

**Pros:**
- Familiar (like git diff)
- Clear what changed
- Works for multiple maps (show each diff separately)
- Good for reconciliation workflow

**Cons:**
- Requires choosing a "reference" (arbitrary or political?)
- Can only see one diff at a time
- Doesn't show multi-way overlaps well

### Recommended Hybrid Strategy

**Phase 1 (MVP)**: Implement **Approach 1 (Side-by-Side Pairwise)**
- Simplest to implement and understand
- Addresses core use case (comparing two maps)
- Clear visual feedback
- Good foundation for more complex features

**Phase 2**: Add **Approach 2 (Overlay/Merge View)** as an alternative mode
- Switch between side-by-side and overlay via toggle
- Allows comparing 3+ maps
- Better for consensus building

**Phase 3**: Add **Approach 3 (Matrix View)** as analysis tool
- Supplementary view for understanding agreement
- Useful for larger teams/more maps
- Can inform which concepts to focus on

**Phase 4** (Optional): Add **Approach 4 (Difference View)** for reconciliation workflow
- More specialized use case
- Useful for finalizing consensus map

## Comparison Algorithms

### Concept Matching

**Exact Match:**
- Same label (case-insensitive)
- Normalized label match (remove punctuation, whitespace)
- High confidence

**Fuzzy Match:**
- Similar labels (Levenshtein distance < threshold)
- String similarity metrics
- Same semantic meaning (e.g., "ML Model" vs "Machine Learning Model")
- Medium confidence, requires user confirmation

**Semantic Match** (Future Enhancement):
- Use embeddings/NLP to find semantically similar concepts
- Low confidence, requires user confirmation

**Manual Mapping:**
- User can indicate concepts are the same
- Highest confidence (user-confirmed)

### Relationship Matching

**Exact Match:**
- Same source concept (by match)
- Same target concept (by match)
- Same/similar labels

**Structural Match:**
- Same source and target, different labels
- Flag as potential conflict

**Direction Conflicts:**
- A→B in one map, B→A in other
- Flag as conflict requiring resolution

### Difference Detection

**Concept Differences:**
- Present in map A, absent in map B
- Present in map B, absent in map A
- Present in both, different positions
- Present in both, different labels (fuzzy match)
- Present in both, different notes/metadata

**Relationship Differences:**
- Present in map A, absent in map B
- Present in map B, absent in map A
- Present in both, different labels
- Different direction (A→B vs B→A)

### Data Structure for Comparison

**Concept Comparison Result:**
```typescript
interface ConceptComparison {
  conceptId: string // from one of the maps
  mapsPresent: string[] // map IDs containing this concept
  label: string // concept label (may differ slightly)
  normalizedLabel: string // normalized for matching
  similarityScore: number // 0-1, how similar labels are
  matchType: 'exact' | 'fuzzy' | 'semantic' | 'manual' | 'none'
  matchedConceptIds: string[] // IDs of matched concepts in other maps
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
  directionConflict: boolean // true if directions differ
}
```

## Reconciliation Workflow

### Phase 1: Exploration

**Goal**: Team members explore and understand differences in their mental models.

**Features:**
- View all maps together (unified overlay) OR pairwise comparison
- Select specific maps to compare
- Filter concepts by:
  - Present in all maps (consensus)
  - Present in some maps (disagreement)
  - Unique to one map (outlier)
- Filter relationships by:
  - Same relationship exists in all maps
  - Different relationships between same concepts
  - Unique relationships
- Concept similarity indicators
- Relationship conflict indicators

**UI:**
- Map selector (checkboxes to show/hide maps)
- Comparison mode toggle (pairwise/overlay/matrix)
- Filter controls
- Statistics panel showing:
  - Common concepts count
  - Unique items per user
  - Relationship overlap
  - Agreement percentage

### Phase 2: Discussion

**Goal**: Team members discuss and understand why differences exist.

**Features:**
- Comment threads on specific concepts/relationships
- Highlight differences for discussion
- Tag concepts/relationships with discussion topics
- Record decisions/reasons for differences
- Vote/agree on concepts/relationships
- Real-time presence indicators

**UI:**
- Comment system integrated with concepts/relationships
- Discussion panel
- Voting/agreement controls
- Activity log showing who made observations/changes

### Phase 3: Reconciliation

**Goal**: Create a shared map that incorporates all team members' perspectives.

**Reconciliation Modes:**

**Mode A: Iterative Selection** (Recommended for MVP)
- User clicks concepts/relationships to "accept" into consensus map
- Builds map incrementally
- Clear what's included vs excluded
- Most explicit and clear user intent

**Mode B: Start from Union**
- Begin with all concepts/relationships from all maps
- User removes/modifies as needed
- Faster but more editing required

**Mode C: Guided Reconciliation**
- System presents conflicts one at a time
- User resolves each (keep A, keep B, keep both, create new)
- Step-by-step process
- Good for systematic conflict resolution

**Features:**
- Create new "Consensus Map" from Domain
- Collaborative editing with real-time presence
- Merge concepts:
  - Auto-merge identical concepts (same label)
  - Manual merge for similar concepts (different labels)
  - Keep unique concepts if agreed upon
- Merge relationships:
  - Auto-merge identical relationships
  - Resolve conflicts (different labels for same edge)
  - Resolve direction conflicts
  - Add missing relationships
- Track source of each concept/relationship (which maps contributed)
- Attribution badges showing which map(s) contributed each element

**UI:**
- Split view: Individual maps on left, Consensus map on right
- Drag-and-drop to add concepts from individual maps
- Conflict resolution dialog for concept/relationship differences
- Selection panel showing what's included/excluded
- Progress indicator showing reconciliation status

### Phase 4: Validation

**Goal**: Team members review and approve the consensus map.

**Features:**
- Side-by-side comparison: Consensus map vs Individual maps
- Highlight what changed/merged
- Approval workflow (each team member approves)
- Version history of reconciliation process
- Diff view showing changes

**UI:**
- Approval status indicators
- Diff view showing changes
- Finalize button (only when all approve or majority agrees)
- Comparison metrics showing how consensus differs from individual maps

## Implementation Phases

### Phase 0: Prerequisites & Schema

**Goal**: Set up data model foundation.

**Tasks:**
1. Update `instant.schema.ts` with new entities and links
2. Update `instant-schema.json` (push to InstantDB)
3. Update TypeScript types in `lib/schema.ts`
4. Create migration script/data for existing maps (optional domainId)
5. Update permissions to support teams/domains
6. Create seed data for testing

**Files:**
- `src/instant.schema.ts` - Add Domain, Team, TeamMembership, ComparisonSession, ConsensusMap entities
- `src/lib/schema.ts` - Add TypeScript types
- `src/instant-schema.json` - Update schema JSON
- `src/instant.perms.ts` - Update permissions

### Phase 1: Teams & Domains Foundation

**Goal**: Allow users to create teams, add members, and create domains.

**Tasks:**
1. Create hooks: `useTeams()`, `useTeamMemberships()`, `useDomains()`
2. Create actions: `useTeamActions()`, `useDomainActions()`
3. Create UI components:
   - Team creation/management page
   - Domain creation/management page
   - Team member invitation UI
   - Domain dashboard showing all maps grouped by domain
4. Update Map creation to optionally require Domain selection
5. Migration/backfill strategy for existing maps

**Files to Create:**
- `src/hooks/useTeams.ts`
- `src/hooks/useTeamMemberships.ts`
- `src/hooks/useDomains.ts`
- `src/hooks/useTeamActions.ts`
- `src/hooks/useDomainActions.ts`
- `src/components/team/TeamManagement.tsx`
- `src/components/team/TeamMemberInvite.tsx`
- `src/components/domain/DomainManagement.tsx`
- `src/components/domain/DomainDashboard.tsx`
- `src/pages/TeamPage.tsx`
- `src/pages/DomainPage.tsx`

**Files to Modify:**
- `src/App.tsx` - Add routes for teams/domains pages
- `src/components/layout/Sidebar.tsx` - Add navigation links
- `src/components/layout/AppLayout.tsx` - Add team/domain context

### Phase 2: Comparison Core Logic

**Goal**: Implement comparison algorithms and data structures.

**Tasks:**
1. Create comparison utilities:
   - Concept matching algorithm (exact, fuzzy)
   - Relationship matching algorithm
   - Comparison result generation
   - Difference detection
2. Create hooks: `useMapComparison()`
3. Performance optimization (Web Workers if needed)
4. Caching strategy for comparison results

**Files to Create:**
- `src/lib/comparison/conceptMatching.ts` - Concept matching algorithms
- `src/lib/comparison/relationshipMatching.ts` - Relationship matching
- `src/lib/comparison/differenceDetection.ts` - Difference detection logic
- `src/lib/comparison/types.ts` - Comparison types and interfaces
- `src/lib/comparison/comparisonEngine.ts` - Main comparison orchestration
- `src/hooks/useMapComparison.ts` - React hook for comparison data

**Files to Modify:**
- `src/lib/data.ts` - Add comparison mode support

### Phase 3: Comparison Visualization - Pairwise Mode (MVP)

**Goal**: Implement side-by-side comparison view.

**Tasks:**
1. Create comparison session creation UI
2. Create `PairwiseComparisonView` component
3. Implement split-screen layout
4. Synchronized pan/zoom (optional)
5. Color coding for differences
6. Concept matching visualization
7. Side panel showing comparison statistics
8. Real-time updates as maps change

**Files to Create:**
- `src/hooks/useComparisonSessions.ts` - Query comparison sessions
- `src/hooks/useComparisonSessionActions.ts` - Create/manage sessions
- `src/components/comparison/PairwiseComparisonView.tsx` - Side-by-side canvas
- `src/components/comparison/ComparisonCanvas.tsx` - Comparison canvas wrapper
- `src/components/comparison/ComparisonControls.tsx` - Controls for comparison mode
- `src/components/comparison/ComparisonSidebar.tsx` - Statistics and info panel
- `src/components/comparison/DifferenceHighlights.tsx` - Visual indicators
- `src/components/comparison/MapSelector.tsx` - Select maps to compare
- `src/pages/ComparisonPage.tsx` - Comparison view page

**Files to Modify:**
- `src/components/graph/ConceptNode.tsx` - Add comparison styling props
- `src/components/relationship/RelationshipEdge.tsx` - Add comparison styling props
- `src/lib/data.ts` - Add comparison mode to node/edge conversion
- `src/App.tsx` - Add comparison page route

### Phase 4: Comparison Visualization - Overlay Mode

**Goal**: Implement unified overlay view showing all maps.

**Tasks:**
1. Create `OverlayComparisonView` component
2. Implement unified overlay rendering:
   - Merge all maps onto single canvas
   - Color coding for consensus/conflicts
   - Map visibility toggles
   - Agreement filtering
3. User filtering controls
4. Legend showing map-to-color mapping
5. Real-time updates as maps change

**Files to Create:**
- `src/components/comparison/OverlayComparisonView.tsx` - Overlay visualization
- `src/components/comparison/MapFilterControls.tsx` - Filter by map/user
- `src/lib/comparison/mergeMaps.ts` - Merge multiple maps logic
- `src/lib/comparison/agreementScoring.ts` - Calculate agreement levels

**Files to Modify:**
- `src/pages/ComparisonPage.tsx` - Add view mode toggle
- `src/components/comparison/ComparisonSession.tsx` - Support 3+ maps

### Phase 5: Comparison Visualization - Matrix View

**Goal**: Add analytical matrix/tabular view.

**Tasks:**
1. Create `MatrixComparisonView` component
2. Implement matrix layout:
   - Concepts/relationships as rows
   - Maps as columns
   - Heatmap visualization
3. Sorting and filtering
4. Integration with graph view (click to navigate)

**Files to Create:**
- `src/components/comparison/MatrixComparisonView.tsx` - Tabular comparison view
- `src/components/comparison/ComparisonMetrics.tsx` - Show statistics

**Files to Modify:**
- `src/pages/ComparisonPage.tsx` - Add matrix view option

### Phase 6: Reconciliation Interface

**Goal**: Enable collaborative creation of consensus map.

**Tasks:**
1. Create reconciliation UI:
   - Split view: individual maps + consensus map
   - Drag-and-drop to add concepts
   - Conflict resolution dialogs
   - Selection panel
2. Implement merge actions:
   - Merge concepts (auto and manual)
   - Merge relationships
   - Resolve conflicts
3. Track attribution (which maps contributed each element)
4. Progress tracking

**Files to Create:**
- `src/hooks/useConsensusMaps.ts` - Query consensus maps
- `src/hooks/useConsensusMapActions.ts` - Build consensus maps
- `src/components/reconciliation/ReconciliationView.tsx` - Reconciliation UI
- `src/components/reconciliation/ConsensusBuilder.tsx` - Consensus building UI
- `src/components/reconciliation/MergeDialog.tsx` - Merge concepts/relationships
- `src/components/reconciliation/ConflictResolver.tsx` - Resolve conflicts
- `src/components/reconciliation/SelectionPanel.tsx` - Select concepts to include
- `src/pages/ConsensusPage.tsx` - Consensus map editing page

**Files to Modify:**
- `src/components/comparison/ComparisonCanvas.tsx` - Add selection interactions
- `src/pages/ComparisonPage.tsx` - Add reconciliation mode toggle

### Phase 7: Discussion and Comments

**Goal**: Enable team discussion about differences.

**Tasks:**
1. Create comment system for concepts/relationships
2. Threading and replies
3. Integration with comparison views
4. Notification system for mentions
5. Voting/agreement mechanisms

**Files to Create:**
- `src/components/comments/CommentThread.tsx` - Comment thread component
- `src/components/comments/CommentPanel.tsx` - Comment panel
- `src/components/comments/CommentEditor.tsx` - Comment editor
- `src/hooks/useComments.ts` - Comment management hook
- Database schema: Add `comments` entity

**Files to Modify:**
- `src/components/comparison/ComparisonCanvas.tsx` - Add comment indicators
- `src/components/graph/ConceptNode.tsx` - Add comment badges

### Phase 8: Advanced Matching & Manual Linking

**Goal**: Add fuzzy matching and manual linking capabilities.

**Tasks:**
1. Implement fuzzy string matching
2. Manual concept linking UI
3. Similarity scoring and confidence indicators
4. User confirmation workflow for fuzzy matches

**Files to Create:**
- `src/lib/comparison/fuzzyMatching.ts` - Fuzzy matching algorithms
- `src/lib/comparison/similarityScoring.ts` - Similarity metrics
- `src/components/comparison/SimilarityIndicator.tsx` - Show match confidence
- `src/components/comparison/ManualLinkingDialog.tsx` - Link concepts manually

**Files to Modify:**
- `src/lib/comparison/conceptMatching.ts` - Integrate fuzzy matching
- `src/components/comparison/ComparisonCanvas.tsx` - Show fuzzy matches

### Phase 9: Validation and Approval

**Goal**: Final review and approval workflow.

**Tasks:**
1. Create approval workflow
2. Diff view showing reconciliation changes
3. Approval status tracking
4. Finalize consensus map
5. Comparison metrics (how consensus differs from individual maps)

**Files to Create:**
- `src/components/reconciliation/ApprovalWorkflow.tsx` - Approval UI
- `src/components/reconciliation/DiffView.tsx` - Diff visualization
- `src/hooks/useApproval.ts` - Approval management hook

**Files to Modify:**
- `src/pages/ConsensusPage.tsx` - Add approval workflow

### Phase 10: Polish and Optimization

**Tasks:**
1. Performance optimization
   - Web Workers for heavy computation
   - Virtualization for large lists
   - Lazy loading
   - Caching strategies
2. UI/UX improvements
   - Loading states
   - Error handling
   - Responsive design
   - Accessibility improvements
3. Tutorial/onboarding
4. Export/reporting capabilities

## Technical Considerations

### Performance

**Challenges:**
- Comparing large maps (100+ concepts) may be slow
- Real-time updates during multi-user comparison
- Rendering multiple maps simultaneously
- Large comparison result sets

**Solutions:**
- Implement comparison algorithms efficiently (memoization, caching)
- Use Web Workers for heavy computation
- Virtualize large lists (if using matrix view)
- Throttle/debounce position updates during collaboration
- Lazy-load comparison results
- Cache comparison results with invalidation on map changes
- Consider precomputing diffs server-side (InstantDB functions or edge workers) vs client-side

### Real-time Collaboration

**Scenarios:**
- Multiple users exploring same comparison session
- Users making conflicting decisions in consensus builder
- Users simultaneously accepting/rejecting concepts
- Real-time map edits during comparison

**Solutions:**
- Use InstantDB presence for cursor tracking (reuse existing system)
- Show which concepts/relationships other users are examining
- Use optimistic updates with conflict resolution
- Add "locks" for critical actions (accepting/rejecting concepts)
- Show activity feed of recent actions
- Presence rooms keyed by domain + session
- Shared focus modes (one user drives, others follow)
- Debounce real-time updates for performance

### Data Integrity

**Challenges:**
- Keeping comparison results in sync with source maps
- Handling edits to source maps during comparison
- Managing consensus map lifecycle
- Version control for maps

**Solutions:**
- Store comparison results as snapshots (don't live-update during session)
- Add "stale" indicator if source maps change during comparison
- Allow "refresh" action to re-run comparison
- Use versioning for consensus maps
- Track source of each concept/relationship (which maps contributed)

### Access Control

**Question**: Who can see/compare maps within a domain?

**Options:**
- **A**: All team members can see all maps (recommended for MVP)
- **B**: Only map creator can see their map
- **C**: Opt-in sharing per map
- **D**: Permission levels (viewer, comparer, reconciler)

**Recommendation**: Start with Option A, add more granular permissions later if needed.

**Implementation:**
- Integrate with existing `shares` or new permissions model
- Ensure only domain/team members can access comparison workspace
- Use InstantDB permissions based on team membership

### UI State Management

**New Zustand Store: `comparisonStore.ts`**

```typescript
interface ComparisonState {
  currentDomainId: string | null
  selectedMapIds: string[] // maps to compare
  comparisonMode: 'pairwise' | 'overlay' | 'matrix' | 'reconcile'
  pairwiseLeftMapId: string | null
  pairwiseRightMapId: string | null
  filterMode: 'all' | 'consensus' | 'conflicts' | 'unique'
  reconcilingMapId: string | null // consensus map being created
  activeSessionId: string | null
  syncPanZoom: boolean
}
```

## Open Questions

### 1. Domain-Map Relationship

**Question**: Direct `domainId` on maps or Domain Maps link table?

**Options:**
- **A**: Direct `domainId` (simpler, one-to-many)
- **B**: Domain Maps link table (many-to-many, more flexible)

**Recommendation**: Start with Option A for MVP, migrate to Option B if needed.

### 2. Teams vs Sharing

**Question**: Do we need Teams entity, or can we use existing Shares system?

**Options:**
- **A**: Teams provide better organization and multi-user collaboration (recommended)
- **B**: Use existing Shares system (simpler but less structured)

**Recommendation**: Start with Teams for better UX and clearer mental model.

### 3. Domain Scope

**Question**: Can a map belong to multiple domains?

**Options:**
- **A**: One domain per map initially (simpler)
- **B**: Many-to-many relationship from start

**Recommendation**: Start with Option A, add Option B later if needed.

### 4. Comparison Granularity

**Question**: Compare entire maps or specific perspectives?

**Options:**
- **A**: Entire maps initially (simpler)
- **B**: Compare perspectives within maps (more complex)

**Recommendation**: Start with Option A, add Option B in future phase.

### 5. Shared Map Ownership

**Question**: Who owns the consensus map?

**Options:**
- **A**: Team-owned (all members can edit) (recommended)
- **B**: Created by Domain creator
- **C**: Requires role-based permissions

**Recommendation**: Option A for MVP, add Option C later if needed.

### 6. Automatic vs Manual Matching

**Question**: Should the system automatically match concepts with similar names?

**Options:**
- **A**: Auto-match exact names, suggest fuzzy matches (recommended)
- **B**: Require manual confirmation for all matches
- **C**: Auto-match all above confidence threshold

**Recommendation**: Option A balances automation with safety.

### 7. Position in Consensus Map

**Question**: How should we position concepts in the consensus map?

**Options:**
- **A**: Average position from source maps (recommended)
- **B**: User manually positions everything
- **C**: Apply force-directed layout
- **D**: Choose position from specific source map

**Recommendation**: Option A for automatic placement, allow manual adjustment.

### 8. Handling Conflicts

**Question**: When two maps have conflicting relationships (A→B vs B→A), what should the default be?

**Options:**
- **A**: Include both relationships (bidirectional)
- **B**: Exclude both, require user decision (recommended)
- **C**: Choose from most-agreed-upon map
- **D**: Choose from "reference" map

**Recommendation**: Option B is safest and requires explicit user decision.

### 9. Reconciliation Authority

**Question**: Who can finalize a consensus map?

**Options:**
- **A**: Any team member (democratic) (recommended)
- **B**: Only domain creator
- **C**: Team admins/owners only
- **D**: Requires majority vote

**Recommendation**: Option A for MVP, add Option C or D later if needed.

### 10. Real-time Updates

**Question**: Should comparison views update in real-time as maps are edited?

**Options:**
- **A**: Yes, for collaborative exploration (recommended)
- **B**: No, require manual refresh

**Recommendation**: Option A with debouncing for performance.

### 11. Comparison Persistence

**Question**: Should comparison results be saved?

**Options:**
- **A**: Ephemeral (recalculate on demand)
- **B**: Persist comparison results for performance (recommended)

**Recommendation**: Option B with cache invalidation on map changes.

### 12. Individual vs Team Domains

**Question**: Do we allow individual (non-team) users to create domains for personal comparison workflows?

**Options:**
- **A**: Yes, allow individual domains (recommended)
- **B**: No, domains require teams

**Recommendation**: Option A for flexibility and backward compatibility.

## Edge Cases

1. **Empty maps**: One or both maps have no concepts
   - Show "no concepts to compare" message
   - Allow starting fresh consensus map

2. **Identical maps**: All concepts and relationships match
   - Show "maps are identical" message
   - Allow creating consensus map from either source

3. **No common concepts**: No overlap between maps
   - Show "no common concepts found" message
   - Suggest fuzzy matching
   - Allow manual linking

4. **Circular references**: Map A references consensus map, consensus map references map A
   - Prevent circular associations
   - Show warning when detected

5. **Large cardinality**: 10+ maps being compared
   - Warn user about performance
   - Suggest pairwise comparison first
   - Limit to 5-10 maps per session (configurable)

6. **Concurrent edits**: Source maps edited during comparison
   - Show "stale" indicator
   - Allow refresh to re-run comparison
   - Optionally auto-refresh on significant changes

## UI/UX Considerations

1. **Cognitive Load**:
   - Start simple (pairwise) before offering complex views
   - Progressive disclosure of features
   - Clear labeling and legends
   - Contextual help/tooltips

2. **Color Accessibility**:
   - Use patterns/textures in addition to colors
   - Support colorblind-friendly palettes
   - Provide text labels alongside color coding

3. **Screen Real Estate**:
   - Allow collapsing/expanding panels
   - Provide fullscreen mode for comparison canvas
   - Use responsive design for different screen sizes
   - Consider vertical split for ultrawide monitors

4. **Workflow Clarity**:
   - Clear steps: Select → Compare → Reconcile → Finalize
   - Progress indicators
   - Ability to save and resume sessions
   - Undo/redo support

5. **Onboarding**:
   - Tutorial for first-time comparison users
   - Tooltips explaining visual indicators
   - Example comparison session

## Success Metrics

How will we know this feature is successful?

1. **Adoption**:
   - % of teams that create domains
   - % of domains with 2+ maps
   - % of domains with comparison sessions

2. **Usage**:
   - Number of comparison sessions created per week
   - Average maps per comparison session
   - Time spent in comparison view per session

3. **Effectiveness**:
   - % of comparison sessions that result in consensus maps
   - Number of concepts in consensus maps vs source maps
   - User satisfaction ratings (survey)

4. **Collaboration**:
   - Number of users participating in same comparison session
   - Number of comments/discussions per session
   - Time from session creation to consensus finalization

## Alternative MVP Approach

**Simpler MVP** (if full plan is too ambitious):

**Start with:**
- Domain entity (no Teams initially - use existing sharing)
- Simple pairwise comparison only
- Manual reconciliation (no automated merging)
- No comments/discussion initially
- Basic concept matching (exact only)

**Then add:**
- Teams
- Unified overlay view
- Fuzzy matching
- Automated merging suggestions
- Discussion features

## Future Enhancements (Post-MVP)

1. **AI-Assisted Matching**:
   - Use LLM to suggest concept matches based on semantic meaning
   - Suggest relationship labels based on context
   - Auto-generate consensus map proposals

2. **Version Control**:
   - Track changes to consensus maps over time
   - Branching/merging workflow for maps
   - Diff view for map versions

3. **Visual Diff Timeline**:
   - Animate changes between maps
   - Show evolution of consensus map
   - Replay reconciliation decisions

4. **Template Library**:
   - Share consensus maps as templates
   - Browse templates from other teams (with permission)
   - Import/export map templates

5. **Integration with External Tools**:
   - Import maps from other concept mapping tools
   - Export comparison reports to Google Docs/Notion
   - Sync with project management tools

6. **Advanced Analytics**:
   - Identify "expert" users (most agreement with consensus)
   - Detect concept clusters/themes
   - Recommend concepts to add based on domain

7. **Asynchronous Workflows**:
   - Assign review tasks to specific team members
   - Notification system for comparison updates
   - Email digests of comparison activity

8. **Semantic Similarity**:
   - Use embeddings to find similar concepts even with different labels
   - AI-assisted merging suggestions

9. **Change Tracking**:
   - Track how shared map evolves over time
   - Map versioning

10. **Export Comparison Reports**:
    - Generate PDF/HTML reports of differences
    - Comparison templates

## Next Steps

1. **Review and Refine Plan**: Get feedback on this integrated plan
2. **Resolve Open Questions**: Make decisions on open questions (especially Domain-Map relationship, Teams vs Sharing)
3. **Choose Comparison Approach**: Confirm MVP starts with pairwise
4. **Prototype Core Comparison**: Build simple comparison algorithm prototype
5. **User Testing**: Test comparison visualization with sample maps
6. **Iterate on Design**: Refine based on user feedback
7. **Start Implementation**: Begin with Phase 0 (Schema Extensions)
8. **Iterate Incrementally**: Build incrementally, getting user feedback after each phase

## Related Files to Modify

- `src/instant.schema.ts` - Add new entities
- `src/lib/schema.ts` - Add TypeScript types
- `src/instant.perms.ts` - Update permissions
- `src/stores/mapStore.ts` - Add comparison state (or create new `comparisonStore.ts`)
- `src/components/graph/ConceptMapCanvas.tsx` - May need comparison mode
- `src/pages/MapPage.tsx` - Add comparison mode toggle
- `src/App.tsx` - Add routes for comparison pages

## Dependencies

- Existing React Flow components
- InstantDB real-time subscriptions
- Zustand for UI state
- May need: Graph analysis libraries (for comparison algorithms)
- May need: String similarity libraries (fuzzy matching, e.g., `fuse.js` or `string-similarity`)

---

**Document Status**: Integrated Plan - Combining Best Ideas from Three Variants
**Last Updated**: Based on CONCEPT_MAP_COMPARISON_PLAN_COMPOSER.md, CONCEPT_MAP_COMPARISON_PLAN_GPT5.md, and CONCEPT_MAP_COMPARISON_PLAN_SONNET.md
**Next Review**: After stakeholder feedback and open question resolution

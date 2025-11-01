# Concept Map Comparison Feature Plan

## Overview

This feature enables teams to collaboratively compare concept maps created by different team members for the same domain. The goal is to help team members discover differences in their mental models and work together to reconcile those differences into a shared, agreed-upon concept map.

### Use Case

1. **Scenario**: A team has multiple members who each create their own concept map for a specific domain (e.g., "Machine Learning Architecture", "Customer Journey", etc.)
2. **Goal**: Compare these maps to identify:
   - Common concepts (appear in multiple maps)
   - Unique concepts (only in one map)
   - Different relationships (same concepts, different connections)
   - Different labels/terminology for similar concepts
3. **Outcome**: Create a consensus map that represents the team's shared understanding

### Key Principles

1. **InstantDB for Model State**: All data (domains, teams, comparison state) stored in InstantDB
2. **Real-time Collaboration**: Multiple team members can explore comparisons simultaneously
3. **Non-destructive**: Original maps remain unchanged during comparison/reconciliation
4. **Progressive Disclosure**: Start simple (pairwise), allow complexity (multi-map)
5. **Visual Clarity**: Clear visual distinction between common, unique, and conflicting elements

## Data Model Changes

### New Entities

#### 1. Teams
```typescript
interface Team {
  id: string
  name: string
  description: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

**Purpose**: Group users together for collaboration on domains.

**InstantDB Schema**:
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
```typescript
interface TeamMembership {
  id: string
  teamId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: Date
}
```

**Purpose**: Define which users belong to which teams and their roles.

**InstantDB Schema**:
```typescript
teamMemberships: i.entity({
  teamId: i.string().indexed(),
  userId: i.string().indexed(),
  role: i.string(), // 'owner' | 'admin' | 'member'
  joinedAt: i.number().indexed(),
})
```

#### 3. Domains
```typescript
interface Domain {
  id: string
  teamId: string
  name: string
  description: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

**Purpose**: Define a subject area for which multiple maps can be created and compared.

**InstantDB Schema**:
```typescript
domains: i.entity({
  teamId: i.string().indexed(),
  name: i.string().indexed(),
  description: i.string().optional(),
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
})
```

#### 4. Domain Maps (Link Table)
```typescript
interface DomainMap {
  id: string
  domainId: string
  mapId: string
  createdBy: string
  createdAt: Date
}
```

**Purpose**: Associate maps with domains (many-to-many relationship, since a map could theoretically belong to multiple domains).

**InstantDB Schema**:
```typescript
domainMaps: i.entity({
  domainId: i.string().indexed(),
  mapId: i.string().indexed(),
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
})
```

#### 5. Comparison Sessions
```typescript
interface ComparisonSession {
  id: string
  domainId: string
  name: string
  mapIds: string[] // Maps being compared in this session
  mode: 'pairwise' | 'multi' // Comparison mode
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

**Purpose**: Track active comparison sessions for a domain.

**InstantDB Schema**:
```typescript
comparisonSessions: i.entity({
  domainId: i.string().indexed(),
  name: i.string(),
  mapIds: i.string(), // JSON array string
  mode: i.string(), // 'pairwise' | 'multi'
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
})
```

#### 6. Consensus Maps
```typescript
interface ConsensusMap {
  id: string
  domainId: string
  mapId: string // The resulting shared map
  sourceSessionId: string // Which comparison session created this
  status: 'draft' | 'finalized'
  createdAt: Date
  finalizedAt: Date | null
}
```

**Purpose**: Track consensus maps created from comparison sessions.

**InstantDB Schema**:
```typescript
consensusMaps: i.entity({
  domainId: i.string().indexed(),
  mapId: i.string().indexed(),
  sourceSessionId: i.string().indexed(),
  status: i.string(), // 'draft' | 'finalized'
  createdAt: i.number().indexed(),
  finalizedAt: i.number().optional(),
})
```

### Modified Entities

#### Maps
Add optional `domainId` reference (though primary relationship is through `domainMaps` link table):

```typescript
interface Map {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  isTemplate: boolean // NEW: Mark maps as templates for reuse
}
```

**InstantDB Schema Addition**:
```typescript
maps: i.entity({
  name: i.string().indexed(),
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
  isTemplate: i.boolean().optional(), // NEW
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
  
  // NEW: Domain maps to domains
  domainMapsDomain: {
    forward: { on: 'domainMaps', has: 'many', label: 'domain' },
    reverse: { on: 'domains', has: 'many', label: 'domainMaps' },
  },
  
  // NEW: Domain maps to maps
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

### Approach 1: Side-by-Side Pairwise (Recommended for MVP)

**Description**: Display two maps side-by-side with visual highlighting of similarities and differences.

**Visual Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Map A (User 1)          │  Map B (User 2)                   │
│                         │                                    │
│  [Concept A]────────┐   │   [Concept A]─────────┐          │
│       │             │   │        │              │           │
│  [Concept B]   [Concept C]  │  [Concept B]   [Concept D]    │
│                         │                                    │
│ Legend:                 │                                    │
│ 🟢 Common concepts      │                                    │
│ 🔵 Unique to this map   │                                    │
│ 🟡 Similar concept      │                                    │
└─────────────────────────────────────────────────────────────┘
```

**Visual Indicators**:
- **Common concepts** (same label in both maps): Green border/background
- **Unique concepts** (only in one map): Blue border/background
- **Similar concepts** (fuzzy match on label): Yellow border with suggested match indicator
- **Common relationships**: Green edges
- **Different relationships**: Gray/dashed edges with conflict indicator

**Interactions**:
1. **Hover**: Show which concepts are matched between maps
2. **Click concept**: Highlight matches/similar concepts in other map
3. **Sync pan/zoom**: Optional synchronized navigation
4. **Link concepts**: Manually link similar concepts that weren't auto-matched

**Pros**:
- Simple to understand
- Clear visual distinction
- Easy to implement
- Works well for 2 maps

**Cons**:
- Only compares 2 maps at a time
- Doesn't scale to 3+ maps
- Screen space limited for large maps

### Approach 2: Overlay/Merge View

**Description**: Overlay multiple maps on a single canvas, with visual encoding to show which map each element came from.

**Visual Layout**:
```
┌─────────────────────────────────────────────┐
│              Merged View                    │
│                                             │
│  [Concept A]────────────────[Concept C]    │
│   (Maps: 1,2,3)             (Maps: 1,3)    │
│       │                                     │
│       │                                     │
│  [Concept B]           [Concept D]         │
│   (Maps: 1,2)          (Map: 2 only)       │
│                                             │
│ Legend:                                     │
│ User 1 🔴  User 2 🔵  User 3 🟢            │
└─────────────────────────────────────────────┘
```

**Visual Indicators**:
- **Color-coded badges**: Show which users contributed each concept (multi-colored for shared concepts)
- **Edge thickness**: Thicker edges for relationships present in multiple maps
- **Opacity**: More opaque for concepts in more maps
- **Position**: Average position from all maps, or use force-directed layout

**Interactions**:
1. **Filter by user**: Show/hide concepts from specific users
2. **Filter by agreement**: Show only concepts in N+ maps
3. **Click concept**: See which maps contain it, view details from each map
4. **Conflict resolution**: Click conflicting relationships to choose which to keep

**Pros**:
- Scales to 3+ maps
- Compact view
- Shows overlap intuitively
- Can see "consensus" emerging

**Cons**:
- Can get cluttered with many concepts
- Harder to see individual map structure
- Concept positioning ambiguous (average? arbitrary?)
- More complex implementation

### Approach 3: Difference View with Reference

**Description**: Choose one map as "reference" and show other maps as diffs against it.

**Visual Layout**:
```
┌─────────────────────────────────────────────┐
│         Reference: User 1's Map             │
│                                             │
│  [Concept A]───────────[Concept C]         │
│       │                   ⊕[Concept D]     │
│  [Concept B]              (Added by User 2)│
│       │                                     │
│       ⊖ Relationship removed by User 2     │
│                                             │
│ Viewing: User 2's differences               │
│ Switch to: [User 3] [User 4]               │
└─────────────────────────────────────────────┘
```

**Visual Indicators**:
- **Base map**: Normal colors
- **Additions**: Green + icon, green border
- **Removals**: Red - icon, red strikethrough
- **Modifications**: Yellow ~ icon, yellow border

**Interactions**:
1. **Switch reference**: Change which map is the baseline
2. **Switch comparison**: Change which map's differences are shown
3. **Toggle diff**: Show/hide differences
4. **Accept/reject changes**: Git-like workflow for reconciliation

**Pros**:
- Familiar (like git diff)
- Clear what changed
- Works for multiple maps (show each diff separately)
- Good for reconciliation workflow

**Cons**:
- Requires choosing a "reference" (arbitrary or political?)
- Can only see one diff at a time
- Doesn't show multi-way overlaps well

### Approach 4: Matrix/Tabular View

**Description**: Show concepts in rows, maps in columns, with checkmarks indicating presence.

**Visual Layout**:
```
┌─────────────────────────────────────────────────┐
│ Concept        │ User 1 │ User 2 │ User 3 │ ... │
├────────────────┼────────┼────────┼────────┼─────┤
│ Concept A      │   ✓    │   ✓    │   ✓    │     │
│ Concept B      │   ✓    │   ✓    │   ✗    │     │
│ Concept C      │   ✓    │   ✗    │   ✗    │     │
│ Concept D      │   ✗    │   ✓    │   ✗    │     │
└─────────────────────────────────────────────────┘

Relationships for: Concept A
┌─────────────────────────────────────────────────┐
│ Relationship   │ User 1 │ User 2 │ User 3 │ ... │
├────────────────┼────────┼────────┼────────┼─────┤
│ A → B          │   ✓    │   ✓    │   ✗    │     │
│ A → C          │   ✓    │   ✗    │   ✗    │     │
└─────────────────────────────────────────────────┘
```

**Interactions**:
1. **Sort by agreement**: Show most-common concepts first
2. **Filter by presence**: Show only concepts in N maps
3. **Click concept**: Switch to graph view for that concept
4. **Expand relationships**: See relationships for each concept

**Pros**:
- Scales to many maps
- Easy to see agreement at a glance
- Good for quantitative analysis
- Compact representation

**Cons**:
- Loses spatial/structural information
- Not good for seeing overall map structure
- Less intuitive for visual thinkers
- Better as supplementary view than primary

### Recommended Approach: Hybrid Strategy

**Phase 1 (MVP)**: Implement **Approach 1 (Side-by-Side Pairwise)**
- Simplest to implement and understand
- Addresses core use case (comparing two maps)
- Clear visual feedback
- Good foundation for more complex features

**Phase 2**: Add **Approach 2 (Overlay/Merge View)** as an alternative mode
- Switch between side-by-side and overlay via toggle
- Allows comparing 3+ maps
- Better for consensus building

**Phase 3**: Add **Approach 4 (Matrix View)** as analysis tool
- Supplementary view for understanding agreement
- Useful for larger teams/more maps
- Can inform which concepts to focus on

**Phase 4** (Optional): Add **Approach 3 (Difference View)** for reconciliation workflow
- More specialized use case
- Useful for finalizing consensus map

## Comparison Algorithms

### Concept Matching

**Exact Match**:
- Same label (case-insensitive)
- High confidence

**Fuzzy Match**:
- Similar labels (Levenshtein distance < threshold)
- Same semantic meaning (e.g., "ML Model" vs "Machine Learning Model")
- Medium confidence, requires user confirmation

**Semantic Match** (Future Enhancement):
- Use embeddings/NLP to find semantically similar concepts
- Low confidence, requires user confirmation

### Relationship Matching

**Exact Match**:
- Same source concept (by match)
- Same target concept (by match)
- Same/similar labels

**Structural Match**:
- Same source and target, different labels
- Flag as potential conflict

### Difference Detection

**Concept Differences**:
- Present in map A, absent in map B
- Present in map B, absent in map A
- Present in both, different positions
- Present in both, different notes/metadata

**Relationship Differences**:
- Present in map A, absent in map B
- Present in map B, absent in map A
- Present in both, different labels
- Different direction (A→B vs B→A)

## Reconciliation Workflow

### Step 1: Create Comparison Session

1. User selects domain
2. User chooses 2+ maps to compare
3. System creates comparison session
4. System runs comparison algorithms to identify matches/differences
5. Display comparison view with visual indicators

### Step 2: Explore Differences

**Activities**:
- Browse common concepts (validate they're truly the same)
- Review unique concepts (decide if they should be added)
- Examine conflicting relationships (decide which is correct)
- Discuss with team (real-time collaboration)

**UI Elements**:
- Filter by difference type (common/unique/conflict)
- Sort by agreement level
- Add comments/annotations
- Vote on which version to accept

### Step 3: Build Consensus Map

**Interaction Modes**:

#### Mode A: Iterative Selection
- User clicks concepts/relationships to "accept" into consensus map
- Builds map incrementally
- Clear what's included vs excluded

#### Mode B: Start from Union
- Begin with all concepts/relationships from all maps
- User removes/modifies as needed
- Faster but more editing required

#### Mode C: Guided Reconciliation
- System presents conflicts one at a time
- User resolves each (keep A, keep B, keep both, create new)
- Step-by-step process

**Recommended**: Mode A (Iterative Selection) for MVP
- Most explicit
- Clear user intent
- Aligns with comparison workflow

### Step 4: Refine Consensus Map

Once consensus map is created:
1. Open in normal map editor
2. Adjust layout, labels, relationships
3. Add notes/documentation
4. Share with team for review

### Step 5: Finalize

1. Team reviews consensus map
2. Approve/accept changes
3. Mark consensus map as "finalized"
4. Optionally replace original maps or keep alongside

## Implementation Phases

### Phase 0: Prerequisites
- [ ] Update InstantDB schema with new entities
- [ ] Add data migration (if needed)
- [ ] Update permissions to support teams/domains
- [ ] Create seed data for testing

### Phase 1: Teams & Domains (Foundation)

**Goal**: Add team and domain management without comparison features yet.

**Components**:
- Team creation/management UI
- Team member invitation/management
- Domain creation UI
- Domain-map association UI

**Files to Create**:
- `src/lib/schema.ts`: Add Team, Domain, etc. types
- `src/hooks/useTeams.ts`: Query teams
- `src/hooks/useTeamActions.ts`: Create/update teams
- `src/hooks/useDomains.ts`: Query domains
- `src/hooks/useDomainActions.ts`: Create/update domains
- `src/components/teams/TeamManager.tsx`: Team management UI
- `src/components/domains/DomainManager.tsx`: Domain management UI
- `src/pages/TeamsPage.tsx`: Teams dashboard
- `src/pages/DomainsPage.tsx`: Domains dashboard

**Files to Modify**:
- `src/instant.schema.ts`: Add new entities
- `src/App.tsx`: Add routes for teams/domains pages
- `src/components/layout/Sidebar.tsx`: Add navigation links

### Phase 2: Basic Comparison View (MVP)

**Goal**: Implement side-by-side pairwise comparison.

**Components**:
- Comparison session creation UI
- Side-by-side map display
- Basic difference highlighting (exact match only)
- Concept matching UI

**Files to Create**:
- `src/hooks/useComparisonSessions.ts`: Query comparison sessions
- `src/hooks/useComparisonSessionActions.ts`: Create/manage sessions
- `src/lib/comparison/conceptMatching.ts`: Concept matching algorithms
- `src/lib/comparison/differenceDetection.ts`: Difference detection logic
- `src/lib/comparison/types.ts`: Comparison types
- `src/components/comparison/ComparisonCanvas.tsx`: Side-by-side canvas
- `src/components/comparison/ComparisonSession.tsx`: Session management
- `src/components/comparison/MatchingControls.tsx`: Manual matching UI
- `src/components/comparison/DifferenceIndicator.tsx`: Visual indicators
- `src/pages/ComparisonPage.tsx`: Comparison view page

**Files to Modify**:
- `src/components/graph/ConceptNode.tsx`: Add comparison styling props
- `src/components/relationship/RelationshipEdge.tsx`: Add comparison styling props
- `src/lib/data.ts`: Add comparison mode to node/edge conversion
- `src/App.tsx`: Add comparison page route

### Phase 3: Reconciliation & Consensus Building

**Goal**: Allow users to create consensus maps from comparisons.

**Components**:
- Consensus map builder UI
- Concept selection/acceptance workflow
- Relationship resolution UI
- Conflict resolution dialogs

**Files to Create**:
- `src/hooks/useConsensusMaps.ts`: Query consensus maps
- `src/hooks/useConsensusMapActions.ts`: Build consensus maps
- `src/components/comparison/ConsensusBuilder.tsx`: Consensus building UI
- `src/components/comparison/ConflictResolver.tsx`: Resolve conflicts
- `src/components/comparison/SelectionPanel.tsx`: Select concepts to include
- `src/pages/ConsensusPage.tsx`: Consensus map editing page

**Files to Modify**:
- `src/components/comparison/ComparisonCanvas.tsx`: Add selection interactions
- `src/pages/ComparisonPage.tsx`: Add consensus builder integration

### Phase 4: Advanced Matching

**Goal**: Add fuzzy matching and manual linking.

**Components**:
- Fuzzy string matching
- Manual concept linking UI
- Similarity scoring
- Confidence indicators

**Files to Create**:
- `src/lib/comparison/fuzzyMatching.ts`: Fuzzy matching algorithms
- `src/lib/comparison/similarityScoring.ts`: Similarity metrics
- `src/components/comparison/SimilarityIndicator.tsx`: Show match confidence
- `src/components/comparison/ManualLinkingDialog.tsx`: Link concepts manually

**Files to Modify**:
- `src/lib/comparison/conceptMatching.ts`: Integrate fuzzy matching
- `src/components/comparison/ComparisonCanvas.tsx`: Show fuzzy matches
- `src/components/comparison/DifferenceIndicator.tsx`: Add confidence levels

### Phase 5: Multi-Map Overlay View

**Goal**: Support comparing 3+ maps with overlay visualization.

**Components**:
- Multi-map merge logic
- Overlay canvas with color coding
- Agreement filtering
- User filtering

**Files to Create**:
- `src/lib/comparison/mergeMaps.ts`: Merge multiple maps
- `src/lib/comparison/agreementScoring.ts`: Calculate agreement levels
- `src/components/comparison/OverlayCanvas.tsx`: Overlay visualization
- `src/components/comparison/MapFilterControls.tsx`: Filter by map/user

**Files to Modify**:
- `src/pages/ComparisonPage.tsx`: Add view mode toggle
- `src/components/comparison/ComparisonSession.tsx`: Support 3+ maps

### Phase 6: Analysis & Insights

**Goal**: Add analytical views and quantitative insights.

**Components**:
- Matrix/tabular view
- Agreement metrics
- Difference statistics
- Export/reporting

**Files to Create**:
- `src/lib/comparison/analytics.ts`: Calculate metrics
- `src/components/comparison/MatrixView.tsx`: Tabular comparison view
- `src/components/comparison/ComparisonMetrics.tsx`: Show statistics
- `src/components/comparison/ComparisonReport.tsx`: Generate reports

**Files to Modify**:
- `src/pages/ComparisonPage.tsx`: Add view mode toggle (add matrix view)

## Technical Considerations

### Performance

**Challenges**:
- Comparing large maps (100+ concepts) may be slow
- Real-time updates during multi-user comparison
- Rendering multiple maps simultaneously

**Solutions**:
- Implement comparison algorithms efficiently (memoization, caching)
- Use Web Workers for heavy computation
- Virtualize large lists (if using matrix view)
- Throttle/debounce position updates during collaboration
- Lazy-load comparison results

### Real-time Collaboration

**Scenarios**:
- Multiple users exploring same comparison session
- Users making conflicting decisions in consensus builder
- Users simultaneously accepting/rejecting concepts

**Solutions**:
- Use InstantDB presence for cursor tracking (reuse existing system)
- Show which concepts/relationships other users are examining
- Use optimistic updates with conflict resolution
- Add "locks" for critical actions (accepting/rejecting concepts)
- Show activity feed of recent actions

### Data Integrity

**Challenges**:
- Keeping comparison results in sync with source maps
- Handling edits to source maps during comparison
- Managing consensus map lifecycle

**Solutions**:
- Store comparison results as snapshots (don't live-update during session)
- Add "stale" indicator if source maps change during comparison
- Allow "refresh" action to re-run comparison
- Use versioning for consensus maps

### Edge Cases

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
   - Limit to 5-10 maps per session

### UI/UX Considerations

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

## Open Questions for Discussion

### 1. Automatic vs Manual Matching

**Question**: Should the system automatically match concepts with similar names, or require manual confirmation?

**Options**:
- **A**: Auto-match exact names, suggest fuzzy matches (recommended)
- **B**: Require manual confirmation for all matches
- **C**: Auto-match all above confidence threshold

**Tradeoffs**:
- A balances automation with safety
- B gives more control but is tedious
- C is fastest but may create false matches

### 2. Position in Consensus Map

**Question**: How should we position concepts in the consensus map?

**Options**:
- **A**: Average position from source maps (recommended)
- **B**: User manually positions everything
- **C**: Apply force-directed layout
- **D**: Choose position from specific source map

**Tradeoffs**:
- A is automatic but may not be ideal
- B gives full control but is time-consuming
- C creates new layout (may lose spatial meaning)
- D is simple but arbitrary

### 3. Handling Conflicts

**Question**: When two maps have conflicting relationships (A→B in one, B→A in other), what should the default be?

**Options**:
- **A**: Include both relationships (bidirectional)
- **B**: Exclude both, require user decision (recommended)
- **C**: Choose from most-agreed-upon map
- **D**: Choose from "reference" map

**Tradeoffs**:
- A may create unintended semantics
- B is safest but requires more work
- C is democratic but may not be correct
- D is arbitrary

### 4. Privacy and Permissions

**Question**: Who can see/compare maps within a domain?

**Options**:
- **A**: All team members can see all maps (recommended)
- **B**: Only map creator can see their map
- **C**: Opt-in sharing per map
- **D**: Permission levels (viewer, comparer, reconciler)

**Tradeoffs**:
- A maximizes collaboration
- B protects individual work
- C balances privacy and collaboration
- D is most flexible but complex

### 5. Reconciliation Authority

**Question**: Who can finalize a consensus map?

**Options**:
- **A**: Any team member (democratic) (recommended)
- **B**: Only domain creator
- **C**: Team admins/owners only
- **D**: Requires majority vote

**Tradeoffs**:
- A encourages participation
- B centralizes control
- C balances control and collaboration
- D ensures buy-in but slows process

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

## Next Steps

To move forward with this plan:

1. **Review & Discuss**: Get feedback from stakeholders on:
   - Data model design
   - Visualization approach preference
   - Open questions

2. **Prototype**: Create a quick prototype of side-by-side comparison to validate UX

3. **Refine Plan**: Update plan based on feedback and prototype learnings

4. **Start Implementation**: Begin with Phase 0 (schema updates) and Phase 1 (teams/domains)

5. **Iterate**: Build incrementally, getting user feedback after each phase

---

**Document Status**: Draft for discussion
**Last Updated**: 2025-11-01
**Author**: AI Assistant
**Next Review**: After stakeholder feedback

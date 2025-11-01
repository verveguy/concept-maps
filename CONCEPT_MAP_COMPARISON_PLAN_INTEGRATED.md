# Concept Map Comparison - Integrated Implementation Plan

## Executive Summary

This integrated plan combines the best elements from three variant approaches to implement concept map comparison functionality. It provides a comprehensive roadmap for enabling teams to compare multiple concept maps within shared domains, identify similarities and differences, and collaboratively reconcile them into consensus maps.

**Core Value Proposition:**
- Enable team-based collaboration on concept maps within subject-specific domains
- Visualize differences and similarities across multiple maps
- Facilitate structured reconciliation workflows to build shared understanding
- Support both educational and professional use cases

---

## 1. Problem Overview & Use Cases

### Primary Use Cases

1. **Educational Settings**
   - Teachers compare student concept maps to identify common misconceptions
   - Students compare their understanding with expert/reference maps
   - Peer learning through map comparison and discussion

2. **Professional/Research Teams**
   - Research teams align mental models and terminology
   - Cross-functional teams identify knowledge gaps
   - Domain experts build consensus on complex systems

3. **Knowledge Evolution**
   - Track how understanding evolves over time
   - Merge individual insights into team knowledge bases
   - Identify emergent patterns across multiple perspectives

### Success Criteria

- **Usability**: Users can initiate comparisons and understand differences within 2 minutes
- **Performance**: Handle maps with 100+ concepts with < 1s comparison computation
- **Collaboration**: Real-time synchronized views for 10+ concurrent users
- **Accuracy**: 95%+ precision in concept matching with fuzzy algorithms
- **Adoption**: 80%+ of teams use comparison features within 30 days

---

## 2. Data Model & Schema Design

### 2.1 InstantDB Entity Definitions

This schema integrates the most complete elements from all three plans, with SONNET's detailed link structure as the foundation.

```typescript
// New Entities for Team & Domain Management

teams: i.entity({
  name: i.string(),
  description: i.string().optional(),
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
  settings: i.json().optional(), // Team-level preferences
})

teamMemberships: i.entity({
  teamId: i.string().indexed(),
  userId: i.string().indexed(),
  role: i.string().indexed(), // 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: i.number(),
})

domains: i.entity({
  name: i.string().indexed(),
  description: i.string().optional(),
  teamId: i.string().indexed(),
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
  settings: i.json().optional(), // Domain-specific settings (e.g., matching threshold)
})

domainMaps: i.entity({
  domainId: i.string().indexed(),
  mapId: i.string().indexed(),
  role: i.string().indexed(), // 'reference' | 'student' | 'expert' | 'draft' | 'consensus'
  addedBy: i.string(),
  addedAt: i.number(),
  metadata: i.json().optional(), // Author info, version, tags, etc.
})

comparisonSessions: i.entity({
  domainId: i.string().indexed(),
  name: i.string().optional(),
  initiatedBy: i.string(),
  mapIds: i.json(), // Array of map IDs being compared
  createdAt: i.number().indexed(),
  endedAt: i.number().optional(),
  status: i.string(), // 'active' | 'completed' | 'archived'
  settings: i.json().optional(), // Comparison settings (algorithm, thresholds, filters)
  notes: i.string().optional(),
})

consensusMaps: i.entity({
  domainId: i.string().indexed(),
  mapId: i.string().indexed(),
  comparisonSessionId: i.string().indexed().optional(),
  createdBy: i.string(),
  createdAt: i.number().indexed(),
  contributorIds: i.json(), // Array of user IDs who contributed
  status: i.string(), // 'draft' | 'final' | 'archived'
})
```

### 2.2 Modified Existing Entities

```typescript
// Extend Maps entity
maps: i.entity({
  name: i.string().indexed(),
  createdBy: i.string().indexed(),
  createdAt: i.number().indexed(),
  updatedAt: i.number().indexed(),
  isTemplate: i.boolean().optional(), // NEW: Mark as reusable template
  isShared: i.boolean().optional(), // NEW: Indicates collaborative/consensus map
  sourceMapIds: i.json().optional(), // NEW: Array of source map IDs if derived from comparison
})
```

### 2.3 InstantDB Links (Relationships)

```typescript
links: {
  // Team relationships
  teamMembershipsTeam: {
    forward: { on: 'teamMemberships', has: 'many', label: 'team' },
    reverse: { on: 'teams', has: 'many', label: 'memberships' },
  },
  
  // Domain relationships
  domainsTeam: {
    forward: { on: 'domains', has: 'many', label: 'team' },
    reverse: { on: 'teams', has: 'many', label: 'domains' },
  },
  domainMapsDomain: {
    forward: { on: 'domainMaps', has: 'many', label: 'domain' },
    reverse: { on: 'domains', has: 'many', label: 'domainMaps' },
  },
  domainMapsMap: {
    forward: { on: 'domainMaps', has: 'many', label: 'map' },
    reverse: { on: 'maps', has: 'many', label: 'domainMaps' },
  },
  
  // Comparison relationships
  comparisonSessionsDomain: {
    forward: { on: 'comparisonSessions', has: 'many', label: 'domain' },
    reverse: { on: 'domains', has: 'many', label: 'comparisonSessions' },
  },
  
  // Consensus map relationships
  consensusMapsDomain: {
    forward: { on: 'consensusMaps', has: 'many', label: 'domain' },
    reverse: { on: 'domains', has: 'many', label: 'consensusMaps' },
  },
  consensusMapsMap: {
    forward: { on: 'consensusMaps', has: 'many', label: 'map' },
    reverse: { on: 'maps', has: 'many', label: 'consensusMaps' },
  },
}
```

### 2.4 Runtime Data Structures

These TypeScript interfaces define the in-memory structures for comparison computation.

```typescript
/**
 * Result of comparing a single concept across multiple maps
 */
interface ConceptComparison {
  conceptId: string; // Canonical ID (from first occurrence or reference map)
  label: string; // Primary label
  alternateLabels: Record<string, string>; // mapId -> label variations
  mapsPresent: string[]; // Array of map IDs containing this concept
  mapsMissing: string[]; // Array of map IDs missing this concept
  positions: Record<string, { x: number; y: number }>; // mapId -> position
  matchType: 'exact' | 'fuzzy' | 'semantic' | 'manual'; // How concept was matched
  similarityScore: number; // 0-1, relevance for fuzzy/semantic matches
  relationships: RelationshipComparison[]; // Associated relationship comparisons
  metadata: Record<string, any>; // mapId -> concept-specific metadata
}

/**
 * Result of comparing a single relationship across multiple maps
 */
interface RelationshipComparison {
  fromConceptId: string;
  toConceptId: string;
  mapsPresent: string[]; // Maps containing this relationship
  labels: Record<string, string>; // mapId -> relationship label
  conflict: boolean; // True if different labels for same concept pair
  consensusLabel?: string; // Agreed-upon label during reconciliation
  metadata: Record<string, any>; // Additional relationship properties
}

/**
 * Complete comparison result for a set of maps
 */
interface ComparisonResult {
  sessionId: string;
  domainId: string;
  mapIds: string[];
  conceptComparisons: ConceptComparison[];
  statistics: {
    totalConcepts: number;
    sharedConcepts: number;
    uniqueConcepts: number;
    conflictingRelationships: number;
    averageSimilarity: number;
  };
  computedAt: number;
  algorithm: {
    conceptMatching: 'exact' | 'fuzzy' | 'semantic';
    fuzzyThreshold?: number; // 0-1, for Levenshtein-based matching
    semanticThreshold?: number; // 0-1, for embedding similarity
  };
}

/**
 * UI State for comparison workflows (Zustand store)
 */
interface ComparisonUIState {
  // Domain & session context
  currentDomainId: string | null;
  currentSessionId: string | null;
  selectedMapIds: string[];
  
  // Visualization mode
  comparisonMode: 'overview' | 'pairwise' | 'unified' | 'matrix' | 'reconcile';
  
  // Pairwise comparison state
  pairwiseLeftMapId: string | null;
  pairwiseRightMapId: string | null;
  
  // Filtering & focus
  filterMode: 'all' | 'shared' | 'conflicts' | 'unique' | 'missing';
  highlightedConceptId: string | null;
  
  // Reconciliation state
  reconcilingMapId: string | null; // Consensus map being edited
  resolvedConflicts: Set<string>; // Relationship IDs marked as resolved
  pendingDecisions: Array<{
    type: 'concept' | 'relationship';
    id: string;
    options: any[];
  }>;
  
  // Collaboration state
  collaborators: Map<string, {
    userId: string;
    focusedConceptId: string | null;
    cursorPosition: { x: number; y: number } | null;
  }>;
  
  // Actions
  setDomain: (domainId: string) => void;
  selectMaps: (mapIds: string[]) => void;
  setMode: (mode: ComparisonUIState['comparisonMode']) => void;
  setPairwiseMaps: (leftId: string, rightId: string) => void;
  setFilter: (filter: ComparisonUIState['filterMode']) => void;
  resolveConflict: (conflictId: string, resolution: any) => void;
  // ... additional actions
}
```

---

## 3. Comparison Algorithms

### 3.1 Concept Matching Strategies

**Option 1: Exact Match (Phase 1 - MVP)**
```typescript
function exactMatch(concept1: Concept, concept2: Concept): boolean {
  return concept1.label.toLowerCase().trim() === concept2.label.toLowerCase().trim();
}
```

**Option 2: Fuzzy Match (Phase 2)**
```typescript
function fuzzyMatch(
  concept1: Concept, 
  concept2: Concept, 
  threshold: number = 0.8
): { match: boolean; score: number } {
  const distance = levenshteinDistance(
    concept1.label.toLowerCase(),
    concept2.label.toLowerCase()
  );
  const maxLen = Math.max(concept1.label.length, concept2.label.length);
  const score = 1 - (distance / maxLen);
  
  return {
    match: score >= threshold,
    score
  };
}
```

**Option 3: Semantic Match (Phase 3+ / Future)**
```typescript
async function semanticMatch(
  concept1: Concept,
  concept2: Concept,
  threshold: number = 0.85
): Promise<{ match: boolean; score: number }> {
  const embedding1 = await getEmbedding(concept1.label);
  const embedding2 = await getEmbedding(concept2.label);
  const similarity = cosineSimilarity(embedding1, embedding2);
  
  return {
    match: similarity >= threshold,
    score: similarity
  };
}
```

### 3.2 Relationship Matching

```typescript
function compareRelationships(
  maps: Map<string, ConceptMap>,
  conceptMatches: Map<string, ConceptComparison>
): RelationshipComparison[] {
  const relationshipMap = new Map<string, RelationshipComparison>();
  
  // Group relationships by concept pair
  for (const [mapId, map] of maps) {
    for (const rel of map.relationships) {
      const fromId = conceptMatches.get(rel.fromId)?.conceptId;
      const toId = conceptMatches.get(rel.toId)?.conceptId;
      
      if (!fromId || !toId) continue;
      
      const key = `${fromId}->${toId}`;
      
      if (!relationshipMap.has(key)) {
        relationshipMap.set(key, {
          fromConceptId: fromId,
          toConceptId: toId,
          mapsPresent: [],
          labels: {},
          conflict: false,
          metadata: {}
        });
      }
      
      const comparison = relationshipMap.get(key)!;
      comparison.mapsPresent.push(mapId);
      comparison.labels[mapId] = rel.label;
      
      // Detect conflicts (different labels for same relationship)
      const uniqueLabels = new Set(Object.values(comparison.labels));
      comparison.conflict = uniqueLabels.size > 1;
    }
  }
  
  return Array.from(relationshipMap.values());
}
```

### 3.3 Comparison Computation Flow

```typescript
async function computeComparison(
  mapIds: string[],
  options: {
    algorithm: 'exact' | 'fuzzy' | 'semantic';
    fuzzyThreshold?: number;
    semanticThreshold?: number;
  }
): Promise<ComparisonResult> {
  // 1. Load all maps and their concepts/relationships
  const maps = await loadMaps(mapIds);
  
  // 2. Build concept matching matrix
  const conceptMatches = await matchConcepts(maps, options);
  
  // 3. Compare relationships based on concept matches
  const relationshipComparisons = compareRelationships(maps, conceptMatches);
  
  // 4. Compute statistics
  const statistics = computeStatistics(conceptMatches, relationshipComparisons);
  
  return {
    sessionId: generateId(),
    domainId: getCurrentDomainId(),
    mapIds,
    conceptComparisons: Array.from(conceptMatches.values()),
    statistics,
    computedAt: Date.now(),
    algorithm: options
  };
}
```

---

## 4. Visualization Approaches

### 4.1 Overview Mode (Multi-Map Matrix)

**Purpose**: High-level view of all maps in a domain
**Best for**: Initial exploration, identifying which maps to compare in detail

**Features:**
- Grid/list of all maps in domain with thumbnails
- Heatmap showing pairwise similarity scores
- Quick stats (concept count, relationship count, last updated)
- Select 2+ maps to enter detailed comparison

### 4.2 Pairwise Side-by-Side

**Purpose**: Detailed comparison of exactly two maps
**Best for**: Deep dive into differences, educational feedback

**Features:**
- Split-screen with synchronized panning/zooming
- Highlight matched concepts in both maps (color-coded)
- Show unique concepts with distinct styling
- Click concept to see its counterpart (if exists)
- Relationship diff panel showing conflicts

**Layout:**
```
+------------------+------------------+
|    Map A         |     Map B        |
|                  |                  |
|  [Concept 1]     |   [Concept 1]    | <- Matched (green)
|  [Concept 2]     |   (missing)      | <- Unique to A (blue)
|  (missing)       |   [Concept 3]    | <- Unique to B (orange)
+------------------+------------------+
|  Relationship Differences Panel     |
|  A->B: "causes" vs "influences"     | <- Conflict (red)
+-------------------------------------+
```

### 4.3 Unified Overlay View

**Purpose**: See all maps superimposed on single canvas
**Best for**: Identifying consensus and outliers, 3+ maps

**Features:**
- Single canvas with all concepts rendered
- Concepts present in multiple maps shown as "stacked" or "merged" nodes
- Color/opacity indicates how many maps contain each concept
- Toggle individual maps on/off
- Cluster view groups similar concepts spatially

**Visual Encoding:**
- **Consensus concepts** (in all maps): Solid, dark color, larger size
- **Partial consensus** (in some maps): Semi-transparent, proportional to count
- **Unique concepts** (in one map): Light, small, map-specific color

### 4.4 Difference/Delta View

**Purpose**: Focus only on differences relative to a reference map
**Best for**: Expert review, template-based assessment

**Features:**
- One map designated as "reference" (e.g., expert/template map)
- Other maps show only additions and omissions relative to reference
- Green = Correctly present
- Red = Missing (should be present)
- Yellow = Extra (not in reference)

### 4.5 Reconciliation Mode

**Purpose**: Collaboratively build consensus map from multiple sources
**Best for**: Team alignment, knowledge synthesis

**Features:**
- Start with blank canvas or copy of one map
- Side panel shows unresolved differences
- Drag concepts/relationships from source maps into consensus map
- Voting/commenting on disputed elements
- Real-time collaboration with presence indicators
- Track provenance (which source maps contributed each element)

**Workflow:**
1. **Exploration Phase**: Review all maps in overview/pairwise modes
2. **Discussion Phase**: Team discusses differences via comments/video
3. **Reconciliation Phase**: Collaboratively build consensus map
4. **Validation Phase**: Review final map against original sources

---

## 5. Implementation Roadmap

### Phase A: Foundation & Data Model (Weeks 1-2)

**Goal**: Establish core entities and basic team/domain management

**Tasks:**
1. **Schema Migration**
   - Define InstantDB schema with new entities (teams, domains, etc.)
   - Write migration script to update existing maps if needed
   - Deploy schema updates to InstantDB
   
2. **Basic CRUD Hooks**
   - `useTeams()`, `useTeamActions()` - Create/join teams
   - `useDomains()`, `useDomainActions()` - Manage domains
   - `useDomainMaps()` - Add/remove maps from domains
   
3. **UI Scaffolding**
   - Team management page (create team, invite members)
   - Domain management within teams
   - Map assignment to domains (drag-drop or picker)

**Success Criteria:**
- Users can create teams and domains
- Maps can be assigned to domains
- Data persists correctly in InstantDB

---

### Phase B: Comparison Core Logic (Weeks 3-4)

**Goal**: Implement exact-match comparison algorithm and data structures

**Tasks:**
1. **Comparison Engine**
   - `src/lib/comparison/conceptMatching.ts` - Exact match algorithm
   - `src/lib/comparison/relationshipMatching.ts` - Relationship comparison
   - `src/lib/comparison/computeComparison.ts` - Main computation orchestration
   
2. **Comparison Sessions**
   - `useComparisonSessions()` - CRUD for comparison sessions
   - Store comparison results in session metadata (or separate cache)
   
3. **Performance Optimization**
   - Client-side computation for <50 concepts
   - Consider Web Worker for larger maps
   - Memoization of comparison results

**Success Criteria:**
- Can select 2+ maps and compute comparison
- Comparison result includes matched concepts and relationships
- Computation completes in <1s for typical maps (20-30 concepts)

---

### Phase C: Basic Visualization (Weeks 5-6)

**Goal**: Implement overview mode and pairwise comparison UI

**Tasks:**
1. **Overview Mode**
   - `src/components/comparison/DomainOverview.tsx`
   - Display all maps in domain as grid
   - Show similarity matrix (heatmap)
   - Select maps for detailed comparison
   
2. **Pairwise Comparison**
   - `src/components/comparison/PairwiseComparison.tsx`
   - Split-screen React Flow canvases
   - Synchronized pan/zoom
   - Highlight matched vs. unique concepts
   - Relationship diff panel
   
3. **Comparison State Management**
   - Create `src/stores/comparisonStore.ts` (Zustand)
   - Manage selected maps, mode, filters, etc.

**Success Criteria:**
- Users can view domain overview with map thumbnails
- Pairwise comparison shows two maps side-by-side
- Matched concepts are visually linked/highlighted

---

### Phase D: Advanced Visualizations (Weeks 7-8)

**Goal**: Add unified overlay and difference views

**Tasks:**
1. **Unified Overlay View**
   - `src/components/comparison/UnifiedOverlay.tsx`
   - Render all maps on single canvas
   - Visual encoding for consensus level (color, opacity, size)
   - Toggle maps on/off
   
2. **Difference View**
   - `src/components/comparison/DifferenceView.tsx`
   - Reference map selection
   - Highlight additions/omissions/matches
   
3. **View Switching**
   - Tab or dropdown to switch between modes
   - Preserve state when switching views

**Success Criteria:**
- Unified view shows multiple maps overlaid
- Difference view clearly identifies missing/extra concepts
- Smooth transitions between views

---

### Phase E: Reconciliation Workflow (Weeks 9-11)

**Goal**: Enable collaborative consensus map creation

**Tasks:**
1. **Reconciliation UI**
   - `src/components/comparison/ReconciliationCanvas.tsx`
   - Editable canvas for consensus map
   - Side panel with unresolved differences
   - Drag-and-drop from source maps
   
2. **Consensus Map Management**
   - `useConsensusMapActions()` - Create/update consensus maps
   - Track source provenance (which concepts came from which maps)
   - Mark conflicts as resolved
   
3. **Real-time Collaboration**
   - Leverage InstantDB presence for cursors/focus
   - Show who's editing what in real-time
   - Conflict resolution for simultaneous edits
   
4. **Discussion Features**
   - Comments on specific concepts/relationships
   - Vote/approve mechanism for disputed elements
   - Activity log

**Success Criteria:**
- Teams can collaboratively build consensus map
- Unresolved differences are clearly surfaced
- Real-time updates visible to all participants

---

### Phase F: Enhanced Matching & Polish (Weeks 12-14)

**Goal**: Fuzzy matching, performance optimization, and UX refinement

**Tasks:**
1. **Fuzzy Matching**
   - Implement Levenshtein distance-based matching
   - Adjustable threshold slider in UI
   - Manual override to link/unlink concepts
   
2. **Performance Optimization**
   - Caching of comparison results
   - Incremental updates (recompute only changed maps)
   - Pagination/virtualization for large comparison lists
   
3. **UX Enhancements**
   - Onboarding tour for comparison features
   - Keyboard shortcuts for navigation
   - Export comparison reports (PDF, CSV)
   - Undo/redo for reconciliation edits
   
4. **Access Control Enforcement**
   - Implement permissions for domains (view/edit/admin)
   - Role-based restrictions on consensus map editing

**Success Criteria:**
- Fuzzy matching improves concept alignment by 30%+
- Performance remains smooth with 100+ concept maps
- Users complete comparison tasks 50% faster than Phase C

---

### Phase G: Advanced Features (Future)

**Goal**: Semantic matching, analytics, and scalability

**Tasks:**
1. **Semantic Matching**
   - Integrate embeddings API (OpenAI, local model)
   - Synonym detection and concept clustering
   
2. **Analytics & Insights**
   - Domain-level statistics dashboard
   - Track knowledge convergence over time
   - Identify common misconceptions across students
   
3. **Scalability**
   - Server-side comparison computation for very large maps
   - Distributed caching layer
   
4. **Template System**
   - Mark maps as reusable templates
   - Quick-compare new maps against templates

---

## 6. Technical Considerations

### 6.1 Performance

**Client-Side vs. Server-Side Computation:**
- **Client-side** (Phase B-C): Suitable for <100 concepts, instant feedback
- **Server-side** (Phase G+): For large maps (>100 concepts) or complex algorithms (semantic matching)
- **Hybrid** (Phase F): Client handles UI, worker thread handles computation

**Optimization Strategies:**
- Cache comparison results in session metadata or IndexedDB
- Incremental updates: Only recompute when maps change
- Debounce comparison triggers during active editing
- Virtual scrolling for large concept lists

### 6.2 Real-time Collaboration

**Leveraging InstantDB Presence:**
- Track user cursors and focused concepts during reconciliation
- Show live editing indicators (who's adding/moving concepts)
- Synchronize view state (pan/zoom) optionally

**Conflict Resolution:**
- Optimistic UI updates with automatic merge
- Last-write-wins for most fields
- Special handling for conflict resolution flags (merge with OR logic)

### 6.3 Data Integrity

**Challenges:**
- Maps may be edited during active comparison session
- Concepts/relationships may be deleted after comparison computed
- Consensus maps reference source maps that could be deleted

**Solutions:**
- Version tracking: Store map snapshot IDs in comparison sessions
- Soft deletes: Mark maps as "archived" rather than hard delete
- Orphan detection: Warn if source maps changed significantly since comparison

### 6.4 Access Control & Permissions

**Entity-Level Permissions:**
- Teams: Owner can manage members, settings
- Domains: Admins can add/remove maps, initiate comparisons
- Consensus Maps: Only domain members can edit (configurable)

**InstantDB Permission Rules:**
```typescript
// Example: Only team members can view domains
{
  domains: {
    allow: {
      read: "auth.id in data.team.memberships.userId",
      create: "auth.id in data.team.memberships.userId && data.team.memberships.role in ['owner', 'admin']",
      update: "auth.id in data.team.memberships.userId && data.team.memberships.role in ['owner', 'admin']",
      delete: "auth.id in data.team.memberships.userId && data.team.memberships.role == 'owner'"
    }
  }
}
```

### 6.5 Edge Cases

1. **Circular Relationships**: Ensure comparison handles cycles gracefully
2. **Self-Referential Concepts**: Same concept in map multiple times (rare but possible)
3. **Empty Maps**: Handle maps with 0 concepts without errors
4. **Duplicate Labels**: Multiple concepts with identical labels in same map
5. **Concurrent Edits**: Two users resolving same conflict simultaneously
6. **Large Map Divergence**: Maps with <10% overlap may need different UI treatment

### 6.6 Schema Migration Strategy

**For Existing Users:**
1. Add new entities without modifying existing ones initially
2. Provide migration tool to assign existing maps to domains
3. Default: Create personal team/domain for each user with their maps
4. Gradual adoption: Comparison features only available after domain setup

---

## 7. Open Questions & Alternatives

### Question 1: Concept Matching Algorithm Priority

**Options:**
- **A**: Start with exact match only (MVP), add fuzzy in Phase 2
- **B**: Implement fuzzy from start with exact as special case (threshold=1.0)
- **C**: Provide manual linking as primary method, auto-match as suggestion

**Recommendation**: Option A for faster MVP, B if development bandwidth allows

**Trade-offs:**
- A: Faster to market, but limited usefulness for real-world maps
- B: Better UX from start, but more complex testing
- C: Most flexible, but high user effort

---

### Question 2: Comparison Result Storage

**Options:**
- **A**: Store full comparison result in `comparisonSessions.metadata` JSON field
- **B**: Create separate `comparisonResults` entity with normalized structure
- **C**: Compute on-demand, no persistent storage (cache in client only)

**Recommendation**: Start with C (Phase B-C), move to A for Phase E+ when sessions are long-lived

**Trade-offs:**
- A: Simple, but JSON field not queryable
- B: Queryable, but complex schema and potential data duplication
- C: No storage cost, but recomputation overhead

---

### Question 3: Consensus Map Editing Model

**Options:**
- **A**: Consensus map is regular editable map with special metadata
- **B**: Consensus map is read-only, built via "merge operations" interface
- **C**: Hybrid: Free-form editing + structured merge interface

**Recommendation**: Option C for maximum flexibility

**Trade-offs:**
- A: Familiar editing experience, but loses provenance
- B: Clear provenance, but restrictive for users
- C: Best of both worlds, but complex implementation

---

### Question 4: Team vs. Individual Comparison

**Options:**
- **A**: Comparison features only available within domains (requires team/domain setup)
- **B**: Allow individual users to compare their own maps without domains
- **C**: Hybrid: Basic pairwise comparison without domains, advanced features require domains

**Recommendation**: Option C to reduce onboarding friction

**Trade-offs:**
- A: Cleaner architecture, but higher barrier to entry
- B: Easy for individuals, but feature inconsistency
- C: Gradual adoption path, but more code paths

---

### Question 5: Real-time vs. Batch Comparison

**Options:**
- **A**: Live comparison updates as maps are edited
- **B**: Comparison is snapshot at session creation time
- **C**: Manual refresh button to recompute comparison

**Recommendation**: B for Phase B-D, add C in Phase E, consider A for Phase G

**Trade-offs:**
- A: Always accurate, but high computational cost
- B: Simple, but can become stale
- C: User control, but extra friction

---

## 8. Success Metrics

### Adoption Metrics
- % of users who create teams/domains
- % of domains with 2+ maps
- % of users who initiate comparisons
- Average comparisons per active user per week

### Engagement Metrics
- Time spent in comparison views
- Number of consensus maps created
- Conflicts resolved per session
- Comments/discussions per comparison

### Quality Metrics
- Concept matching accuracy (manual validation sample)
- User-reported false positives/negatives
- Consensus map completeness vs. source maps

### Performance Metrics
- Comparison computation time (p50, p95, p99)
- Page load time for comparison views
- Real-time latency for collaborative edits

---

## 9. Future Enhancements

### Advanced Algorithms
- **Semantic Matching**: Use NLP embeddings for synonym detection
- **Hierarchical Matching**: Consider graph structure (e.g., subtree similarity)
- **Learned Matching**: Train model on user corrections to improve auto-matching

### Visualization Innovations
- **3D Overlay View**: Use Z-axis to separate overlapping concepts
- **Animated Transitions**: Morph between comparison modes smoothly
- **AR/VR**: Immersive comparison for large/complex maps

### Collaboration Features
- **Video Chat Integration**: Built-in calling during reconciliation
- **Asynchronous Discussion**: Threaded comments on concepts
- **Approval Workflows**: Require expert sign-off on consensus maps

### Analytics & Reporting
- **Learning Analytics**: Identify struggling students via map comparison
- **Knowledge Gap Analysis**: Highlight missing concepts across team
- **Evolution Tracking**: Visualize how understanding changes over time
- **Export to Standards**: Generate reports mapped to curriculum standards

### Integration & Extensibility
- **LMS Integration**: Import/export to Canvas, Moodle, etc.
- **API for Comparison**: Allow external tools to trigger comparisons
- **Plugin System**: Custom matching algorithms and visualizations

---

## 10. Minimal Viable Product (MVP) Scope

If aggressive timeline or resource constraints, prioritize this subset:

### MVP Entities
- `domains` (simplified: name, owner, no teams)
- `domainMaps` (link maps to domain)
- Skip teams, comparison sessions, consensus maps initially

### MVP Features
1. **Domain Management**: Create domain, add maps
2. **Pairwise Comparison**: Select 2 maps, see side-by-side view
3. **Exact Matching**: Highlight identical concepts (case-insensitive)
4. **Difference List**: Simple text list of unique concepts per map

### MVP Timeline: 3-4 Weeks
- Week 1: Domain schema + UI
- Week 2: Comparison algorithm (exact match)
- Week 3: Pairwise visualization
- Week 4: Polish + bug fixes

### Post-MVP Expansion
- Add teams for multi-user collaboration
- Add fuzzy matching for better concept alignment
- Add unified overlay view for 3+ maps
- Add reconciliation workflow and consensus maps

---

## 11. Summary & Next Steps

This integrated plan synthesizes the comprehensive schema design from the SONNET variant, the clear success criteria and incremental delivery strategy from the GPT5 variant, and the detailed technical interfaces from the COMPOSER variant.

### Key Strengths of This Integrated Approach
1. **Complete Data Model**: Detailed InstantDB schema with all entities and links
2. **Flexible Algorithms**: Three matching strategies with clear implementation path
3. **Multiple Visualization Modes**: Five distinct views for different use cases
4. **Structured Reconciliation**: Clear workflow for team consensus building
5. **Incremental Delivery**: Seven phases from MVP to advanced features
6. **Comprehensive Technical Coverage**: Performance, collaboration, security, edge cases

### Recommended Next Actions
1. **Stakeholder Review**: Share this plan with team/users for feedback
2. **Scope Decision**: Choose between MVP (3-4 weeks) or full Phase A-F (14 weeks)
3. **Answer Open Questions**: Resolve the 5 key decision points outlined in Section 7
4. **Technical Spike**: Prototype comparison algorithm with sample data (1-2 days)
5. **Schema Finalization**: Lock down InstantDB schema and write migration script
6. **Phase A Kickoff**: Begin foundation work (teams, domains, basic UI)

### Risk Mitigation
- **Complexity Risk**: Start with MVP to validate concept before full build
- **Performance Risk**: Benchmark comparison computation early (Week 2)
- **Adoption Risk**: Conduct user testing at end of Phase C
- **Scope Risk**: Re-evaluate roadmap after each phase completion

---

## Appendix: Comparison to Original Plans

### Elements from COMPOSER Plan
- TypeScript interfaces for `ConceptComparison` and `RelationshipComparison`
- Zustand `ComparisonUIState` structure
- 10-phase breakdown (condensed to 7 phases here)
- Concept/relationship matching algorithm pseudocode

### Elements from GPT5 Plan
- Problem overview and use cases
- Success criteria and adoption metrics
- Incremental delivery strategy (Phase A-F structure)
- Schema migration strategy for existing users
- Access control emphasis

### Elements from SONNET Plan
- Complete InstantDB schema with links
- Five visualization approaches (added matrix view)
- Five-step reconciliation workflow
- Comprehensive technical considerations
- Edge cases and data integrity concerns
- Future enhancements section

### Integrations & Enhancements
- Merged phase structures into cohesive 7-phase roadmap (A-G)
- Combined matching algorithms into single progressive strategy
- Synthesized visualization approaches with clear use cases
- Unified all open questions with options and recommendations
- Added MVP scope section for resource-constrained scenarios
- Cross-referenced all entity relationships for consistency

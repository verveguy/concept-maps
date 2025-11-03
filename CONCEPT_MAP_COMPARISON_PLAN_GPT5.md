# Concept Map Comparison Feature Plan

## 1. Problem Overview

- **Context**: Multiple team members independently create concept maps for the same domain. The product currently allows editing an individual map but does not support comparing several maps side by side or collaboratively converging on a shared understanding.
- **Goal**: Enable teams to compare member maps for a domain, highlight differences, facilitate discussion in real time, and help the team synthesize a shared concept map.

## 2. Success Criteria

- Teams can associate maps with domains and view all maps for a given domain in one place.
- Users can enter a comparison workspace that visualizes similarities and differences across maps.
- The comparison experience supports real-time, multi-user collaboration (presence, shared focus, annotations).
- The workflow guides the team toward reconciling differences and producing an updated shared map that everyone agrees on.
- The solution scales to domains with many concepts/relationships (performance and layout considerations).

## 3. Assumptions & Constraints

- Existing InstantDB-backed entities (`maps`, `concepts`, `relationships`, `perspectives`, `shares`) remain the source of truth.
- Authentication and user identities already exist and can be reused for team membership.
- Initial version focuses on textual/graphical comparison; automated semantic merging is future work.
- Maintain backward compatibility for standalone (non-team) map editing.

## 4. Incremental Delivery Strategy

### Phase A – Domain & Team Foundations
- Introduce `domains` and `teams` entities in InstantDB; connect existing maps to domains and users to teams.
- Provide minimal UI for creating domains, associating maps with domains, and managing team membership.
- Migration/backfill strategy for existing maps (optional default domain per user or manual reassignment UI).

### Phase B – Domain Collections View
- Domain dashboard showing all maps grouped by domain with owner metadata and timestamps.
- Domain-level filters/search, quick open of individual maps.
- Entry point to comparison workspace (select maps to compare).

### Phase C – Comparison Workspace (MVP)
- Canvas layout supporting two-map side-by-side comparison with synchronized zoom/pan.
- Visual diff cues (color coding, overlays) for shared vs unique concepts/relationships.
- Linked selection: selecting a concept in one map highlights corresponding concepts in the other.
- Presence indicators (leveraging existing presence infrastructure) scoped to comparison sessions.

### Phase D – Multi-Map Comparison Enhancements
- Extend workspace to handle 3+ maps: tabbed pairwise view, aggregated overlay, or matrix.
- Aggregate view: merged canvas showing consensus (concepts present in all maps) vs divergences with per-map annotations.
- Difference summary panel (table of concepts/relationships with map coverage counts).

### Phase E – Reconciliation Workflow
- Guided process to mark items as “needs discussion,” add notes, assign follow-up tasks.
- Copy/edit operations to build a shared “team map” starting from consensus baseline.
- Track decision history and provide export to create/update a shared map entity linked to the domain.

### Phase F – Collaboration & Facilitation Tools
- Real-time comments/annotations pinned to concepts/relationships during comparison sessions.
- Shared focus modes (one user drives, others follow) and structured agenda prompts.
- Notifications for team members when comparison sessions are scheduled or progress is made.

## 5. Data Model Proposal

### New Entities
- `domains`: `{ id, name, description, createdBy, createdAt, updatedAt }`
- `teams`: `{ id, name, createdBy, createdAt, updatedAt }`
- `team_members`: `{ id, teamId, userId, role }` (role: owner/member)
- `domain_members`: `{ id, domainId, userId, role }` or infer from team membership if domains are team-scoped.
- `comparison_sessions` (future): `{ id, domainId, initiatorId, mapIds[], startedAt, endedAt }`

### Entity Relationships
- Map-to-domain: add `domainId` FK to `maps` entity (nullable for legacy); optionally allow multi-domain association via join table if needed later.
- Domain-to-team: either direct `teamId` on domains or many-to-many via domain_members.
- Shared “team map”: extend `maps` with `isShared` flag and link to `domainId`/`teamId`.

### Derived / Computed Data
- Concept/relationship alignment metadata stored per comparison session (e.g., `{ conceptLabel, mapIdsPresentIn }`).
- Cached diff results to improve performance on large datasets.

## 6. UX & Interaction Design Concepts

- **Domain Hub**: Cards or list grouped by team, showing map count, last updated, quick actions.
- **Comparison Selection**: Multi-select maps from a domain, choose comparison mode (pairwise, overlay, table).
- **Visual Diff Techniques**:
  - Color (e.g., blue for consensus, orange for partial overlap, grey for unique).
  - Ghost nodes/edges to represent missing elements in one map relative to another.
  - Alignment lines or callouts for similar but not identical concepts (e.g., synonyms).
- **Supporting Panels**:
  - Summary panel with statistics (shared concepts count, unique items per user, relationship overlap).
  - Comment thread or checklist for reconciliation tasks.
  - Activity log showing who made observations/changes.
- **Collaboration**:
  - Live cursors and selection outlines per user.
  - “Follow user” toggle to sync viewport.
  - Voting or flagging mechanisms to mark items needing follow-up.

## 7. Technical Considerations

- **Schema Migration**: Update InstantDB schema and generated TypeScript types; ensure front-end hooks gracefully handle missing `domainId` for older maps.
- **Diff Computation**: Investigate strategies for comparing graph structures:
  - Label-based matching as MVP.
  - Optionally support metadata-driven or fuzzy matching (stemming/synonyms) later.
  - Consider precomputing diffs server-side (InstantDB functions or edge workers) vs client-side.
- **Performance**: Optimize React Flow rendering for multiple large graphs (virtualization, lazy loading, toggled layers).
- **Real-time Coordination**: Reuse presence rooms or create `comparison` rooms keyed by domain + session.
- **Access Control**: Ensure only domain/team members can access comparison workspace; integrate with `shares` or new permissions model.

## 8. Open Questions

- Should a domain belong to exactly one team, or can multiple teams collaborate on the same domain?
- Do we allow individual (non-team) users to create domains for personal comparison workflows?
- How do we handle naming conflicts or near-duplicate concepts during comparisons (manual merge vs automated suggestions)?
- What is the minimum viable visualization for highlighting differences without overwhelming the user?
- Do we need versioning of comparison sessions (e.g., snapshot results, export meeting notes)?

## 9. Next Steps

1. Validate data model additions with stakeholders; confirm domain/team ownership rules.
2. Prototype low-fidelity comparison UI concepts (wireframes) to decide on pairwise vs aggregated layout for the MVP.
3. Plan schema changes and migration path; update InstantDB schema file and associated types.
4. Define API/hooks for fetching domain-scoped map collections and diff results.
5. Enumerate user stories and acceptance criteria per phase, then slot into delivery roadmap.


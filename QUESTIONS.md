# Concept Mapping Tool - Questions & Clarifications

## 1. Data Model & Schema

**1.1 Concept Map Structure:**
- Should each Concept Map be stored as a single document/entity in InstantDB, or should concepts and relationships be stored as separate entities?

Separate entities. Use InstantDB features to store Concepts and Relationships entities and also to store Perspectives that allow defined subsets of the global concept map to be worked on. 

- Preferred approach: a) Single entity with nested arrays (simpler), b) Separate Concept and Relationship entities (more normalized)

Normalized.



**1.2 Metadata Properties:**
- What metadata properties should each concept bubble support? (e.g., description, tags, created/modified timestamps, color, size, custom key-value pairs)
- Should metadata be:
  - a) Fixed schema (predefined fields)
  - b) Flexible schema (arbitrary key-value pairs)
  - c) Hybrid (some fixed + custom fields)

  Hybrid.

**1.3 Relationships:**
- Should relationships support metadata/labels beyond just the connection text? (e.g., relationship type, strength, direction)

Yes, Realtionships should be rich entities in their own right. I don't yet know what their schema should be, so let's keep it flexible for now.

- Can relationships be bidirectional, or always directional?

Relationships are logically bi-directional but the words used in each direction may be slightly different for grammatical purposes. For example "Architects draw Diagrams" and "Diagrams are drawn by Architects"

Relationships are defined in a "primary direction" which is important for the default text representation of a Concept->Relationship->Concept  triple. In the future, we may also want to be able to render a Perspective of the concept map starting from a given Concept, so that may require us to render the graph following outbound Relationships in their non-primary direction. (e.g. If I take the example graph and start from Diagrams, then we would follow the relationship to Architects in the non-primary direction)

## 2. Markdown Text View

**2.1 Markdown Format:**
- What syntax should represent concepts and relationships in Markdown? 
  - a) Custom syntax (e.g., `[Concept Name](metadata)` and `Concept1 --> Concept2: relationship label`)
  - b) Extend existing formats (Mermaid, PlantUML, etc.)
  - c) Create new format inspired by your Observable notebook
  
  The Markdown should be simple text phrases, using links to allow navigation to the Concepts and the Relationship that make up each triple. 

  Actually, Markdown might not be the right vehicle here for the text representation of a map ... maybe we just need a structured text-like output so we can have controls on the Concepts and Relationship text spans/divs. It does need to be editable but not sophisticated.

  We DO need Markdown for the Notes / Documentation support for each Concept and Relationship - editable notes metadata on each entity.

- Should the Markdown view support the full concept map structure including metadata?
On reflection, I don't think it should be a markdown view. Rather, it should be a structured text representation that is editable.

**2.2 Synchronization:**
- How should conflicts be resolved when editing the same concept/relationship simultaneously in text vs. graph view?
  - a) Last-write-wins
  - b) Merge strategies
  - c) Lock editing to one view at a time

Let InstantDB handle that.

**2.3 Text Editor Features:**
- Should the Markdown editor have:
  - a) Basic textarea with syntax highlighting
  - b) Rich text editor (WYSIWYG)
  - c) Code editor with IntelliSense/autocomplete

See above. Let's make this simpler - no Markdown in the text representation. Just a structured text editor

## 3. User Authentication & Access Control

**3.1 Authentication:**
- How should users authenticate?
  - a) InstantDB built-in auth (email/password)
  - b) OAuth providers (Google, GitHub, etc.)
  - c) No auth (public/anonymous editing)

Use InstantDB mechanisms, yes. 

**3.2 Access Control:**
- Should concept maps have:
  - a) Public/private settings
  - b) Share links with permissions (view/edit)
  - c) User roles (owner, editor, viewer)

Sharing yes. No public/private settings for now.

**3.3 Multi-Map Support:**
- Should users be able to create and manage multiple concept maps?
- How should maps be listed/browsed? (dashboard, sidebar, etc.)

Yes, the can make multiple maps. They can also create multiple Perpesctives (sub maps) of any given map.
A sidebar style browser is probably good enough to start with that shows Maps and any Perspectives as nested underneath a Map.

## 4. UI/UX & Technical Preferences

**4.1 UI Framework:**
- Preferred UI component library:
  - a) shadcn/ui (Tailwind-based)
  - b) Material-UI
  - c) Custom/plain CSS
  - d) Other preference

Shandcn and tailwindcss for the win!

React 19

**4.2 Package Manager:**
- Preferred package manager:
  - a) pnpm (your preference per memories)
  - b) npm
  - c) yarn

pnpm yes!

**4.3 Build Tool:**
- Preferred React build tool:
  - a) Vite
  - b) Next.js
  - c) Create React App
  - d) Other

Vite is fast for SPAs. No need for Next.js at this time.

**4.4 Presence Cursors:**
- How should presence cursors be displayed?
  - a) Simple colored cursors with usernames
  - b) Avatars/icons at cursor position
  - c) Highlighted nodes/areas being edited
  - d) All of the above

All of the above.

## 5. React Flow Customization

**5.1 Node Customization:**
- Should concept nodes be:
  - a) Simple circular/rectangular nodes with text
  - b) Customizable shapes (circles, rectangles, polygons)
  - c) Rich nodes with expandable metadata panels

Rich nodes, but not customizable shapes. Metadata panels, yes.

**5.2 Layout:**
- Should the tool support:
  - a) Manual positioning only (drag-and-drop)
  - b) Automatic layout algorithms (force-directed, hierarchical, etc.)
  - c) Both manual and automatic

Both.

**5.3 Edge/R relationship Customization:**
- Should relationship arrows support:
  - a) Simple directional arrows with labels
  - b) Customizable styles (dashed, colored, weighted)
  - c) Curved vs. straight options

Let's give options.

## 6. Feature Priorities

**6.1 MVP Scope:**
- Which features are essential for MVP vs. nice-to-have?
  - Core: Two-way editing (graph ↔ text), collaborative editing, presence cursors
  - Optional: Export/import, version history, comments, search, zoom/pan controls

I want all of these, but start with Core.

**6.2 Performance:**
- What's the expected scale?
  - Number of concepts per map: ___ (e.g., 10-100, 100-1000, 1000+)
  - Concurrent users per map: ___ (e.g., 2-5, 5-20, 20+)

10-1090 sounds about right.

## 7. Additional Features

**7.1 Export/Import:**
- Should concept maps be exportable to:
  - a) JSON
  - b) Image formats (PNG, SVG)
  - c) PDF
  - d) Other formats (specify)

JSON, SVG.

**7.2 Version History:**
- Should the tool track:
  - a) Real-time changes only (no history)
  - b) Version snapshots (save points)
  - c) Full change history with replay

Version snapshots sounds good, initiated by the User or when the user navigates away from a graph. "Logically ends the "editing session") Let's think git-friendly stable JSON export so we can also put the maps in git.

**7.3 Search & Navigation:**
- Should the tool include:
  - a) Search concepts by name/metadata
  - b) Filter by tags/metadata
  - c) Navigation breadcrumbs/path highlights

Yes to all.

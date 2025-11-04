---
sidebar_position: 6
---

# Layout Algorithms

The application supports multiple layout algorithms for arranging concept nodes on the canvas.

## Force-Directed Layout

Based on d3-force, simulates physical forces:

- **Repulsion**: Nodes repel each other
- **Attraction**: Connected nodes attract
- **Gravity**: Keeps nodes in center
- **Collision**: Prevents node overlap

### Implementation

Located in \`src/lib/layouts/forceDirected.ts\`:

\`\`\`typescript
export function calculateForceDirectedLayout(
  nodes: Node[],
  edges: Edge[]
): NodePosition[]
\`\`\`

## Hierarchical Layout

Based on dagre, arranges nodes in hierarchical layers:

- **Top-Down**: Parent nodes above children
- **Layered**: Nodes organized in levels
- **Ranking**: Determines node levels

### Implementation

Located in \`src/lib/layouts/hierarchical.ts\`:

\`\`\`typescript
export function calculateHierarchicalLayout(
  nodes: Node[],
  edges: Edge[]
): NodePosition[]
\`\`\`

## Layout Controls

Users can:

- **Auto-Layout**: Apply selected algorithm
- **Manual Positioning**: Drag nodes freely
- **Reset**: Reset to auto-layout
- **Fit View**: Zoom to show all nodes

## Performance

- Layouts calculated client-side
- Debounced for performance
- Can be interrupted by user interaction

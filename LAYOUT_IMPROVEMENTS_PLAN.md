# Concept Map Layout Improvements Plan

## Current State
- **Force-directed layout**: Basic d3-force implementation, may not handle cycles optimally
- **Hierarchical layout**: Uses dagre, assumes tree structure (not ideal for concept maps with cycles)

## Concept Map Characteristics
- No root node
- Often have cycles
- Multiple relationships from any node
- Multiple relationships between same concepts
- Need to minimize edge crossings
- Need clear visual separation

## Recommended Layout Algorithms

### 1. **Improved Force-Directed (d3-force)**
**Why**: Already using d3-force, can be significantly improved with better parameters
- Better charge strength tuning
- Adaptive link distances
- Improved collision detection
- Better initial positioning

### 2. **Circular Layout**
**Why**: Excellent for concept maps - treats all nodes equally, handles cycles naturally
- Arranges nodes in a circle
- Distributes evenly
- Works well for small-medium graphs
- Simple and fast

### 3. **Stress-Majorization (via elkjs)**
**Why**: Preserves graph-theoretic distances, handles cycles well
- Minimizes stress (difference between ideal and actual distances)
- Good for preserving relationships
- Handles complex graphs

### 4. **Layered Layout (via elkjs)**
**Why**: Better than dagre for graphs with cycles
- Can handle cycles by breaking them intelligently
- Better edge routing
- More sophisticated than basic hierarchical

### 5. **Constraint-Based Layout (cola.js)**
**Why**: Allows specifying constraints, handles cycles well
- Can specify alignment constraints
- Good for maintaining certain relationships
- More control over final layout

## Implementation Priority

### Phase 1: Quick Wins (Implement Now)
1. **Improved Force-Directed** - Better tuning of existing d3-force
2. **Circular Layout** - Simple implementation, great for concept maps

### Phase 2: Advanced Layouts (Add elkjs)
3. **Stress-Majorization** - Via elkjs
4. **Layered Layout** - Via elkjs (better than dagre for cycles)

### Phase 3: Optional Enhancement
5. **Constraint-Based** - Via cola.js (if needed)

## Library Recommendations

### Primary: elkjs
- **Package**: `elkjs`
- **TypeScript**: Full support
- **Size**: ~500KB (can be lazy-loaded)
- **Algorithms**: Stress-majorization, layered, force-directed, box, etc.
- **Pros**: Very powerful, handles cycles well, many algorithms
- **Cons**: Larger bundle size

### Secondary: cola.js (WebCoLa)
- **Package**: `webcola` (or `cola`)
- **TypeScript**: Types available
- **Size**: ~100KB
- **Algorithms**: Constraint-based force-directed
- **Pros**: Handles constraints well, good for cycles
- **Cons**: Less algorithms than elkjs

## Implementation Plan

1. Improve existing force-directed layout
2. Add circular layout
3. Add elkjs and implement stress-majorization layout
4. Add elkjs layered layout (better than dagre)
5. Update UI to show all layout options
6. Add layout presets for different graph sizes/types



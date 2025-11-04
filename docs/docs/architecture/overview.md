---
sidebar_position: 1
---

# Architecture Overview

The Concept Mapping Tool is built as a modern, real-time collaborative web application using React, InstantDB, and React Flow.

## Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **State Management**: Zustand for UI state, InstantDB for data state
- **Graph Rendering**: React Flow
- **Real-time Sync**: InstantDB
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Architecture Principles

1. **Serverless**: No backend server; InstantDB handles all data persistence and sync
2. **Real-time First**: All data changes are synchronized instantly
3. **Component-Based**: Modular React components with clear responsibilities
4. **Type-Safe**: Full TypeScript coverage
5. **Permission-Based**: Fine-grained access control via InstantDB permissions

## System Architecture

```
┌─────────────────────────────────────────┐
│         React Application               │
│  ┌─────────────┐  ┌──────────────┐     │
│  │   UI State  │  │   Data State │     │
│  │  (Zustand)  │  │  (InstantDB) │     │
│  └─────────────┘  └──────────────┘     │
│           │              │              │
│           └──────┬───────┘              │
│                  │                      │
│         ┌────────▼────────┐            │
│         │  React Hooks    │            │
│         │  useQuery()     │            │
│         │  useTransact()  │            │
│         └────────┬────────┘            │
└──────────────────┼─────────────────────┘
                   │
         ┌─────────▼─────────┐
         │    InstantDB      │
         │  (Backend as a    │
         │   Service)        │
         └───────────────────┘
```

## Key Concepts

- **Maps**: Top-level containers for concept maps
- **Concepts**: Nodes in the concept map
- **Relationships**: Edges connecting concepts
- **Perspectives**: Filtered views of maps
- **Shares**: Access control for maps

## Data Flow

1. User interacts with UI component
2. Component calls hook (e.g., `useConceptActions`)
3. Hook uses `useTransact()` to mutate InstantDB
4. InstantDB syncs changes to all connected clients
5. `useQuery()` hooks automatically update React components
6. UI reflects changes in real-time

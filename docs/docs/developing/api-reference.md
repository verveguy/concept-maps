---
sidebar_position: 1
---

# API Reference

The API Reference provides comprehensive documentation for all components, hooks, utilities, and stores in the Concept Mapping Tool, automatically generated from TypeScript source code using [TypeDoc](https://typedoc.org/).

## Overview

The API reference is organized into the following sections:

- **[Components](./api/components.auth.LoginForm)** - React components with props and methods
- **[Hooks](./api/hooks.useConceptActions)** - Custom React hooks for data access
- **[Utilities](./api/lib.data)** - Helper functions and utilities
- **[Stores](./api/stores.mapStore)** - Zustand stores for UI state management

## Generating the API Reference

The API reference is automatically generated from TypeScript source code. To regenerate:

```bash
pnpm api:generate
```

To generate and build the documentation site:

```bash
pnpm api:build
```

## Contributing

When adding new components, hooks, or utilities:

1. Add JSDoc comments to your code
2. Document all public APIs
3. Include usage examples in comments
4. Regenerate the API reference: `pnpm api:generate`

Example JSDoc comment:

```typescript
/**
 * A custom hook for managing concept data.
 * 
 * @param mapId - The ID of the map to load concepts from
 * @returns An object containing concepts array and loading state
 * 
 * @example
 * ```tsx
 * const { concepts, isLoading } = useConcepts(mapId)
 * ```
 */
export function useConcepts(mapId: string) {
  // ...
}
```

## Browse the API

[View Full API Overview →](./api/api-overview)


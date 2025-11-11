# Building a Serverless Collaborative App with InstantDB, Vite, and GitHub Pages

I built a concept mapping tool that runs entirely on GitHub Pages, powered by InstantDB for the backend, Vite for the dev experience, and GitHub Actions for deployment. Here's how it works and why the developer experience feels so smooth.

## The Stack

My tech stack:

- **Frontend**: React + TypeScript + Vite
- **Backend**: InstantDB (no server code!)
- **State Management**: Zustand for UI state, InstantDB for data state
- **Testing**: Vitest with full coverage
- **Deployment**: GitHub Pages via GitHub Actions
- **Development**: Cursor AI for pair programming

The magic is in how these pieces fit together—especially InstantDB's ability to handle all backend concerns without any server code.

## InstantDB: Backend as Code

InstantDB makes this architecture possible. Instead of writing API endpoints, database migrations, and WebSocket servers, I define my schema and permissions in TypeScript:

```typescript
// instant.schema.ts
const schema = i.schema({
  entities: {
    maps: i.entity({
      name: i.string().indexed(),
      createdAt: i.number().indexed(),
      // ...
    }),
    concepts: i.entity({
      label: i.string().indexed(),
      positionX: i.number(),
      positionY: i.number(),
      // ...
    }),
    // ...
  },
  links: {
    conceptsMap: {
      forward: { on: 'concepts', has: 'one', label: 'map' },
      reverse: { on: 'maps', has: 'many', label: 'concepts' },
    },
  },
})
```

That's it. No migrations. No ORM. No database connection strings. Just pure TypeScript types that InstantDB uses to generate your entire backend.

### Permissions That Just Work

Permissions are equally declarative. Want to allow map owners and users with write permissions to edit concepts? Just write:

```typescript
// instant.perms.ts
concepts: {
  bind: [
    'canEditParentMap',
    'mapIsOwned || mapHasWritePermission || mapHasManagePermission',
  ],
  allow: {
    view: 'canReadParentMap',
    create: 'canEditParentMap',
    update: 'canEditParentMap',
    delete: 'canEditParentMap',
  },
}
```

The best part? Permission changes take effect immediately during development. No server restart. No cache invalidation. Just save the file and watch Vite's HMR update the app instantly. I can test permission changes in real-time, seeing exactly what users with different roles can access.

## The Developer Experience

### Data Syncs Automatically

Here's what development looks like:

1. **Query data** using links to traverse relationships:
```typescript
const { data, isLoading } = db.useQuery(
  currentMapId ? {
    maps: {
      $: { where: { id: currentMapId } },
      concepts: {
        $: { where: { deletedAt: { $isNull: true } } },
      },
    },
  } : null
)
```

2. **Mutate data** with transactions:
```typescript
await db.transact([
  tx.concepts[conceptId].update({
    label: 'New Label',
    updatedAt: Date.now(),
  }),
])
```

3. **Watch it sync**—instantly. Open two browser windows, make a change in one, and watch it appear in the other. No WebSocket setup. No polling. No manual sync logic. InstantDB handles it all.

### Vite Makes Everything Instant

Vite's HMR (Hot Module Replacement) means code changes update in <100ms, schema changes show TypeScript errors immediately, and permission changes can be tested live without refreshing. Combined with InstantDB's real-time sync, I'm essentially building a live, collaborative application while coding.

### Cursor AI Integration

Using Cursor AI with this stack is powerful. Cursor understands my InstantDB schema and suggests correct query structures. Full TypeScript support means it can infer types from the schema. It helps write permission bindings and can generate Vitest tests based on hooks. The combination of InstantDB's type-safe queries and Cursor's AI assistance means less time debugging and more time building features.

## Testing

I use Vitest for the test suite, and it integrates well with InstantDB:

```typescript
// Mock InstantDB in tests
vi.mock('@/lib/instant', () => ({
  db: {
    useAuth: vi.fn(() => ({ user: null })),
    useQuery: vi.fn(() => ({ data: null })),
    transact: vi.fn().mockResolvedValue(undefined),
  },
  // ...
}))
```

Since InstantDB handles all the backend complexity, my tests focus on business logic—not API mocking or database setup. I have comprehensive coverage of canvas interactions, permission checks, data synchronization, layout algorithms, and deep linking. Running `pnpm test:coverage` gives confidence that the app works correctly, and GitHub Actions runs these tests on every PR.

## Deployment

My GitHub Actions workflow is simple:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    steps:
      - name: Run tests with coverage
        run: pnpm test:coverage
      
      - name: Build app
        run: pnpm build
        env:
          VITE_INSTANTDB_APP_ID: ${{ vars.VITE_INSTANTDB_APP_ID }}
          VITE_INSTANTDB_API_KEY: ${{ secrets.VITE_INSTANTDB_API_KEY }}
      
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

That's it. No Docker. No Kubernetes. No server provisioning. Just:
1. Push to main
2. Tests run automatically
3. Build happens
4. GitHub Pages deploys

The entire CI/CD pipeline is a single YAML file. No complexity. No maintenance.

## Architecture

The architecture follows a simple pattern:

**Data State (InstantDB)**
- All persistent data lives in InstantDB
- Accessed via `useQuery()` hooks using links to traverse relationships
- Updated via `db.transact()` calls
- Automatically syncs in real-time

**UI State (Zustand)**
- Local UI state (selected items, editor open/closed, etc.)
- Doesn't need to sync across clients
- Fast and simple

**Components**
- React components that compose hooks
- No direct database access
- Pure, testable functions

This separation makes testing easy (mock InstantDB, test UI logic), debugging straightforward (clear data flow), and scaling simple (InstantDB handles the hard parts).

## Adding a Feature: Real Example

When I added comments to concepts, here's what I did:

1. **Update schema** (`instant.schema.ts`):
```typescript
comments: i.entity({
  text: i.string(),
  createdAt: i.number().indexed(),
  // ...
}),
links: {
  commentsConcepts: {
    forward: { on: 'comments', has: 'many', label: 'concepts' },
    reverse: { on: 'concepts', has: 'many', label: 'comments' },
  },
  commentsMap: {
    forward: { on: 'comments', has: 'one', label: 'map' },
    reverse: { on: 'maps', has: 'many', label: 'comments' },
  },
}
```

2. **Add permissions** (`instant.perms.ts`):
```typescript
comments: {
  allow: {
    view: 'canReadParentMap',
    create: 'canEditParentMap',
    update: 'canEditParentMap',
  },
}
```

3. **Create a hook** (`useComments.ts`):
```typescript
export function useComments() {
  const currentMapId = useMapStore((state) => state.currentMapId)
  
  const { data } = db.useQuery(
    currentMapId ? {
      maps: {
        $: { where: { id: currentMapId } },
        comments: {
          $: { where: { deletedAt: { $isNull: true } } },
          concepts: {},
        },
      },
    } : null
  )
  
  return data?.maps?.[0]?.comments || []
}
```

4. **Use it in a component**:
```typescript
function CommentList() {
  const comments = useComments()
  return <div>{comments.map(c => <Comment key={c.id} comment={c} />)}</div>
}
```

5. **Test it**:
```typescript
describe('useComments', () => {
  it('should fetch comments for current map', () => {
    // Test logic here
  })
})
```

That's the entire feature. No API endpoints. No database migrations. No WebSocket handlers. Just schema, permissions, hooks, and components.

## Lessons Learned

1. **Embrace serverless**: You don't need servers for most applications
2. **Type safety matters**: InstantDB's TypeScript integration catches errors early
3. **Live feedback**: Vite + InstantDB = instant gratification
4. **Test everything**: Vitest makes testing easy, so do it
5. **Keep it simple**: Less infrastructure = less to break

## Conclusion

Building a collaborative application doesn't have to mean managing servers, databases, and WebSocket connections. With InstantDB, Vite, and GitHub Pages, I can focus on building features instead of infrastructure.

The developer experience is smooth: data syncs automatically, permissions update live, tests run on every commit, and deployments happen automatically. It's the kind of setup that makes me want to build more features, not less.

---

**Try it yourself**: 
- [Live app](https://v3rv.com/concept-maps)
- [Repository](https://github.com/yourusername/concept-maps)


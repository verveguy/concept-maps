# InstantDB Setup

This document describes the InstantDB setup and configuration for the Concept Mapping Tool.

## App Configuration

- **App ID**: Set via `VITE_INSTANTDB_APP_ID` environment variable
- **App Title**: Concept Mapping Tool

**Note**: Admin tokens and API keys should never be committed to the repository. Store them securely in environment variables or a secrets management system.

## Environment Variables

Create a `.env` file in the root directory with:

```
VITE_INSTANTDB_APP_ID=your-app-id-here
```

**Note**: No API key is needed for client-side usage in InstantDB v0.22. The appId is sufficient.

## Schema Definition

The schema has been created in `instant-schema.json` with the following entities:

### Entities:

1. **maps** - Concept maps
   - name, createdBy, createdAt, updatedAt

2. **concepts** - Concept nodes
   - mapId, label, positionX, positionY, notes, metadata, createdAt, updatedAt

3. **relationships** - Relationships between concepts
   - mapId, fromConceptId, toConceptId, primaryLabel, reverseLabel, notes, metadata, createdAt, updatedAt

4. **perspectives** - Filtered views of maps
   - mapId, name, conceptIds, relationshipIds, createdBy, createdAt

5. **shares** - Map sharing permissions
   - mapId, userId, permission, createdAt

### Links:

- concepts ↔ maps (many-to-one)
- relationships ↔ maps (many-to-one)
- relationships ↔ concepts (from/to, many-to-one)
- perspectives ↔ maps (many-to-one)
- shares ↔ maps (many-to-one)

## Next Steps

To push the schema to InstantDB, you have two options:

1. **Via InstantDB Dashboard** (Recommended):
   - Go to https://instantdb.com/dash
   - Select your app
   - Go to Schema section
   - Import or manually add the entities from `instant-schema.json`

2. **Via MCP Tools** (if having connection issues):
   - The schema is ready in `instant-schema.json`
   - Use `instant push-schema` CLI command if available
   - Or contact InstantDB support if MCP tools continue to have issues

The schema format in `instant-schema.json` follows InstantDB's schema definition format and should work once pushed.

## Schema Files

The project uses the following schema files:

- `instant-schema.json` - Schema definition file
- `src/instant.schema.ts` - TypeScript schema definitions
- `src/instant.perms.ts` - Permission rules

## Best Practices

When working with InstantDB in this project, refer to the InstantDB Development Rules (see `.cursorrules` in the project root) for critical patterns and best practices, including:

- Query syntax rules (especially null value checks)
- Link vs foreign key patterns
- Permission rules and CEL expressions
- Mutation patterns and transactions

For the complete set of InstantDB development rules, see the [project repository](https://github.com/verveguy/concept-maps/blob/main/.cursorrules).


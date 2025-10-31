# InstantDB Setup Complete

## App Configuration
- **App ID**: `58e6b84c-91aa-49d6-8159-ab1ecafb93f5`
- **Admin Token**: `a652d105-d8c9-471f-a033-140250e8b1c0` (keep secure!)
- **App Title**: Concept Mapping Tool

## Environment Variables
The `.env` file has been configured with:
```
VITE_INSTANTDB_APP_ID=58e6b84c-91aa-49d6-8159-ab1ecafb93f5
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
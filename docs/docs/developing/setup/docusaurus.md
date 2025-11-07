# Docusaurus Documentation Setup

This document describes the Docusaurus documentation setup for the Concept Mapping Tool.

## Overview

The documentation site is built with Docusaurus and deployed to GitHub Pages alongside the main application.

## Structure

```
docs/
├── docs/                    # Documentation source files
│   ├── user-guide/         # User documentation
│   ├── components/         # Component API documentation
│   ├── architecture/       # Architecture documentation
│   └── developing/         # Developer documentation
├── src/
│   ├── components/         # Custom React components
│   ├── css/                # Custom styles
│   └── pages/              # Additional pages
├── static/                 # Static assets
├── docusaurus.config.ts    # Docusaurus configuration
├── sidebars.ts             # Sidebar configuration
└── package.json            # Dependencies and scripts
```

## URLs

After deployment:
- **App**: `https://verveguy.github.io/concept-maps/app/`
- **Docs**: `https://verveguy.github.io/concept-maps/docs/`

## Local Development

```bash
# Start documentation dev server
cd docs
pnpm start

# Or from root
pnpm docs:dev
```

## Building

```bash
# Build documentation
cd docs
pnpm build

# Or from root
pnpm docs:build
```

## Deployment

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`):

1. Builds both the app and docs
2. Copies app build to `deploy/app/`
3. Copies docs build to `deploy/docs/`
4. Creates index.html redirect
5. Deploys to GitHub Pages

## Configuration

### Docusaurus Config

- **Base URL**: `/concept-maps/docs/`
- **Organization**: `verveguy`
- **Project**: `concept-maps`

### Vite Config

- **Base URL**: `/concept-maps/app/` (production only)

## Adding Documentation

1. **User Guide**: Add files to `docs/docs/user-guide/`
2. **Components**: Add files to `docs/docs/components/`
3. **Architecture**: Add files to `docs/docs/architecture/`
4. **Developing**: Add files to `docs/docs/developing/`

Update `docs/sidebars.ts` to include new pages in the sidebar.

## Initial Setup Summary

The Docusaurus site was initialized with TypeScript support and configured for GitHub Pages deployment. The following structure was created:

### Documentation Sections

#### User Guide (`docs/docs/user-guide/`)
- Getting Started
- Creating Maps
- Editing Concepts
- Relationships
- Perspectives
- Collaboration
- Sharing

#### Components (`docs/docs/components/`)
- Component overview and API documentation
- Core components (ConceptNode, ConceptEditor, etc.)
- Layout components
- Presence components

#### Architecture (`docs/docs/architecture/`)
- Architecture overview
- Data model
- State management
- InstantDB integration
- Real-time synchronization
- Layout algorithms
- Performance considerations

#### Developing (`docs/docs/developing/`)
- Setup & Configuration
- Development Guides
- Planning Documents

### Package.json Scripts

Added scripts to root `package.json`:
- `pnpm docs:dev` - Start docs dev server
- `pnpm docs:build` - Build docs
- `pnpm docs:serve` - Serve built docs
- `pnpm build:docs` - Build docs from root
- `pnpm build:all` - Build both app and docs

## Next Steps

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: GitHub Actions
   - The workflow will deploy automatically on push to main/master

2. **Add Secrets** (if needed for build):
   - `VITE_INSTANTDB_APP_ID`
   - `VITE_INSTANTDB_API_KEY`
   - These are already referenced in the workflow

3. **Test Locally**:
   ```bash
   cd docs
   pnpm install
   pnpm start
   ```

4. **Build Test**:
   ```bash
   cd docs
   pnpm build
   ```

5. **Push to Trigger Deployment**:
   - Push to main/master branch
   - GitHub Actions will build and deploy both sites

## Documentation Maintenance

### Adding New Documentation

1. Add markdown files to the appropriate section:
   - `docs/docs/user-guide/` for user docs
   - `docs/docs/components/` for component docs
   - `docs/docs/architecture/` for architecture docs
   - `docs/docs/developing/` for developer docs

2. Update `docs/sidebars.ts` to include new pages

3. Use MDX format (Markdown + JSX) for rich content

### Component Documentation

To add detailed component documentation:
1. Read component source files
2. Document props, usage, and examples
3. Add to appropriate section in `docs/docs/components/`

## Notes

- Documentation uses Docusaurus v3.9.2
- Supports TypeScript
- MDX for rich content
- Automatic sidebar generation
- Search functionality included
- Dark mode support
- Documentation uses MDX format (Markdown + JSX)
- Components can be embedded directly in documentation
- Code blocks support syntax highlighting
- Links use relative paths or `/docs/` prefix


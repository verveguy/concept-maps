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
│   └── architecture/       # Architecture documentation
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

Update `docs/sidebars.ts` to include new pages in the sidebar.

## Notes

- Documentation uses MDX format (Markdown + JSX)
- Components can be embedded directly in documentation
- Code blocks support syntax highlighting
- Links use relative paths or `/docs/` prefix

# Building the Project

This guide walks you through building and running the Concept Mapping Tool from source.

## Prerequisites

Before you begin, ensure you have the following tools installed:

### Required Tools

- **Node.js** (version 18 or higher)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`

- **pnpm** (Package Manager)
  - Install via npm: `npm install -g pnpm`
  - Or via Homebrew (macOS): `brew install pnpm`
  - Verify installation: `pnpm --version`

- **Git**
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

### Optional but Recommended

- **GitHub CLI** - For easier repository management
- **VS Code** or your preferred code editor
- **GitHub account** - For cloning and contributing

## Cloning the Repository

1. **Clone the repository** using Git:

   ```bash
   git clone https://github.com/verveguy/concept-maps.git
   cd concept-maps
   ```

   Or if you prefer SSH:

   ```bash
   git clone git@github.com:verveguy/concept-maps.git
   cd concept-maps
   ```

2. **Verify the clone** by checking the directory structure:

   ```bash
   ls -la
   ```

   You should see directories like `src/`, `docs/`, `package.json`, etc.

## Installing Dependencies

1. **Install project dependencies** using pnpm:

   ```bash
   pnpm install
   ```

   This will:
   - Install all npm packages listed in `package.json`
   - Set up the workspace (if using pnpm workspaces)
   - Install dependencies for both the main app and documentation site

2. **Verify installation** by checking for `node_modules/` directory:

   ```bash
   ls node_modules | head -5
   ```

## Environment Configuration

Before running the application, you need to configure environment variables.

### 1. Create Environment File

Create a `.env` file in the root directory:

```bash
touch .env
```

### 2. Configure InstantDB

Add your InstantDB credentials to `.env`:

```env
VITE_INSTANTDB_APP_ID=your_app_id_here
```

**Note**: 
- For client-side usage in InstantDB v0.22+, only the App ID is required
- No API key is needed for client-side applications
- See [InstantDB Setup](./instantdb.md) for detailed configuration instructions

### 3. Verify Environment File

Ensure `.env` is in `.gitignore` (it should be by default):

```bash
grep .env .gitignore
```

This prevents accidentally committing secrets to the repository.

## Running the Development Server

1. **Start the development server**:

   ```bash
   pnpm dev
   ```

   This will:
   - Start the Vite development server
   - Enable hot module replacement (HMR)
   - Open the app at `http://localhost:5173`

2. **Access the application**:

   Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

3. **Stop the server**:

   Press `Ctrl+C` in the terminal where the server is running.

## Building for Production

1. **Build the application**:

   ```bash
   pnpm build
   ```

   This creates an optimized production build in the `dist/` directory.

2. **Preview the production build**:

   ```bash
   pnpm preview
   ```

   This serves the production build locally for testing.

3. **Build the documentation**:

   ```bash
   pnpm docs:build
   ```

   This builds the Docusaurus documentation site in `docs/build/`.

## Project Structure

Understanding the project structure helps when navigating the codebase:

```
concept-maps/
├── src/                    # Main application source code
│   ├── components/        # React components
│   │   ├── auth/          # Authentication components
│   │   ├── concept/       # Concept-related components
│   │   ├── graph/          # Graph visualization components
│   │   ├── layout/        # Layout components
│   │   ├── presence/      # Presence/collaboration components
│   │   └── ...
│   ├── hooks/             # React hooks for data access
│   ├── stores/            # Zustand stores for UI state
│   ├── lib/               # Utilities and configuration
│   │   ├── instant.ts     # InstantDB client setup
│   │   ├── layouts/       # Layout algorithms
│   │   └── ...
│   └── pages/             # Page components
├── docs/                   # Documentation site
│   ├── docs/              # Documentation source files
│   ├── src/               # Docusaurus custom components
│   └── docusaurus.config.ts
├── instant/                # InstantDB schema definitions
├── .env                    # Environment variables (not committed)
├── package.json            # Project dependencies and scripts
└── vite.config.ts          # Vite configuration
```

## Available Scripts

The project includes several npm scripts for common tasks:

### Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

### Documentation

- `pnpm docs:dev` - Start documentation dev server
- `pnpm docs:build` - Build documentation
- `pnpm docs:serve` - Serve built documentation

### Combined

- `pnpm build:all` - Build both app and docs

## Troubleshooting

### Port Already in Use

If port 5173 is already in use:

```bash
# Kill the process using the port (macOS/Linux)
lsof -ti:5173 | xargs kill -9

# Or specify a different port
pnpm dev -- --port 3000
```

### Dependency Issues

If you encounter dependency issues:

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Environment Variables Not Loading

Ensure:
- `.env` file exists in the root directory
- Variables are prefixed with `VITE_` for Vite to expose them
- Restart the dev server after changing `.env`

## Next Steps

After successfully building and running the project:

1. **Set up InstantDB**: See [InstantDB Setup](./instantdb.md)
2. **Configure the schema**: Set up your database schema in the InstantDB dashboard
3. **Explore the codebase**: Check out the [Architecture Overview](../architecture/overview.md)
4. **Read component docs**: Start with [Components Overview](../components/intro.md)

## Getting Help

- Check the [GitHub Issues](https://github.com/verveguy/concept-maps/issues)
- Review the [Architecture Documentation](../architecture/overview.md)
- See [Development Guides](../guides/react-flow-optimization.md) for optimization tips


# Concept Mapping Tool

A collaborative concept mapping tool built with React, InstantDB, and React Flow. Create, visualize, and share concept maps with real-time collaboration, multiple editing modes, and rich metadata support.

## 🚀 Try It Now

**🌐 [Access the Application →](https://verveguy.github.io/concept-maps)**

The app is hosted on GitHub Pages and ready to use! No installation required.

### Creating an Account

1. **Visit the app** at [https://verveguy.github.io/concept-maps](https://verveguy.github.io/concept-maps)
2. **Click "Sign Up"** if you're a new user
3. **Enter your email address**
4. **Check your email** for a magic code
5. **Enter the code** to complete sign up
6. **Start creating maps** immediately!

The app uses InstantDB for authentication and data storage. See [Getting Started Guide](https://verveguy.github.io/concept-maps/docs/user-guide/getting-started) in the documentation.

## 📚 Documentation

**📖 [View Full Documentation →](https://verveguy.github.io/concept-maps/docs/)**

- **[User Guide](https://verveguy.github.io/concept-maps/docs/user-guide/intro)** - Learn how to use the application
- **[Developer Guide](https://verveguy.github.io/concept-maps/docs/developing/intro)** - Setup and development documentation
- **[API Reference](https://verveguy.github.io/concept-maps/docs/docs/)** - Complete API documentation

## Features

- Real-time collaborative editing via InstantDB
- Dual editing modes: Graph view (React Flow) and Structured Text view
- Presence indicators showing where collaborators are working
- Comments: Sticky note-style annotations linked to concepts
- Visual customization: Customize colors, styles, and appearance of nodes and edges
- Floating toolbars: Quick-access toolbars for editing nodes and relationships
- Perspectives: Filtered subsets of concept maps
- Rich metadata support for concepts and relationships
- Markdown notes/documents for concepts and relationships
- Version history with git-friendly JSON exports

## Setup

### Prerequisites

- Node.js 18+ and pnpm installed

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up InstantDB:
   - Create an account at [instantdb.com](https://instantdb.com)
   - Create a new app
   - Copy your App ID and API Key
   - Create a `.env` file in the root directory:
     ```
     VITE_INSTANTDB_APP_ID=your_app_id
     VITE_INSTANTDB_API_KEY=your_api_key
     ```

4. Set up your InstantDB schema in the InstantDB dashboard:
   - Go to your app's schema editor
   - Add the following entities:
     - `maps`: name (string), createdBy (string), createdAt (number), updatedAt (number)
     - `concepts`: mapId (string), label (string), positionX (number), positionY (number), notes (string), metadata (string), createdAt (number), updatedAt (number)
     - `relationships`: mapId (string), fromConceptId (string), toConceptId (string), primaryLabel (string), reverseLabel (string), notes (string), metadata (string), createdAt (number), updatedAt (number)
     - `perspectives`: mapId (string), name (string), conceptIds (string), relationshipIds (string), createdBy (string), createdAt (number)
     - `shares`: mapId (string), userId (string), permission (string), createdAt (number)

5. Run the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
src/
├── components/     # React components
├── hooks/         # React hooks for data access
├── stores/        # Zustand stores for UI state
├── lib/           # Utilities and configuration
└── pages/         # Page components
```

## Architecture

- **Model State**: All data stored in InstantDB, accessed via `useQuery()` hooks
- **Mutations**: All updates via `useTransact()` hooks
- **UI State**: Local UI state managed with Zustand stores
- **Real-time**: Automatic synchronization via InstantDB subscriptions

## Development

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview production build

## License

MIT

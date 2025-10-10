# Remember Book UI Components

UI components for the Remember Book ideas management application, built following the OpenAI Apps SDK patterns.

## Overview

This project contains React components designed to work with the OpenAI Apps SDK and MCP (Model Context Protocol) servers. The components provide interfaces for:

1. **Ideas List** (`ideas-list`) - Display a list of ideas with title, date, and urgency
2. **Idea Detail** (`idea-detail`) - Show detailed view of a single idea with all information

## Project Structure

```
rememberbook-app/
├── src/
│   ├── ideas-list/          # List view component
│   │   └── index.tsx
│   ├── idea-detail/         # Detail view component
│   │   └── index.tsx
│   ├── types.ts             # TypeScript type definitions
│   ├── use-openai-global.ts # OpenAI host integration hooks
│   ├── use-widget-state.ts  # State management hooks
│   ├── media-queries.ts     # Responsive design utilities
│   ├── utils.ts             # Helper functions
│   └── index.css            # Global styles
├── assets/                  # Built components (generated)
├── build-all.mts           # Build script
├── vite.config.mts         # Vite configuration
└── package.json
```

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn

## Installation

```bash
# Install dependencies
pnpm install

# Or with npm
npm install
```

## Development

### Local Development Server

Run the dev server to preview components:

```bash
pnpm run dev
```

This starts a Vite dev server at `http://localhost:5173` with individual component endpoints:

- `http://localhost:5173/ideas-list` - Ideas list component
- `http://localhost:5173/idea-detail` - Idea detail component

### Building Components

Build production-ready component bundles:

```bash
pnpm run build
```

This generates hashed bundles in the `assets/` directory:

- JavaScript modules (`.js`)
- CSS stylesheets (`.css`)
- HTML templates (`.html`)
- `manifest.json` with asset mappings

### Serving Built Assets

Serve the built assets with CORS enabled:

```bash
pnpm run serve
```

Assets are served at `http://localhost:4444` for MCP server integration.

## Component Features

### Ideas List Component

- Displays ideas with title, description, urgency, and dates
- Color-coded urgency levels (1-5 scale)
- Favorites toggle functionality
- Sorting by urgency, created date, updated date
- Responsive design for mobile/desktop
- Integration with OpenAI host for navigation

### Idea Detail Component

- Full idea information display
- Notes management (add, view notes)
- Interactive urgency indicator
- Date information (created/updated)
- Action buttons (edit, archive, delete, share)
- Back navigation to list view
- Responsive layout with fullscreen support

## Data Types

The components expect data in the following format:

```typescript
interface IdeaData {
  id: string;
  title: string;
  description: string;
  notes: Array<{
    text: string;
    timestamp: string;
  }>;
  urgency: number; // 1-5 scale
  archived: boolean;
  created_date: string; // ISO date
  updated_date: string; // ISO date
}
```

## OpenAI Integration

Components integrate with the OpenAI Apps SDK through:

- `window.openai.toolOutput` - Receives data from MCP tools
- `window.openai.widgetState` - Persists component state
- `window.openai.callTool()` - Triggers MCP tool calls
- `window.openai.sendFollowUpMessage()` - Sends messages to conversation
- `window.openai.requestDisplayMode()` - Changes display mode

## Styling

- Uses Tailwind CSS for styling
- Supports light/dark themes via OpenAI host
- Responsive design with mobile-first approach
- Custom urgency color palette
- Consistent with OpenAI Apps SDK design patterns

## MCP Server Integration

The built components are designed to work with MCP servers that:

1. Serve the component assets (HTML/JS/CSS)
2. Return `_meta.openai/outputTemplate` metadata in tool responses
3. Handle tool calls for data manipulation (CRUD operations)

Example MCP tool response:

```json
{
  "result": "Retrieved 5 ideas",
  "_meta": {
    "openai/outputTemplate": {
      "type": "ideas-list",
      "data": {
        "ideas": [...],
        "total_count": 5
      }
    }
  }
}
```

## Contributing

When modifying components:

1. Follow the existing patterns from the reference project
2. Maintain TypeScript types
3. Test with both light and dark themes
4. Ensure responsive design works on mobile/desktop
5. Update this README if adding new components

## License

MIT License

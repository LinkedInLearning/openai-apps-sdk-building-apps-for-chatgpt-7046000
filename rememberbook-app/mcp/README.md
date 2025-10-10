# RememberBook MCP Server

An MCP (Model Context Protocol) server that provides integration with the RememberBook API for managing ideas and tasks.

## Features

This MCP server provides tools and resources to interact with a RememberBook backend API:

### Tools

- **create_idea**: Create a new idea with title, description, and urgency level
- **get_idea**: Retrieve a specific idea by ID
- **list_ideas**: List all ideas with optional filtering (archived/active)
- **update_idea**: Update an existing idea's properties or add notes
- **archive_idea**: Archive an idea
- **restore_idea**: Restore (unarchive) an idea
- **delete_idea**: Permanently delete an idea

### Resources

- **rememberbook://ideas**: All active ideas
- **rememberbook://ideas/archived**: All archived ideas
- **rememberbook://ideas/{idea_id}**: Individual idea by ID
- **rememberbook://status**: API status and connection information

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build the TypeScript code:

```bash
npm run build
```

3. Set the RememberBook API URL (optional):

```bash
export REMEMBERBOOK_API_URL=http://localhost:5055
```

4. Start the server:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000/mcp` by default.

## Environment Variables

- `REMEMBERBOOK_API_URL`: The base URL of the RememberBook API (default: `http://localhost:5055`)
- `PORT`: The port for the MCP server (default: `3000`)

## Usage with MCP Clients

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Then connect to: `http://localhost:3000/mcp`

### Claude Code

```bash
claude mcp add --transport http rememberbook-server http://localhost:3000/mcp
```

### VS Code

```bash
code --add-mcp '{"name":"rememberbook-server","type":"http","url":"http://localhost:3000/mcp"}'
```

### Cursor

Click this deeplink: [cursor://anysphere.cursor-deeplink/mcp/install?name=rememberbook-server&config=eyJ1cmwiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAvbWNwIn0%3D](cursor://anysphere.cursor-deeplink/mcp/install?name=rememberbook-server&config=eyJ1cmwiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAvbWNwIn0%3D)

## API Schema

The server integrates with a RememberBook API that manages ideas with the following structure:

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "urgency": 1-5,
  "archived": boolean,
  "created_date": "string",
  "updated_date": "string",
  "notes": [
    {
      "text": "string",
      "timestamp": "string"
    }
  ]
}
```

Urgency levels:

- 1: Not Important
- 2: Low
- 3: Medium (default)
- 4: High
- 5: Immediate

## Development

The server is built with:

- TypeScript
- MCP TypeScript SDK
- Express.js for HTTP transport
- Zod for schema validation

To modify the server, edit `src/server.ts` and rebuild with `npm run build`.

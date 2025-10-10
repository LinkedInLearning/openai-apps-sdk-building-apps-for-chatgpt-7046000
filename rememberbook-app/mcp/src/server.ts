// CURRENT CODE

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";
import { readFileSync } from "fs";
import path from "path";

// Types based on the API schema
interface Idea {
  [x: string]: unknown;
  id: string;
  title: string;
  description: string;
  urgency: number;
  archived: boolean;
  created_date: string;
  updated_date: string;
  notes: Array<{
    text: string;
    timestamp: string;
  }>;
}

interface CreateIdeaRequest {
  title: string;
  description: string;
  urgency?: number;
}

interface UpdateIdeaRequest {
  title?: string;
  description?: string;
  urgency?: number;
  archived?: boolean;
  notes?: Array<string | { text: string; timestamp?: string }>;
}

// Create an MCP server
const server = new McpServer({
  name: "rememberbook-server",
  version: "1.0.0",
});

// Base URL for the RememberBook API
const REMEMBERBOOK_API_BASE =
  process.env.REMEMBERBOOK_API_URL || "http://localhost:5055";

// Load built UI assets
const ASSETS_PATH = path.resolve("../web/assets");
const manifest = JSON.parse(
  readFileSync(path.join(ASSETS_PATH, "manifest.json"), "utf8")
);

// Load component assets (JS + optional CSS) using manifest metadata
function loadAssetText(fileName: string | null | undefined) {
  if (!fileName) return "";
  const abs = path.join(ASSETS_PATH, fileName);
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return ""; // tolerate missing css (e.g. if inlined via JS import)
  }
}

const ideaListMeta = manifest.components["ideas-list"];
const ideaDetailMeta = manifest.components["idea-detail"];

const IDEA_LIST_JS = loadAssetText(ideaListMeta?.js);
const IDEA_LIST_CSS = loadAssetText(ideaListMeta?.css);
const IDEA_DETAIL_JS = loadAssetText(ideaDetailMeta?.js);
const IDEA_DETAIL_CSS = loadAssetText(ideaDetailMeta?.css);

// Shared widget metadata flags applied to tools and resources that can render UI components
const WIDGET_META_FLAGS = {
  "openai/widgetAccessible": true,
  "openai/resultCanProduceWidget": true,
} as const;

// Prefer manifest-declared resource URIs (already versioned) to avoid duplication
const VERSIONED_URIS = {
  ideasList: ideaListMeta?.resourceUri || `ui://widget/v${manifest.version}/ideas-list.html`,
  ideaDetail: ideaDetailMeta?.resourceUri || `ui://widget/v${manifest.version}/idea-detail.html`,
};

function widgetHtml(rootId: string, js: string, css?: string) {
  return `\n<div id="${rootId}"></div>\n${css ? `<style>${css}</style>` : ""}\n<script type="module">${js}</script>\n`.trim();
}

// Helper function to make API requests
async function makeApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${REMEMBERBOOK_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}


// Register tools for idea management

// Create idea tool
server.registerTool(
  "create_idea",
  {
    title: "Create Idea",
    description: "Create a new idea in RememberBook",
    inputSchema: {
      title: z.string().describe("The title of the idea"),
      description: z.string().describe("The description of the idea"),
      urgency: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe(
          "Urgency level (1=Not Important, 2=Low, 3=Medium, 4=High, 5=Immediate)"
        ),
    },
    outputSchema: {
      idea: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        urgency: z.number(),
        archived: z.boolean(),
        created_date: z.string(),
        updated_date: z.string(),
        notes: z.array(
          z.object({
            text: z.string(),
            timestamp: z.string(),
          })
        ),
      }),
    },
    _meta: {
      ...WIDGET_META_FLAGS,
      "openai/outputTemplate": VERSIONED_URIS.ideaDetail,
      "openai/toolInvocation/invoking": "Creating idea...",
      "openai/toolInvocation/invoked": "Idea created",
    },
  },
  async ({ title, description, urgency = 3 }) => {
    const idea = await makeApiRequest<Idea>("/ideas", {
      method: "POST",
      body: JSON.stringify({ title, description, urgency }),
    });

    return {
      content: [
        {
          type: "text",
          text: `Created new idea: **${idea.title}**`,
        },
      ],
      structuredContent: {
        idea: {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          urgency: idea.urgency,
          archived: idea.archived,
          created_date: idea.created_date,
          updated_date: idea.updated_date,
          notes: idea.notes || [],
        },
      },
      _meta: {
        operation: "create",
        createdAt: new Date().toISOString(),
        ideaId: idea.id,
      },
    };
  }
);

// Get idea tool
server.registerTool(
  "get_idea",
  {
    title: "Get Idea",
    description: "Get a specific idea by ID",
    inputSchema: {
      idea_id: z.string().describe("The ID of the idea to retrieve"),
    },
    outputSchema: {
      idea: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        urgency: z.number(),
        archived: z.boolean(),
        created_date: z.string(),
        updated_date: z.string(),
        notes: z.array(
          z.object({
            text: z.string(),
            timestamp: z.string(),
          })
        ),
      }),
    },
    _meta: {
      ...WIDGET_META_FLAGS,
      "openai/outputTemplate": VERSIONED_URIS.ideaDetail,
      "openai/toolInvocation/invoking": "Loading idea details...",
      "openai/toolInvocation/invoked": "Idea details loaded",
    },
  },
  async ({ idea_id }) => {
    const idea = await makeApiRequest<Idea>(`/ideas/${idea_id}`);

    return {
      content: [
        {
          type: "text",
          text: `**${idea.title}**\n\n${idea.description}\n\nUrgency: ${
            idea.urgency
          }/5 | ${idea.archived ? "Archived" : "Active"} | ${
            idea.notes?.length || 0
          } notes`,
        },
      ],
      structuredContent: {
        idea: {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          urgency: idea.urgency,
          archived: idea.archived,
          created_date: idea.created_date,
          updated_date: idea.updated_date,
          notes: idea.notes || [],
        },
      },
      _meta: {
        loadedAt: new Date().toISOString(),
        ideaId: idea.id,
      },
    };
  }
);

// List ideas tool
server.registerTool(
  "list_ideas",
  {
    title: "List Ideas",
    description: "List all ideas with optional filtering",
    inputSchema: {
      includeArchived: z
        .boolean()
        .optional()
        .describe("Include archived ideas"),
      archivedOnly: z
        .boolean()
        .optional()
        .describe("Return only archived ideas"),
    },
    outputSchema: {
      ideas: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          urgency: z.number(),
          archived: z.boolean(),
          created_date: z.string(),
          updated_date: z.string(),
          notes: z.array(
            z.object({
              text: z.string(),
              timestamp: z.string(),
            })
          ),
        })
      ),
      count: z.number(),
    },
    _meta: {
      ...WIDGET_META_FLAGS,
      "openai/outputTemplate": VERSIONED_URIS.ideasList,
      "openai/toolInvocation/invoking": "Loading ideas...",
      "openai/toolInvocation/invoked": "Ideas loaded",
    },
  },
  async ({ includeArchived = false, archivedOnly = false }) => {
    const queryParams = new URLSearchParams();
    if (includeArchived) queryParams.set("includeArchived", "true");
    if (archivedOnly) queryParams.set("archivedOnly", "true");

    const endpoint = `/ideas${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const ideas = await makeApiRequest<Idea[]>(endpoint);

    // Structure data for UI component
    const structuredData = {
      ideas: ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        urgency: idea.urgency,
        archived: idea.archived,
        created_date: idea.created_date,
        updated_date: idea.updated_date,
        notes: idea.notes || [],
      })),
      count: ideas.length,
    };

    return {
      content: [
        {
          type: "text",
          text: `Found ${ideas.length} ${archivedOnly ? "archived " : ""}ideas`,
        },
      ],
      structuredContent: structuredData,
      _meta: {
        filters: {
          includeArchived,
          archivedOnly,
        },
        lastSyncedAt: new Date().toISOString(),
      },
    };
  }
);

// Update idea tool
server.registerTool(
  "update_idea",
  {
    title: "Update Idea",
    description: "Update an existing idea",
    inputSchema: {
      idea_id: z.string().describe("The ID of the idea to update"),
      title: z.string().optional().describe("New title for the idea"),
      description: z
        .string()
        .optional()
        .describe("New description for the idea"),
      urgency: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe("New urgency level"),
      archived: z.boolean().optional().describe("Archive status"),
      notes: z
        .array(z.string())
        .optional()
        .describe("Additional notes to append"),
    },
    outputSchema: {
      idea: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        urgency: z.number(),
        archived: z.boolean(),
        updated_date: z.string(),
        created_date: z.string().optional(),
        notes: z
          .array(
            z.object({
              text: z.string(),
              timestamp: z.string(),
            })
          )
          .optional(),
      }),
    },
    _meta: {
      ...WIDGET_META_FLAGS,
      "openai/outputTemplate": VERSIONED_URIS.ideaDetail,
      "openai/toolInvocation/invoking": "Updating idea...",
      "openai/toolInvocation/invoked": "Idea updated",
    },
  },
  async ({ idea_id, title, description, urgency, archived, notes }) => {
    const updateData: UpdateIdeaRequest = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (urgency !== undefined) updateData.urgency = urgency;
    if (archived !== undefined) updateData.archived = archived;
    if (notes !== undefined) updateData.notes = notes;

    const idea = await makeApiRequest<Idea>(`/ideas/${idea_id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    const changes = [];
    if (title !== undefined) changes.push("title");
    if (description !== undefined) changes.push("description");
    if (urgency !== undefined) changes.push("urgency");
    if (archived !== undefined)
      changes.push(archived ? "archived" : "restored");
    if (notes !== undefined) changes.push("notes");

    return {
      content: [
        {
          type: "text",
          text: `Updated **${idea.title}**${
            changes.length > 0 ? ` (${changes.join(", ")})` : ""
          }`,
        },
      ],
      structuredContent: {
        idea: {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          urgency: idea.urgency,
          archived: idea.archived,
          updated_date: idea.updated_date,
          created_date: idea.created_date,
          notes: idea.notes || [],
        },
      },
      _meta: {
        operation: "update",
        updatedAt: new Date().toISOString(),
        changes: changes,
        ideaId: idea.id,
      },
    };
  }
);

// Add note tool (component initiated shortcut for appending a single note)
server.registerTool(
  "add_note",
  {
    title: "Add Note to Idea",
    description: "Append a note to an existing idea (convenience wrapper around update_idea)",
    inputSchema: {
      idea_id: z.string().describe("The ID of the idea to append a note to"),
      note: z.string().min(1).describe("The note text to append"),
    },
    outputSchema: {
      idea: z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        urgency: z.number(),
        archived: z.boolean(),
        created_date: z.string(),
        updated_date: z.string(),
        notes: z.array(
          z.object({
            text: z.string(),
            timestamp: z.string(),
          })
        ),
      }),
    },
    _meta: {
      ...WIDGET_META_FLAGS,
      "openai/outputTemplate": VERSIONED_URIS.ideaDetail,
      "openai/toolInvocation/invoking": "Adding note...",
      "openai/toolInvocation/invoked": "Note added",
    },
  },
  async ({ idea_id, note }) => {
    // Reuse update semantics: backend treats notes array as notes to append
    const idea = await makeApiRequest<Idea>(`/ideas/${idea_id}`, {
      method: "PUT",
      body: JSON.stringify({ notes: [note] }),
    });

    return {
      content: [
        { type: "text", text: `Added note to **${idea.title}**` },
      ],
      structuredContent: {
        idea: {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          urgency: idea.urgency,
          archived: idea.archived,
          created_date: idea.created_date,
          updated_date: idea.updated_date,
          notes: idea.notes || [],
        },
      },
      _meta: {
        operation: "add_note",
        addedAt: new Date().toISOString(),
        ideaId: idea.id,
      },
    };
  }
);

// Archive idea tool
server.registerTool(
  "archive_idea",
  {
    title: "Archive Idea",
    description: "Archive an idea",
    inputSchema: {
      idea_id: z.string().describe("The ID of the idea to archive"),
    },
    outputSchema: {
      success: z.boolean(),
      message: z.string(),
    },
  },
  async ({ idea_id }) => {
    await makeApiRequest(`/ideas/${idea_id}/archive`, {
      method: "POST",
    });

    return {
      content: [
        {
          type: "text",
          text: `Idea ${idea_id} has been archived`,
        },
      ],
      structuredContent: {
        success: true,
        message: `Idea ${idea_id} has been archived`,
      },
      _meta: {
        operation: "archive",
        archivedAt: new Date().toISOString(),
        ideaId: idea_id,
      },
    };
  }
);

// Restore idea tool
server.registerTool(
  "restore_idea",
  {
    title: "Restore Idea",
    description: "Restore (unarchive) an idea",
    inputSchema: {
      idea_id: z.string().describe("The ID of the idea to restore"),
    },
    outputSchema: {
      success: z.boolean(),
      message: z.string(),
    },
  },
  async ({ idea_id }) => {
    await makeApiRequest(`/ideas/${idea_id}/restore`, {
      method: "POST",
    });

    return {
      content: [
        {
          type: "text",
          text: `Idea ${idea_id} has been restored`,
        },
      ],
      structuredContent: {
        success: true,
        message: `Idea ${idea_id} has been restored`,
      },
      _meta: {
        operation: "restore",
        restoredAt: new Date().toISOString(),
        ideaId: idea_id,
      },
    };
  }
);

// Delete idea tool
server.registerTool(
  "delete_idea",
  {
    title: "Delete Idea",
    description: "Delete an idea permanently",
    inputSchema: {
      idea_id: z.string().describe("The ID of the idea to delete"),
    },
    outputSchema: {
      success: z.boolean(),
      message: z.string(),
    },
  },
  async ({ idea_id }) => {
    await makeApiRequest(`/ideas/${idea_id}`, {
      method: "DELETE",
    });

    return {
      content: [
        {
          type: "text",
          text: `Idea ${idea_id} has been deleted`,
        },
      ],
      structuredContent: {
        success: true,
        message: `Idea ${idea_id} has been deleted`,
      },
      _meta: {
        operation: "delete",
        deletedAt: new Date().toISOString(),
        ideaId: idea_id,
      },
    };
  }
);

// Register resources

// All ideas resource
server.registerResource(
  "ideas",
  "rememberbook://ideas",
  {
    title: "All Ideas",
    description: "All active ideas in RememberBook",
    mimeType: "application/json",
  },
  async () => {
    const ideas = await makeApiRequest<Idea[]>("/ideas");
    return {
      contents: [
        {
          text: JSON.stringify(ideas, null, 2),
          uri: "rememberbook://ideas",
          mimeType: "application/json",
        },
      ],
    };
  }
);

// Archived ideas resource
server.registerResource(
  "archived-ideas",
  "rememberbook://ideas/archived",
  {
    title: "Archived Ideas",
    description: "All archived ideas in RememberBook",
    mimeType: "application/json",
  },
  async () => {
    const ideas = await makeApiRequest<Idea[]>("/ideas?archivedOnly=true");
    return {
      contents: [
        {
          text: JSON.stringify(ideas, null, 2),
          uri: "rememberbook://ideas/archived",
          mimeType: "application/json",
        },
      ],
    };
  }
);

// Individual idea resource template
server.registerResource(
  "idea",
  new ResourceTemplate("rememberbook://ideas/{idea_id}", { list: undefined }),
  {
    title: "Individual Idea",
    description: "A specific idea by ID",
    mimeType: "application/json",
  },
  async (uri: URL, variables: any) => {
    const { idea_id } = variables;
    const idea = await makeApiRequest<Idea>(`/ideas/${idea_id}`);
    return {
      contents: [
        {
          text: JSON.stringify(idea, null, 2),
          uri: uri.toString(),
          mimeType: "application/json",
        },
      ],
    };
  }
);

// API status resource
server.registerResource(
  "api-status",
  "rememberbook://status",
  {
    title: "API Status",
    description: "RememberBook API status and information",
    mimeType: "application/json",
  },
  async () => {
    try {
      const status = await makeApiRequest("/");
      return {
        contents: [
          {
            text: JSON.stringify(status, null, 2),
            uri: "rememberbook://status",
            mimeType: "application/json",
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            text: JSON.stringify(
              {
                error: "Failed to connect to RememberBook API",
                details:
                  error instanceof Error ? error.message : "Unknown error",
                api_url: REMEMBERBOOK_API_BASE,
              },
              null,
              2
            ),
            uri: "rememberbook://status",
            mimeType: "application/json",
          },
        ],
      };
    }
  }
);

// Ideas List UI Resource
server.registerResource(
  "ideas-list-ui",
  VERSIONED_URIS.ideasList,
  {
    title: "Ideas List UI",
    description: "Interactive UI for displaying and managing ideas list",
    mimeType: "text/html+skybridge",
    _meta: {
      ...WIDGET_META_FLAGS,
      "openai/outputTemplate": VERSIONED_URIS.ideasList,
    },
  },
  async () => ({
    contents: [
      {
        uri: VERSIONED_URIS.ideasList,
        mimeType: "text/html+skybridge",
        text: widgetHtml("ideas-list-root", IDEA_LIST_JS, IDEA_LIST_CSS),
        _meta: {
          ...WIDGET_META_FLAGS,
          "openai/widgetDescription":
            "Renders an interactive UI showing the ideas returned by list_ideas for browsing, filtering, and navigating to idea details.",
          "openai/widgetPrefersBorder": true,
          "openai/outputTemplate": VERSIONED_URIS.ideasList,
        },
      },
    ],
  })
);

// Idea Detail UI Resource
server.registerResource(
  "idea-detail-ui",
  VERSIONED_URIS.ideaDetail,
  {
    title: "Idea Detail UI",
    description: "Interactive UI for viewing and editing a specific idea",
    mimeType: "text/html+skybridge",
    _meta: {
      ...WIDGET_META_FLAGS,
      "openai/outputTemplate": VERSIONED_URIS.ideaDetail,
    },
  },
  async () => ({
    contents: [
      {
        uri: VERSIONED_URIS.ideaDetail,
        mimeType: "text/html+skybridge",
        text: widgetHtml("idea-detail-root", IDEA_DETAIL_JS, IDEA_DETAIL_CSS),
        _meta: {
          ...WIDGET_META_FLAGS,
          "openai/widgetDescription":
            "Renders an interactive UI with the details of the idea returned by create_idea, get_idea, update_idea, and add_note.",
          "openai/widgetPrefersBorder": true,
          "openai/outputTemplate": VERSIONED_URIS.ideaDetail,
        },
      },
    ],
  })
);

// Set up Express and HTTP transport
const app = express();
app.use(express.json());

type SessionRecord = {
  transport: StreamableHTTPServerTransport;
};
const sessions = new Map<string, SessionRecord>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    // Create a new transport for each request to prevent request ID collisions
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  let session = sessions.get(sessionId);
  if (!session) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      enableJsonResponse: true,
    });
    session = { transport };
    sessions.set(sessionId, session);
    await server.connect(transport);

    res.on("close", () => {
      transport.close();
      sessions.delete(sessionId);
    });
  }

  await session.transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || "3000");
app
  .listen(port, () => {
    console.log(
      `RememberBook MCP Server running on http://localhost:${port}/mcp`
    );
    console.log(`Connecting to RememberBook API at: ${REMEMBERBOOK_API_BASE}`);
  })
  .on("error", (error) => {
    console.error("Server error:", error);
    process.exit(1);
  });

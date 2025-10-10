type UnknownObject = Record<string, unknown>;

export type WidgetState = UnknownObject;

export type SetWidgetState = (state: WidgetState) => Promise<void>;

export type Theme = "light" | "dark";

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

export type OpenAiGlobals<
  ToolInput extends UnknownObject = UnknownObject,
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject,
  WidgetState extends UnknownObject = UnknownObject
> = {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;

  // layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;

  // state
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
};

export type API<WidgetState extends UnknownObject = UnknownObject> = {
  /** Calls a tool on your MCP. Returns the full response. */
  callTool: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<CallToolResponse>;

  /** Triggers a followup turn in the ChatGPT conversation */
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;

  /** Opens an external link, redirects web page or mobile app */
  openExternal(payload: { href: string }): void;

  /** For transitioning an app from inline to fullscreen or pip */
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{
    /**
     * The granted display mode. The host may reject the request.
     * For mobile, PiP is always coerced to fullscreen.
     */
    mode: DisplayMode;
  }>;

  setWidgetState: (state: WidgetState) => Promise<void>;
};

export type CallToolResponse = {
  result: string;
  isError?: boolean;
  _meta?: {
    "openai/outputTemplate"?: {
      type: string;
      data: Record<string, unknown>;
    };
  };
};

export type DisplayMode = "pip" | "inline" | "fullscreen";

// Dispatched when any global changes in the host page
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;

  constructor(
    type: string,
    eventInitDict: CustomEventInit<{ globals: Partial<OpenAiGlobals> }>
  ) {
    super(type, eventInitDict);
  }
}

// Idea-specific types
export interface IdeaData {
  id: string;
  title: string;
  description: string;
  notes: Array<{
    text: string;
    timestamp: string;
  }>;
  urgency: number; // 1-5
  archived: boolean;
  created_date: string;
  updated_date: string;
}

export interface IdeasToolOutput {
  ideas: IdeaData[];
  total_count?: number;
  filters?: {
    archived?: boolean;
    urgency_min?: number;
    urgency_max?: number;
  };
}

export interface IdeaWidgetState extends Record<string, unknown> {
  selectedIdea?: string;
  viewMode?: "list" | "detail";
  favorites?: string[];
  sortBy?: "created_date" | "updated_date" | "urgency" | "title";
  sortOrder?: "asc" | "desc";
}

// Global window interface
declare global {
  interface Window {
    openai: API & OpenAiGlobals;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}

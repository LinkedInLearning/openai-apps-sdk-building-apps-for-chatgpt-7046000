import { useSyncExternalStore } from "react";
import {
  SET_GLOBALS_EVENT_TYPE,
  SetGlobalsEvent,
  type OpenAiGlobals,
} from "./types";

function createFallbackOpenAi(): Window["openai"] {
  const fallback: Partial<Window["openai"]> = {
    theme: "light",
    userAgent: {
      device: { type: "desktop" },
      capabilities: { hover: true, touch: false },
    },
    locale: "en",
    maxHeight: Number.POSITIVE_INFINITY,
    displayMode: "inline",
    safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
    toolInput: {},
    toolOutput: null,
    toolResponseMetadata: null,
    widgetState: null,
  };

  const dispatchGlobals = (globals: Partial<OpenAiGlobals>) => {
    Object.assign(fallback, globals);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new SetGlobalsEvent(SET_GLOBALS_EVENT_TYPE, {
          detail: { globals },
        })
      );
    }
  };

  Object.assign(fallback, {
    setWidgetState: async (state: OpenAiGlobals["widgetState"]) => {
      dispatchGlobals({ widgetState: state });
    },
    requestDisplayMode: async ({
      mode,
    }: {
      mode: OpenAiGlobals["displayMode"];
    }) => {
      dispatchGlobals({ displayMode: mode });
      return { mode };
    },
    callTool: async () => ({ result: "", isError: false }),
    sendFollowUpMessage: async () => {
      return;
    },
    openExternal: () => {
      return;
    },
  });

  return fallback as Window["openai"];
}

/**
 * React hook to subscribe to a specific global value from the OpenAI host
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: SetGlobalsEvent) => {
        const value = event.detail.globals[key];
        if (value === undefined) {
          return;
        }
        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
      };
    },
    () => {
      if (typeof window === "undefined") {
        // When rendering server-side we can't access globals; return a placeholder cast safely
        return undefined as unknown as OpenAiGlobals[K];
      }

      if (!window.openai) {
        window.openai = createFallbackOpenAi();
      }

      return window.openai[key];
    }
  );
}

// Convenience hooks for commonly used globals
export function useTheme() {
  return useOpenAiGlobal("theme");
}

export function useDisplayMode() {
  return useOpenAiGlobal("displayMode");
}

export function useMaxHeight() {
  return useOpenAiGlobal("maxHeight");
}

export function useToolInput() {
  return useOpenAiGlobal("toolInput");
}

// Internal promise cache for suspense until first non-null toolOutput arrives
let toolOutputWaiter: Promise<void> | null = null;

export function useToolOutput() {
  const value = useOpenAiGlobal("toolOutput");

  // Suspend until we have a non-null/undefined value. This allows components
  // that wrap their usage in <Suspense> to show skeleton fallbacks seamlessly.
  if (value == null) {
    if (typeof window === "undefined") {
      // On server just return null (no suspense server-side to avoid mismatch)
      return value;
    }
    if (!toolOutputWaiter) {
      toolOutputWaiter = new Promise<void>((resolve) => {
        const listener = (event: SetGlobalsEvent) => {
          if (event.detail.globals.toolOutput != null) {
            window.removeEventListener(SET_GLOBALS_EVENT_TYPE, listener);
            toolOutputWaiter = null; // reset for future suspensions if needed
            resolve();
          }
        };
        window.addEventListener(SET_GLOBALS_EVENT_TYPE, listener, {
          passive: true,
        });
      });
    }
    throw toolOutputWaiter;
  }

  return value;
}

export function useToolResponseMetadata() {
  return useOpenAiGlobal("toolResponseMetadata");
}

export function useSafeArea() {
  return useOpenAiGlobal("safeArea");
}

export function useUserAgent() {
  return useOpenAiGlobal("userAgent");
}

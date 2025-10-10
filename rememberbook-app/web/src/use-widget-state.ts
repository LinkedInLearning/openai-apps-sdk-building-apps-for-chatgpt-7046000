import { useCallback, useEffect, useState, SetStateAction } from "react";
import { useOpenAiGlobal } from "./use-openai-global";
import type { WidgetState } from "./types";

/**
 * Hook that manages widget state with automatic persistence to the OpenAI host
 */
export function useWidgetState<T extends WidgetState>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends WidgetState>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends WidgetState>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromWindow = useOpenAiGlobal("widgetState") as T;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow != null) {
      return widgetStateFromWindow;
    }

    return typeof defaultState === "function"
      ? (defaultState as () => T | null)()
      : defaultState ?? null;
  });

  useEffect(() => {
    _setWidgetState(widgetStateFromWindow);
  }, [widgetStateFromWindow]);

  const setWidgetState = useCallback((state: SetStateAction<T | null>) => {
    _setWidgetState((prevState) => {
      const newState = typeof state === "function" ? state(prevState) : state;

      if (newState != null && window.openai) {
        window.openai.setWidgetState(newState);
      }

      return newState;
    });
  }, []);

  return [widgetState, setWidgetState] as const;
}

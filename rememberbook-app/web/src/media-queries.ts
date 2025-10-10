import { useDisplayMode, useMaxHeight } from "./use-openai-global";

/**
 * Hook that determines if the component should use media query specific styles
 */
export function useMediaQueries() {
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();

  const isFullscreen = displayMode === "fullscreen";
  const isPip = displayMode === "pip";
  const isInline = displayMode === "inline";

  const isCompact = maxHeight < 600;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const isTablet =
    typeof window !== "undefined" &&
    window.innerWidth >= 768 &&
    window.innerWidth < 1024;
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return {
    displayMode,
    maxHeight,
    isFullscreen,
    isPip,
    isInline,
    isCompact,
    isMobile,
    isTablet,
    isDesktop,
  };
}

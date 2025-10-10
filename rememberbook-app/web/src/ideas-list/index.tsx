import React, { useState, Suspense } from "react";
import "../index.css";
import { createRoot } from "react-dom/client";
import { IdeasListSkeleton } from "../components/skeletons";
import {
  useToolOutput,
  useTheme,
  useDisplayMode,
  useMaxHeight,
} from "../use-openai-global";
import { useWidgetState } from "../use-widget-state";
import {
  getUrgencyInfo,
  formatDate,
  formatRelativeTime,
  sortIdeas,
  truncateText,
} from "../utils";
import type { IdeasToolOutput, IdeaWidgetState, IdeaData } from "../types";
import {
  Lightbulb,
  Calendar,
  Clock,
  ChevronRight,
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  Heart,
  MoreHorizontal,
} from "lucide-react";

interface IdeaCardProps {
  idea: IdeaData;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: (id: string) => void;
}

function IdeaCard({
  idea,
  isFavorite,
  onToggleFavorite,
  onClick,
}: IdeaCardProps) {
  const urgencyInfo = getUrgencyInfo(idea.urgency);
  const theme = useTheme();
  const isDark = theme === "dark";

  const handleCardClick = () => {
    onClick(idea.id);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(idea.id);
  };

  return (
    <div
      className={`
        px-3 -mx-2 rounded-2xl cursor-pointer transition-colors
        ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}
      `}
      onClick={handleCardClick}
    >
      <div className="flex w-full items-center gap-3 py-3 border-b border-black/5 last:border-b-0">
        <div className="flex-shrink-0">
          <div
            className={`
            w-10 h-10 rounded-lg flex items-center justify-center
            ${urgencyInfo.color} ${urgencyInfo.textColor}
          `}
          >
            <Lightbulb className="w-5 h-5" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className={`
                font-medium text-sm sm:text-base truncate
                ${isDark ? "text-white" : "text-black"}
              `}
              >
                {idea.title}
              </h3>
              <p
                className={`
                text-xs sm:text-sm mt-1 truncate-2-lines
                ${isDark ? "text-white/70" : "text-black/70"}
              `}
              >
                {truncateText(idea.description, 100)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleFavoriteClick}
                className={`
                  p-1 rounded-full transition-colors
                  ${
                    isFavorite
                      ? "text-red-500 hover:text-red-600"
                      : isDark
                      ? "text-white/40 hover:text-white/60"
                      : "text-black/40 hover:text-black/60"
                  }
                `}
              >
                <Heart
                  className="w-4 h-4"
                  fill={isFavorite ? "currentColor" : "none"}
                />
              </button>
              <ChevronRight
                className={`
                w-4 h-4 
                ${isDark ? "text-white/40" : "text-black/40"}
              `}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full ${urgencyInfo.color}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${urgencyInfo.dot}`}
                />
                <span className={urgencyInfo.textColor}>
                  {urgencyInfo.label}
                </span>
              </span>
            </div>

            <div
              className={`
              flex items-center gap-1 text-xs
              ${isDark ? "text-white/50" : "text-black/50"}
            `}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatDate(idea.created_date)}</span>
            </div>

            {idea.updated_date !== idea.created_date && (
              <div
                className={`
                flex items-center gap-1 text-xs
                ${isDark ? "text-white/50" : "text-black/50"}
              `}
              >
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(idea.updated_date)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IdeasListApp() {
  const toolOutput = useToolOutput() as IdeasToolOutput | null;
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isDark = theme === "dark";
  const isFullscreen = displayMode === "fullscreen";

  const [widgetState, setWidgetState] = useWidgetState<IdeaWidgetState>({
    favorites: [],
    sortBy: "updated_date",
    sortOrder: "desc",
    viewMode: "list",
  });

  const [showFilters, setShowFilters] = useState(false);

  const ideas = toolOutput?.ideas || [];
  const totalCount = toolOutput?.total_count || ideas.length;
  const favorites = widgetState?.favorites || [];

  // Sort ideas
  const sortedIdeas = sortIdeas(
    ideas,
    widgetState?.sortBy || "updated_date",
    widgetState?.sortOrder || "desc"
  );

  const handleToggleFavorite = (ideaId: string) => {
    const newFavorites = favorites.includes(ideaId)
      ? favorites.filter((id) => id !== ideaId)
      : [...favorites, ideaId];

    setWidgetState((prev) => ({ ...prev, favorites: newFavorites }));
  };

  const handleIdeaClick = (ideaId: string) => {
    setWidgetState((prev) => ({
      ...prev,
      selectedIdea: ideaId,
      viewMode: "detail",
    }));

    // Call the view_idea tool or send follow-up message
    if (window.openai) {
      window.openai.sendFollowUpMessage({
        prompt: `Show me the details for idea "${
          ideas.find((i) => i.id === ideaId)?.title
        }"`,
      });
    }
  };

  const handleSort = (sortBy: string) => {
    const newSortOrder =
      widgetState?.sortBy === sortBy && widgetState?.sortOrder === "desc"
        ? "asc"
        : "desc";

    setWidgetState((prev) => ({
      ...prev,
      sortBy: sortBy as any,
      sortOrder: newSortOrder,
    }));
  };

  const handleAddIdea = () => {
    if (window.openai) {
      window.openai.sendFollowUpMessage({
        prompt: "I want to add a new idea",
      });
    }
  };

  const handleRequestFullscreen = () => {
    if (window.openai) {
      window.openai.requestDisplayMode({ mode: "fullscreen" });
    }
  };

  return (
    <div
      className={`
      antialiased w-full text-black px-4 pb-2 overflow-hidden
      ${isDark ? "bg-gray-900 text-white" : "bg-white"}
    `}
    >
      <div className="max-w-full">
        {/* Header */}
        <div className="flex flex-row items-center gap-4 sm:gap-4 border-b border-black/5 py-4">
          <div
            className={`
            sm:w-18 w-16 aspect-square rounded-xl flex items-center justify-center
            ${isDark ? "bg-blue-600" : "bg-blue-500"}
          `}
          >
            <Lightbulb className="w-8 h-8 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={`
              text-base sm:text-xl font-medium
              ${isDark ? "text-white" : "text-black"}
            `}
            >
              My Ideas
            </div>
            <div
              className={`
              text-sm
              ${isDark ? "text-white/60" : "text-black/60"}
            `}
            >
              {totalCount} idea{totalCount !== 1 ? "s" : ""} captured
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFullscreen && (
              <button
                onClick={handleRequestFullscreen}
                className={`
                  p-2 rounded-full transition-colors
                  ${isDark ? "hover:bg-white/10" : "hover:bg-black/5"}
                `}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleAddIdea}
              className="cursor-pointer inline-flex items-center rounded-full bg-blue-500 text-white px-4 py-1.5 sm:text-md text-sm font-medium hover:bg-blue-600 active:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Idea
            </button>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center justify-between py-3 border-b border-black/5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors
                ${
                  showFilters
                    ? "bg-blue-100 text-blue-700"
                    : isDark
                    ? "hover:bg-white/10 text-white/70"
                    : "hover:bg-black/5 text-black/70"
                }
              `}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSort("urgency")}
              className={`
                flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors
                ${
                  widgetState?.sortBy === "urgency"
                    ? "bg-blue-100 text-blue-700"
                    : isDark
                    ? "hover:bg-white/10 text-white/70"
                    : "hover:bg-black/5 text-black/70"
                }
              `}
            >
              Urgency
              {widgetState?.sortBy === "urgency" &&
                (widgetState.sortOrder === "desc" ? (
                  <SortDesc className="w-4 h-4" />
                ) : (
                  <SortAsc className="w-4 h-4" />
                ))}
            </button>

            <button
              onClick={() => handleSort("updated_date")}
              className={`
                flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors
                ${
                  widgetState?.sortBy === "updated_date"
                    ? "bg-blue-100 text-blue-700"
                    : isDark
                    ? "hover:bg-white/10 text-white/70"
                    : "hover:bg-black/5 text-black/70"
                }
              `}
            >
              Updated
              {widgetState?.sortBy === "updated_date" &&
                (widgetState.sortOrder === "desc" ? (
                  <SortDesc className="w-4 h-4" />
                ) : (
                  <SortAsc className="w-4 h-4" />
                ))}
            </button>
          </div>
        </div>

        {/* Ideas List */}
        <div
          className="min-w-full text-sm flex flex-col"
          style={{
            maxHeight: isFullscreen
              ? "none"
              : isFinite(maxHeight)
              ? Math.max(300, maxHeight - 200)
              : "70vh",
          }}
        >
          {sortedIdeas.length > 0 ? (
            sortedIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                isFavorite={favorites.includes(idea.id)}
                onToggleFavorite={handleToggleFavorite}
                onClick={handleIdeaClick}
              />
            ))
          ) : (
            <div
              className={`
              py-12 text-center
              ${isDark ? "text-white/60" : "text-black/60"}
            `}
            >
              <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No ideas yet</p>
              <p className="text-sm">Start capturing your brilliant ideas!</p>
              <button
                onClick={handleAddIdea}
                className="mt-4 inline-flex items-center rounded-full bg-blue-500 text-white px-6 py-2 text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first idea
              </button>
            </div>
          )}
        </div>

        {/* Mobile Add Button */}
        <div className="sm:hidden px-0 pt-2 pb-2">
          <button
            onClick={handleAddIdea}
            className="w-full cursor-pointer inline-flex items-center justify-center rounded-full bg-blue-500 text-white px-4 py-3 text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Idea
          </button>
        </div>
      </div>
    </div>
  );
}

// Mount the component with Suspense
const container = document.getElementById("ideas-list-root");
if (container) {
  const root = createRoot(container);
  root.render(
    <Suspense fallback={<IdeasListSkeleton />}>
      <IdeasListApp />
    </Suspense>
  );
}

import { useState, Suspense } from "react";
// Ensure Tailwind/global styles load when this entry is served under a sub-path
// (the dev HTML injection was linking to ./src/index.css which resolves relative to /idea-detail/)
// Importing here guarantees Vite processes and injects the CSS.
import "../index.css";
import { createRoot } from "react-dom/client";
import { IdeaDetailSkeleton } from "../components/skeletons";
import {
  useToolOutput,
  useDisplayMode,
  useMaxHeight,
} from "../use-openai-global";
import { useWidgetState } from "../use-widget-state";
import { getUrgencyInfo, formatDate, formatRelativeTime } from "../utils";
import type { IdeaData, IdeaWidgetState } from "../types";
import {
  Lightbulb,
  ArrowLeft,
  Edit3,
  Plus,
  Heart,
  Archive,
  Share,
  MoreVertical,
  MessageCircle,
  Trash2,
} from "lucide-react";

interface IdeaDetailData {
  idea: IdeaData;
}

interface NoteItemProps {
  note: {
    text: string;
    timestamp: string;
  };
  onEdit?: (note: { text: string; timestamp: string }) => void;
  onDelete?: (timestamp: string) => void;
}

function NoteItem({ note, onEdit, onDelete }: NoteItemProps) {
  return (
    <div className="group py-3 flex items-start gap-3 border-b border-gray-100 last:border-0">
      <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-gray-900 text-sm leading-relaxed mb-1">
          {note.text}
        </p>
        <span className="text-xs text-gray-500">
          {formatRelativeTime(note.timestamp)}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-gray-500" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(note.timestamp)}
            className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}

function IdeaDetailApp() {
  const toolOutput = useToolOutput() as IdeaDetailData | null; 
  const idea = toolOutput?.idea;
  const displayMode = useDisplayMode();
  const maxHeight = useMaxHeight();
  const isFullscreen = displayMode === "fullscreen";
  const finiteMaxHeight = Number.isFinite(maxHeight)
    ? (maxHeight as number)
    : 800; // guard for fallback Infinity / undefined

  const [widgetState, setWidgetState] = useWidgetState<IdeaWidgetState>({
    favorites: [],
    viewMode: "detail",
  });
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const favorites = widgetState?.favorites || [];

  if (!idea) {
    return (
      <div className="w-full mx-auto bg-white p-8">
        <div className="text-center">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No idea selected</p>
        </div>
      </div>
    );
  }

  const urgencyInfo = getUrgencyInfo(idea.urgency);
  const isFavorite = favorites.includes(idea.id);
  const pendingNotes: any[] =
    (widgetState as any)?.pendingNotes?.[idea.id] || [];
  const combinedNotes = [
    ...idea.notes,
    ...pendingNotes.filter(
      (pn) => !idea.notes.some((n) => n.text === pn.text)
    ),
  ];
  const sortedNotes = [...combinedNotes].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleToggleFavorite = () => {
    const newFavorites = isFavorite
      ? favorites.filter((id: string) => id !== idea.id)
      : [...favorites, idea.id];

    setWidgetState((prev: any) => ({ ...prev, favorites: newFavorites }));
  };

  const handleBackToList = () => {
    setWidgetState((prev: any) => ({
      ...prev,
      viewMode: "list",
      selectedIdea: undefined,
    }));

    if (window.openai) {
      // Support both documented sendFollowupMessage (lowercase u) and legacy/camel variants
      const sendFollowup =
        (window.openai as any).sendFollowupMessage ||
        (window.openai as any).sendFollowUpMessage;
      sendFollowup?.({ prompt: "Show me my ideas list" });
    }
  };

  const handleEditIdea = () => {
    setShowMenu(false);
    if (window.openai) {
      const sendFollowup =
        (window.openai as any).sendFollowupMessage ||
        (window.openai as any).sendFollowUpMessage;
      sendFollowup?.({ prompt: `Edit the idea "${idea.title}"` });
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !window.openai || isAddingNote) return;

    const noteText = newNote.trim();
    setIsAddingNote(true);

    // Optimistic UI update: stash pending note in widgetState so model + user see it immediately.
    // We keep a lightweight structure to avoid bloating widgetState.
    setWidgetState((prev: any) => {
      const pendingNotes = prev?.pendingNotes || {};
      const ideaPending = pendingNotes[idea.id] || [];
      const newPending = [
        ...ideaPending,
        { text: noteText, timestamp: new Date().toISOString(), pending: true },
      ];
      return { ...prev, pendingNotes: { ...pendingNotes, [idea.id]: newPending } };
    });

    window.openai
      .callTool("add_note", {
        idea_id: idea.id,
        note: noteText,
      })
      .then(() => {
        // Ask host/model to refresh the idea detail so toolOutput contains authoritative updated idea
        const sendFollowup =
          (window.openai as any).sendFollowupMessage ||
          (window.openai as any).sendFollowUpMessage;
        sendFollowup?.({
          prompt: `Refresh the details for idea id ${idea.id}`,
        });
      })
      .catch(() => {
        // On error, remove the optimistic note
        setWidgetState((prev: any) => {
          const pendingNotes = prev?.pendingNotes || {};
            const ideaPending = (pendingNotes[idea.id] || []).filter(
              (n: any) => n.text !== noteText
            );
          return { ...prev, pendingNotes: { ...pendingNotes, [idea.id]: ideaPending } };
        });
      })
      .finally(() => {
        setIsAddingNote(false);
        setNewNote("");
        setShowAddNote(false);
      });
  };

  const handleDeleteIdea = () => {
    setShowMenu(false);
    if (
      window.openai &&
      window.confirm("Are you sure you want to delete this idea?")
    ) {
      window.openai.callTool("delete_idea", {
        idea_id: idea.id,
      });
    }
  };

  const handleArchiveIdea = () => {
    setShowMenu(false);
    if (window.openai) {
      window.openai.callTool("archive_idea", {
        idea_id: idea.id,
        archived: !idea.archived,
      });
    }
  };

  const handleShare = () => {
    setShowMenu(false);
    if (navigator.share) {
      navigator.share({
        title: idea.title,
        text: idea.description,
      });
    } else if (window.openai) {
      const sendFollowup =
        (window.openai as any).sendFollowupMessage ||
        (window.openai as any).sendFollowUpMessage;
      sendFollowup?.({
        prompt: `Help me share this idea: "${idea.title}"`,
      });
    }
  };

  return (
    <div className="w-full mx-auto bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handleBackToList}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">
              {idea.title}
            </h1>
          </div>
          <button
            onClick={handleToggleFavorite}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorite ? "text-red-500 fill-red-500" : "text-gray-400"
              }`}
            />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-700" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={handleEditIdea}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleArchiveIdea}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <Archive className="w-4 h-4" />
                  {idea.archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  onClick={handleShare}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <Share className="w-4 h-4" />
                  Share
                </button>
                <div className="h-px bg-gray-100 my-1" />
                <button
                  onClick={handleDeleteIdea}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          {idea.description}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${urgencyInfo.color}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${urgencyInfo.dot}`} />
            <span className={urgencyInfo.textColor}>{urgencyInfo.label}</span>
          </span>
          <span className="text-gray-500 text-xs">
            Created {formatDate(idea.created_date)}
          </span>
          {idea.updated_date !== idea.created_date && (
            <span className="text-gray-500 text-xs">
              Updated {formatRelativeTime(idea.updated_date)}
            </span>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div
        className="px-6 py-5"
        style={{
          maxHeight: isFullscreen
            ? "none"
            : Math.max(400, finiteMaxHeight - 200),
          overflowY: "auto",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Notes ({sortedNotes.length})
          </h2>
          <button
            onClick={() => setShowAddNote(!showAddNote)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        </div>

        {/* Add Note Form */}
        {showAddNote && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="w-full p-3 bg-white border border-gray-200 rounded-lg resize-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Note
              </button>
              <button
                onClick={() => {
                  setShowAddNote(false);
                  setNewNote("");
                }}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-0">
          {sortedNotes.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">No notes yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Add notes to capture thoughts about this idea
              </p>
            </div>
          ) : (
            sortedNotes.map((note, index) => (
              <NoteItem key={`${note.timestamp}-${index}`} note={note} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Mount the component with Suspense
const container = document.getElementById("idea-detail-root");
if (container) {
  const root = createRoot(container);
  root.render(
    <Suspense fallback={<IdeaDetailSkeleton />}>
      <IdeaDetailApp />
    </Suspense>
  );
}

import type { IdeaData } from "./types";

/**
 * Get the urgency level display information
 */
export interface UrgencyInfo {
  label: string;
  color: string; // background pill
  textColor: string; // text color inside pill
  dot: string; // tiny dot color class
  level: 1 | 2 | 3 | 4 | 5; // normalized level
}

/**
 * Shared urgency lookup used by multiple components.
 * Levels: 1=Not Important, 2=Low, 3=Medium, 4=High, 5=Immediate
 */
export function getUrgencyInfo(urgency: number): UrgencyInfo {
  const normalized = ((): 1 | 2 | 3 | 4 | 5 => {
    if (urgency <= 1) return 1;
    if (urgency === 2) return 2;
    if (urgency === 3) return 3;
    if (urgency === 4) return 4;
    return 5;
  })();

  const map: Record<1 | 2 | 3 | 4 | 5, UrgencyInfo> = {
    1: {
      level: 1,
      label: "Not Important",
      color: "bg-urgency-1",
      textColor: "text-green-800",
      dot: "bg-green-800",
    },
    2: {
      level: 2,
      label: "Low",
      color: "bg-urgency-2",
      textColor: "text-lime-800",
      dot: "bg-lime-800",
    },
    3: {
      level: 3,
      label: "Medium",
      color: "bg-urgency-3",
      textColor: "text-yellow-800",
      dot: "bg-yellow-800",
    },
    4: {
      level: 4,
      label: "High",
      color: "bg-urgency-4",
      textColor: "text-orange-800",
      dot: "bg-orange-800",
    },
    5: {
      level: 5,
      label: "Immediate",
      color: "bg-urgency-5",
      textColor: "text-red-800",
      dot: "bg-red-800",
    },
  };

  return map[normalized];
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch {
    return dateString;
  }
}

/**
 * Format a relative time string
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return formatDate(dateString);
    }
  } catch {
    return dateString;
  }
}

/**
 * Sort ideas by different criteria
 */
export function sortIdeas(
  ideas: IdeaData[],
  sortBy: string,
  sortOrder: "asc" | "desc" = "desc"
): IdeaData[] {
  const sorted = [...ideas].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "urgency":
        comparison = a.urgency - b.urgency;
        break;
      case "updated_date":
        comparison =
          new Date(a.updated_date).getTime() -
          new Date(b.updated_date).getTime();
        break;
      case "created_date":
      default:
        comparison =
          new Date(a.created_date).getTime() -
          new Date(b.created_date).getTime();
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "…";
}

/**
 * Generate a unique ID for a new idea
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

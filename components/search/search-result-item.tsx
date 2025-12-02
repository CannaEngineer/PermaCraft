"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Map,
  FileText,
  Sparkles,
  Sprout,
  MapPin,
  User,
  MessageSquare,
} from "lucide-react";

// Type definitions for each search result entity
interface FarmData {
  id: string;
  name: string;
  owner_name: string;
  owner_image?: string;
  image_url?: string | null;
  acres?: number;
}

interface PostData {
  id: string;
  content?: string;
  content_preview?: string;
  author_name: string;
  author_image?: string | null;
  type: string;
  created_at?: number;
  ai_screenshot?: string | null;
}

interface SpeciesData {
  id: string;
  common_name: string;
  scientific_name?: string;
  layer?: string;
}

interface ZoneData {
  id: string;
  name: string;
  farm_name: string;
  zone_type: string;
}

interface UserData {
  id: string;
  name: string;
  image?: string | null;
  farm_count?: number;
}

interface AIConversationData {
  id: string;
  title: string;
  farm_name: string;
  created_at?: number;
}

type SearchResultData =
  | FarmData
  | PostData
  | SpeciesData
  | ZoneData
  | UserData
  | AIConversationData;

interface SearchResultItemProps {
  type: "farm" | "post" | "species" | "zone" | "user" | "ai_conversation";
  data: SearchResultData;
  query: string;
  isHighlighted: boolean;
  onClick: () => void;
}

/**
 * Helper function to highlight matched text in search results
 * Wraps matched portions in <strong> tags for visual emphasis
 * Escapes special regex characters to prevent regex injection
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;

  // Escape special regex characters to prevent regex injection
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <strong key={i}>{part}</strong>
    ) : (
      part
    )
  );
}

/**
 * Helper function to format timestamps as relative time
 * Shows "just now", "5m ago", "2h ago", "3d ago", or full date
 */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * SearchResultItem - Renders individual search results with type-specific formatting
 *
 * Features:
 * - Type-specific icons and layouts
 * - Query text highlighting
 * - Keyboard navigation support (highlighted state)
 * - Optional thumbnails for farms and users
 * - Responsive touch-friendly design (min-height 44px)
 */
export function SearchResultItem({
  type,
  data,
  query,
  isHighlighted,
  onClick,
}: SearchResultItemProps) {
  // Render type-specific icon
  const renderIcon = () => {
    const iconClass = "h-5 w-5";

    switch (type) {
      case "farm":
        return <Map className={iconClass} />;
      case "post":
        return (data as PostData).type === "ai_insight" ? (
          <Sparkles className={iconClass} />
        ) : (
          <FileText className={iconClass} />
        );
      case "species":
        return <Sprout className={iconClass} />;
      case "zone":
        return <MapPin className={iconClass} />;
      case "user":
        return null; // User type uses Avatar component instead
      case "ai_conversation":
        return <MessageSquare className={iconClass} />;
      default:
        return null;
    }
  };

  // Render type-specific content with title and subtitle
  const renderContent = () => {
    switch (type) {
      case "farm": {
        const farmData = data as FarmData;
        return (
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {farmData.image_url && (
              <img
                src={farmData.image_url}
                alt={farmData.name}
                loading="lazy"
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">
                {highlightMatch(farmData.name, query)}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                by {farmData.owner_name}
                {farmData.acres && ` • ${farmData.acres.toFixed(1)} acres`}
              </div>
            </div>
          </div>
        );
      }

      case "post": {
        const postData = data as PostData;
        return (
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground line-clamp-2">
                {highlightMatch(
                  postData.content_preview || postData.content || "",
                  query
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                by {postData.author_name} •{" "}
                {postData.created_at ? formatRelativeTime(postData.created_at) : ""}
              </div>
            </div>
            {postData.ai_screenshot && (
              <img
                src={postData.ai_screenshot}
                alt="Post preview"
                loading="lazy"
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            )}
          </div>
        );
      }

      case "species": {
        const speciesData = data as SpeciesData;
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground">
              {highlightMatch(speciesData.common_name, query)}
            </div>
            <div className="text-sm text-muted-foreground italic truncate">
              {speciesData.scientific_name}
            </div>
            {speciesData.layer && (
              <div className="text-xs text-muted-foreground mt-1 capitalize">
                {speciesData.layer}
              </div>
            )}
          </div>
        );
      }

      case "zone": {
        const zoneData = data as ZoneData;
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {highlightMatch(zoneData.name || zoneData.zone_type, query)}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {zoneData.farm_name} • {zoneData.zone_type}
            </div>
          </div>
        );
      }

      case "user": {
        const userData = data as UserData;
        return (
          <>
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={userData.image || undefined} />
              <AvatarFallback>
                {userData.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">
                {highlightMatch(userData.name, query)}
              </div>
              <div className="text-sm text-muted-foreground">
                {userData.farm_count} {userData.farm_count === 1 ? "farm" : "farms"}
              </div>
            </div>
          </>
        );
      }

      case "ai_conversation": {
        const conversationData = data as AIConversationData;
        return (
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {highlightMatch(conversationData.title, query)}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {conversationData.farm_name}
              {conversationData.created_at && ` • ${formatRelativeTime(conversationData.created_at)}`}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      role="option"
      aria-selected={isHighlighted}
      className={cn(
        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors min-h-[44px] w-full text-left",
        "hover:bg-accent/50",
        isHighlighted && "bg-accent"
      )}
    >
      {type !== "user" && (
        <span className="text-muted-foreground flex-shrink-0">
          {renderIcon()}
        </span>
      )}
      {renderContent()}
    </button>
  );
}

// Export types for use in parent components
export type {
  FarmData,
  PostData,
  SpeciesData,
  ZoneData,
  UserData,
  AIConversationData,
  SearchResultData,
};

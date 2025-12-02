"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { SearchResultsDropdown } from "./search-results-dropdown";
import { SearchShortcutHint } from "./search-shortcut-hint";
import { cn } from "@/lib/utils";
import type { SearchResultData } from "./search-result-item";

/**
 * UniversalSearch - Main search component with keyboard shortcuts and navigation
 *
 * Features:
 * - Context-aware search (my-farms, community, global)
 * - Real-time results with debouncing (400ms)
 * - Keyboard shortcut: Cmd/Ctrl + K to focus
 * - Arrow navigation: Up/Down to navigate, Enter to select, Escape to close
 * - Loading spinner during search
 * - Clear button (X) when typing
 * - Click outside to close dropdown
 *
 * Props:
 * - context: "my-farms" | "community" | "global" - determines what to search
 * - placeholder: Custom placeholder text (optional)
 * - className: Additional CSS classes (optional)
 */
interface UniversalSearchProps {
  context: "my-farms" | "community" | "global";
  placeholder?: string;
  className?: string;
}

export function UniversalSearch({
  context,
  placeholder,
  className,
}: UniversalSearchProps) {
  const router = useRouter();
  const {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    highlightedIndex,
    setHighlightedIndex,
  } = useSearch({ context });

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Flatten results for keyboard navigation
  const allResults: Array<{
    type: "farm" | "post" | "species" | "zone" | "user" | "ai_conversation";
    data: SearchResultData;
  }> = [
    ...results.farms.slice(0, 3).map((f) => ({ type: "farm" as const, data: f })),
    ...results.posts.slice(0, 3).map((p) => ({ type: "post" as const, data: p })),
    ...results.species.slice(0, 3).map((s) => ({ type: "species" as const, data: s })),
    ...results.zones.slice(0, 3).map((z) => ({ type: "zone" as const, data: z })),
    ...results.users.slice(0, 3).map((u) => ({ type: "user" as const, data: u })),
    ...results.ai_conversations.slice(0, 3).map((c) => ({
      type: "ai_conversation" as const,
      data: c,
    })),
  ];

  // Get default placeholder based on context
  const defaultPlaceholder =
    placeholder ||
    {
      "my-farms": "Search your farms, zones, and conversations...",
      community: "Search public farms and posts...",
      global: "Search everything...",
    }[context];

  /**
   * Navigate to result based on type
   */
  function getResultUrl(
    type: "farm" | "post" | "species" | "zone" | "user" | "ai_conversation",
    data: SearchResultData
  ): string {
    switch (type) {
      case "farm":
        return `/farm/${data.id}`;
      case "post":
        // Posts don't have dedicated pages - navigate to the farm where the post was created
        return `/farm/${(data as any).farm_id}`;
      case "species":
        return `/species/${data.id}`;
      case "zone":
        // Navigate to farm with zone hash - farm map should zoom to this zone
        return `/farm/${(data as any).farm_id}#zone-${data.id}`;
      case "user":
        return `/user/${data.id}`;
      case "ai_conversation":
        // Navigate to farm with chat panel open and specific conversation loaded
        return `/farm/${(data as any).farm_id}?chat=open&conversation=${data.id}`;
      default:
        return "/";
    }
  }

  /**
   * Handle result click - navigate and close dropdown
   */
  const handleResultClick = (
    result: SearchResultData,
    type: "farm" | "post" | "species" | "zone" | "user" | "ai_conversation"
  ) => {
    const url = getResultUrl(type, result);
    router.push(url);
    setIsOpen(false);
    setQuery("");
  };

  /**
   * Handle keyboard navigation
   * - Arrow Down: Move to next result
   * - Arrow Up: Move to previous result
   * - Enter: Navigate to highlighted result
   * - Escape: Close dropdown and blur input
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || allResults.length === 0) {
      // If escape pressed while dropdown closed, just blur
      if (e.key === "Escape") {
        e.preventDefault();
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allResults.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allResults.length) {
          const highlighted = allResults[highlightedIndex];
          handleResultClick(highlighted.data, highlighted.type);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  /**
   * Click outside to close dropdown
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  /**
   * Cmd/Ctrl + K to focus search input
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K to focus search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {/* Search Input Container */}
      <div className="relative">
        {/* Search Icon (or Loading Spinner) */}
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
            isLoading && "hidden"
          )}
        />
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          placeholder={defaultPlaceholder}
          aria-label={placeholder || defaultPlaceholder}
          className={cn(
            "h-11 w-full px-4 py-2 pl-10 pr-10",
            "border border-border rounded-lg",
            "bg-card text-foreground",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            "transition-colors"
          )}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-autocomplete="list"
        />

        {/* Right Side Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery("");
                setIsOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!query && !isLoading && <SearchShortcutHint />}
        </div>
      </div>

      {/* Dropdown */}
      <SearchResultsDropdown
        results={results}
        query={query}
        isOpen={isOpen}
        highlightedIndex={highlightedIndex}
        onResultClick={handleResultClick}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

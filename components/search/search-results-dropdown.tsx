"use client";

import { SearchResultItem } from "./search-result-item";
import { SearchResult } from "@/hooks/use-search";
import { cn } from "@/lib/utils";

interface SearchResultsDropdownProps {
  results: SearchResult;
  query: string;
  isOpen: boolean;
  highlightedIndex: number;
  onResultClick: (result: any, type: string) => void;
  onClose: () => void;
}

/**
 * EmptyState - Displayed when no results are found or when query is too short
 */
function EmptyState({ query }: { query: string }) {
  if (!query) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Start typing to search...</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 text-center">
      <p className="text-foreground mb-2">No matches for &quot;{query}&quot;</p>
      <div className="text-sm text-muted-foreground">
        <p>Suggestions:</p>
        <ul className="mt-2 space-y-1">
          <li>• Try a different search term</li>
          <li>• Browse all farms</li>
          <li>• Explore community</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * SearchSection - Renders a grouped section of search results
 * Shows section header and up to 3 results
 */
interface SearchSectionProps {
  title: string;
  results: any[];
  type: string;
  query: string;
  flattenedResults: Array<{ type: string; data: any }>;
  highlightedIndex: number;
  onResultClick: (result: any, type: string) => void;
}

function SearchSection({
  title,
  results,
  type,
  query,
  flattenedResults,
  highlightedIndex,
  onResultClick,
}: SearchSectionProps) {
  if (results.length === 0) return null;

  return (
    <div className="py-2">
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
        {title}
      </div>
      {results.slice(0, 3).map((result) => {
        const flatIndex = flattenedResults.findIndex(
          (fr) => fr.data === result && fr.type === type
        );
        return (
          <SearchResultItem
            key={result.id}
            type={type as any}
            data={result}
            query={query}
            isHighlighted={flatIndex === highlightedIndex}
            onClick={() => onResultClick(result, type)}
          />
        );
      })}
    </div>
  );
}

/**
 * SearchResultsDropdown - Dropdown overlay showing grouped search results
 *
 * Features:
 * - Appears below search bar as absolute positioned overlay
 * - Groups results by type (Farms, Posts, Species, Zones, Users, AI Conversations)
 * - Max 3 results per section
 * - Max height 500px with scroll
 * - Empty states for no query and no results
 * - Keyboard navigation support via highlightedIndex
 * - Flattens results for keyboard navigation
 */
export function SearchResultsDropdown({
  results,
  query,
  isOpen,
  highlightedIndex,
  onResultClick,
  onClose,
}: SearchResultsDropdownProps) {
  if (!isOpen) return null;

  // Flatten results for keyboard navigation
  // This creates a single array that maps highlightedIndex to specific items
  const flattenedResults: Array<{ type: string; data: any }> = [
    ...results.farms.map((f) => ({ type: "farm", data: f })),
    ...results.posts.map((p) => ({ type: "post", data: p })),
    ...results.species.map((s) => ({ type: "species", data: s })),
    ...results.zones.map((z) => ({ type: "zone", data: z })),
    ...results.users.map((u) => ({ type: "user", data: u })),
    ...results.ai_conversations.map((c) => ({
      type: "ai_conversation",
      data: c,
    })),
  ];

  const hasResults = flattenedResults.length > 0;

  return (
    <div
      className={cn(
        "absolute top-full left-0 right-0 mt-2 z-50",
        "bg-card border border-border rounded-lg shadow-lg",
        "max-h-[500px] overflow-y-auto"
      )}
      role="listbox"
    >
      {!hasResults ? (
        <EmptyState query={query} />
      ) : (
        <>
          <SearchSection
            title="🗺️ Farms"
            results={results.farms}
            type="farm"
            query={query}
            flattenedResults={flattenedResults}
            highlightedIndex={highlightedIndex}
            onResultClick={onResultClick}
          />

          <SearchSection
            title="📝 Posts"
            results={results.posts}
            type="post"
            query={query}
            flattenedResults={flattenedResults}
            highlightedIndex={highlightedIndex}
            onResultClick={onResultClick}
          />

          <SearchSection
            title="🌱 Species"
            results={results.species}
            type="species"
            query={query}
            flattenedResults={flattenedResults}
            highlightedIndex={highlightedIndex}
            onResultClick={onResultClick}
          />

          <SearchSection
            title="📍 Zones"
            results={results.zones}
            type="zone"
            query={query}
            flattenedResults={flattenedResults}
            highlightedIndex={highlightedIndex}
            onResultClick={onResultClick}
          />

          <SearchSection
            title="👤 Users"
            results={results.users}
            type="user"
            query={query}
            flattenedResults={flattenedResults}
            highlightedIndex={highlightedIndex}
            onResultClick={onResultClick}
          />

          <SearchSection
            title="💬 AI Conversations"
            results={results.ai_conversations}
            type="ai_conversation"
            query={query}
            flattenedResults={flattenedResults}
            highlightedIndex={highlightedIndex}
            onResultClick={onResultClick}
          />
        </>
      )}
    </div>
  );
}

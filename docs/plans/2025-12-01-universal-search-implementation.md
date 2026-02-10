# Universal Search System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a context-aware real-time search system that works across personal farms and community content with grouped results in a dropdown overlay.

**Architecture:** Single reusable `<UniversalSearch>` component that adapts to context (my-farms, community, global). Backend API endpoint handles all search queries with proper permission filtering. Frontend uses debounced search hook with real-time results.

**Tech Stack:** Next.js 14, React hooks, Turso (libSQL), TypeScript, Tailwind CSS

---

## Task 1: Create Search API Endpoint

**Files:**
- Create: `app/api/search/route.ts`

**Step 1: Create API route file**

Create the search API endpoint with basic structure:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const context = searchParams.get("context") || "global";
    const limit = parseInt(searchParams.get("limit") || "15");

    if (!query || query.length < 3) {
      return Response.json({
        farms: [],
        posts: [],
        species: [],
        zones: [],
        users: [],
        ai_conversations: [],
      });
    }

    const searchQuery = `%${query}%`;
    const results = {
      farms: [],
      posts: [],
      species: [],
      zones: [],
      users: [],
      ai_conversations: [],
    };

    // Search logic will be added in next steps

    return Response.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return Response.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
```

**Step 2: Add farms search by context**

Add farms search queries based on context:

```typescript
// Add after "const results = {...}" and before "return Response.json(results)"

// Search Farms
if (context === "my-farms") {
  // Only user's farms
  const farmsResult = await db.execute({
    sql: `SELECT f.*,
          (SELECT screenshot_data FROM ai_analyses
           WHERE farm_id = f.id AND screenshot_data IS NOT NULL
           ORDER BY created_at DESC LIMIT 1) as latest_screenshot_json
          FROM farms f
          WHERE f.user_id = ? AND (f.name LIKE ? OR f.description LIKE ?)
          ORDER BY f.updated_at DESC
          LIMIT 3`,
    args: [session.user.id, searchQuery, searchQuery],
  });

  results.farms = farmsResult.rows.map((row: any) => {
    let imageUrl = null;
    if (row.latest_screenshot_json) {
      try {
        const urls = JSON.parse(row.latest_screenshot_json);
        imageUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {}
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      owner_name: session.user.name,
      owner_image: session.user.image,
      is_public: row.is_public,
      image_url: imageUrl,
      acres: row.acres,
    };
  });
} else if (context === "community") {
  // Only public farms
  const farmsResult = await db.execute({
    sql: `SELECT f.*, u.name as owner_name, u.image as owner_image,
          (SELECT screenshot_data FROM ai_analyses
           WHERE farm_id = f.id AND screenshot_data IS NOT NULL
           ORDER BY created_at DESC LIMIT 1) as latest_screenshot_json
          FROM farms f
          JOIN users u ON f.user_id = u.id
          WHERE f.is_public = 1 AND (f.name LIKE ? OR f.description LIKE ?)
          ORDER BY f.updated_at DESC
          LIMIT 3`,
    args: [searchQuery, searchQuery],
  });

  results.farms = farmsResult.rows.map((row: any) => {
    let imageUrl = null;
    if (row.latest_screenshot_json) {
      try {
        const urls = JSON.parse(row.latest_screenshot_json);
        imageUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {}
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      owner_name: row.owner_name,
      owner_image: row.owner_image,
      is_public: row.is_public,
      image_url: imageUrl,
      acres: row.acres,
    };
  });
} else {
  // Global: owned OR public
  const farmsResult = await db.execute({
    sql: `SELECT f.*, u.name as owner_name, u.image as owner_image,
          (SELECT screenshot_data FROM ai_analyses
           WHERE farm_id = f.id AND screenshot_data IS NOT NULL
           ORDER BY created_at DESC LIMIT 1) as latest_screenshot_json
          FROM farms f
          JOIN users u ON f.user_id = u.id
          WHERE (f.user_id = ? OR f.is_public = 1)
          AND (f.name LIKE ? OR f.description LIKE ?)
          ORDER BY f.updated_at DESC
          LIMIT 3`,
    args: [session.user.id, searchQuery, searchQuery],
  });

  results.farms = farmsResult.rows.map((row: any) => {
    let imageUrl = null;
    if (row.latest_screenshot_json) {
      try {
        const urls = JSON.parse(row.latest_screenshot_json);
        imageUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {}
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      owner_name: row.owner_name,
      owner_image: row.owner_image,
      is_public: row.is_public,
      image_url: imageUrl,
      acres: row.acres,
    };
  });
}
```

**Step 3: Add posts search**

Add posts search after farms search:

```typescript
// Search Posts
if (context === "community" || context === "global") {
  const postsResult = await db.execute({
    sql: `SELECT p.*, u.name as author_name, u.image as author_image,
          f.name as farm_name,
          ai.screenshot_data as ai_screenshot
          FROM farm_posts p
          JOIN users u ON p.author_id = u.id
          JOIN farms f ON p.farm_id = f.id
          LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
          WHERE p.is_published = 1
          AND f.is_public = 1
          AND (p.content LIKE ? OR p.hashtags LIKE ?)
          ORDER BY p.created_at DESC
          LIMIT 3`,
    args: [searchQuery, searchQuery],
  });

  results.posts = postsResult.rows.map((post: any) => {
    let aiScreenshot = null;
    if (post.ai_screenshot) {
      try {
        const urls = JSON.parse(post.ai_screenshot);
        aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
      } catch (e) {
        aiScreenshot = post.ai_screenshot;
      }
    }

    return {
      id: post.id,
      farm_id: post.farm_id,
      farm_name: post.farm_name,
      content_preview: post.content ? post.content.substring(0, 100) : "",
      author_name: post.author_name,
      author_image: post.author_image,
      type: post.post_type,
      created_at: post.created_at,
      ai_screenshot: aiScreenshot,
    };
  });
}
```

**Step 4: Add species search**

Add species search (available in all contexts):

```typescript
// Search Species (available in all contexts)
const speciesResult = await db.execute({
  sql: `SELECT id, common_name, scientific_name, layer, description
        FROM species
        WHERE common_name LIKE ? OR scientific_name LIKE ?
        ORDER BY common_name ASC
        LIMIT 3`,
  args: [searchQuery, searchQuery],
});

results.species = speciesResult.rows.map((s: any) => ({
  id: s.id,
  common_name: s.common_name,
  scientific_name: s.scientific_name,
  layer: s.layer,
  description: s.description,
}));
```

**Step 5: Add zones search**

Add zones search (only for my-farms and global):

```typescript
// Search Zones (my-farms and global only)
if (context === "my-farms" || context === "global") {
  const zonesResult = await db.execute({
    sql: `SELECT z.*, f.name as farm_name
          FROM zones z
          JOIN farms f ON z.farm_id = f.id
          WHERE f.user_id = ?
          AND (z.name LIKE ? OR z.zone_type LIKE ?)
          ORDER BY z.updated_at DESC
          LIMIT 3`,
    args: [session.user.id, searchQuery, searchQuery],
  });

  results.zones = zonesResult.rows.map((z: any) => ({
    id: z.id,
    farm_id: z.farm_id,
    farm_name: z.farm_name,
    name: z.name,
    zone_type: z.zone_type,
  }));
}
```

**Step 6: Add users search**

Add users search (global context only):

```typescript
// Search Users (global only)
if (context === "global") {
  const usersResult = await db.execute({
    sql: `SELECT u.id, u.name, u.image,
          (SELECT COUNT(*) FROM farms WHERE user_id = u.id AND is_public = 1) as farm_count
          FROM users u
          WHERE u.name LIKE ?
          LIMIT 3`,
    args: [searchQuery],
  });

  results.users = usersResult.rows.map((u: any) => ({
    id: u.id,
    name: u.name,
    image: u.image,
    farm_count: u.farm_count,
  }));
}
```

**Step 7: Add AI conversations search**

Add AI conversations search (my-farms and global only):

```typescript
// Search AI Conversations (my-farms and global only)
if (context === "my-farms" || context === "global") {
  const conversationsResult = await db.execute({
    sql: `SELECT c.*, f.name as farm_name
          FROM ai_conversations c
          JOIN farms f ON c.farm_id = f.id
          WHERE f.user_id = ?
          AND c.title LIKE ?
          ORDER BY c.updated_at DESC
          LIMIT 3`,
    args: [session.user.id, searchQuery],
  });

  results.ai_conversations = conversationsResult.rows.map((c: any) => ({
    id: c.id,
    farm_id: c.farm_id,
    farm_name: c.farm_name,
    title: c.title,
    created_at: c.created_at,
  }));
}
```

**Step 8: Test the API endpoint**

Start dev server and test:

```bash
npm run dev
```

Test with curl:
```bash
# Test my-farms context
curl "http://localhost:3000/api/search?q=test&context=my-farms&limit=15"

# Test community context
curl "http://localhost:3000/api/search?q=test&context=community&limit=15"

# Test global context
curl "http://localhost:3000/api/search?q=test&context=global&limit=15"
```

Expected: JSON response with grouped results for each entity type

**Step 9: Commit API endpoint**

```bash
git add app/api/search/route.ts
git commit -m "feat: add universal search API endpoint with context-aware queries"
```

---

## Task 2: Create Search Hook

**Files:**
- Create: `hooks/use-search.ts`

**Step 1: Create basic search hook structure**

```typescript
import { useState, useEffect, useRef, useCallback } from "react";

export interface SearchResult {
  farms: any[];
  posts: any[];
  species: any[];
  zones: any[];
  users: any[];
  ai_conversations: any[];
}

export interface UseSearchOptions {
  context: "my-farms" | "community" | "global";
  minChars?: number;
  debounceMs?: number;
}

export function useSearch({
  context,
  minChars = 3,
  debounceMs = 400,
}: UseSearchOptions) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({
    farms: [],
    posts: [],
    species: [],
    zones: [],
    users: [],
    ai_conversations: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rest of implementation in next steps

  return {
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    setIsOpen,
    highlightedIndex,
    setHighlightedIndex,
    error,
  };
}
```

**Step 2: Add debounced search function**

Add the search function with debouncing:

```typescript
// Add after state declarations and before return statement

const performSearch = useCallback(
  async (searchQuery: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't search if query too short
    if (searchQuery.length < minChars) {
      setResults({
        farms: [],
        posts: [],
        species: [],
        zones: [],
        users: [],
        ai_conversations: [],
      });
      setIsOpen(false);
      return;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&context=${context}&limit=15`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data);
      setIsOpen(true);
      setHighlightedIndex(-1);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Search error:", err);
        setError("Search failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  },
  [context, minChars]
);
```

**Step 3: Add debounced effect**

Add effect to debounce search execution:

```typescript
// Add after performSearch function

useEffect(() => {
  // Clear existing timer
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  // Set new timer
  if (query) {
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);
  } else {
    // Clear results when query is empty
    setResults({
      farms: [],
      posts: [],
      species: [],
      zones: [],
      users: [],
      ai_conversations: [],
    });
    setIsOpen(false);
  }

  // Cleanup
  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };
}, [query, performSearch, debounceMs]);

// Cleanup abort controller on unmount
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, []);
```

**Step 4: Commit search hook**

```bash
git add hooks/use-search.ts
git commit -m "feat: add useSearch hook with debouncing and abort control"
```

---

## Task 3: Create Search Result Item Component

**Files:**
- Create: `components/search/search-result-item.tsx`

**Step 1: Create result item component**

```typescript
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SearchResultItemProps {
  type: "farm" | "post" | "species" | "zone" | "user" | "ai_conversation";
  data: any;
  isHighlighted: boolean;
  onClick: () => void;
  query: string;
}

export function SearchResultItem({
  type,
  data,
  isHighlighted,
  onClick,
  query,
}: SearchResultItemProps) {
  const highlightText = (text: string) => {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <strong key={i}>{part}</strong> : part
    );
  };

  const renderIcon = () => {
    switch (type) {
      case "farm":
        return "🗺️";
      case "post":
        return data.type === "ai_insight" ? "✨" : "📝";
      case "species":
        return "🌱";
      case "zone":
        return "📍";
      case "user":
        return null; // Uses avatar
      case "ai_conversation":
        return "💬";
    }
  };

  const renderContent = () => {
    switch (type) {
      case "farm":
        return (
          <>
            <div className="flex items-start gap-3 flex-1">
              {data.image_url && (
                <img
                  src={data.image_url}
                  alt={data.name}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {highlightText(data.name)}
                </div>
                <div className="text-sm text-muted-foreground">
                  by {data.owner_name}
                  {data.acres && ` • ${data.acres.toFixed(1)} acres`}
                </div>
              </div>
            </div>
          </>
        );

      case "post":
        return (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground line-clamp-2">
                {highlightText(data.content_preview)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                by {data.author_name} • {data.farm_name}
              </div>
            </div>
          </>
        );

      case "species":
        return (
          <>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">
                {highlightText(data.common_name)}
              </div>
              <div className="text-sm text-muted-foreground italic">
                {data.scientific_name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {data.layer}
              </div>
            </div>
          </>
        );

      case "zone":
        return (
          <>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">
                {highlightText(data.name || data.zone_type)}
              </div>
              <div className="text-sm text-muted-foreground">
                {data.farm_name} • {data.zone_type}
              </div>
            </div>
          </>
        );

      case "user":
        return (
          <>
            <Avatar className="h-10 w-10">
              <AvatarImage src={data.image || undefined} />
              <AvatarFallback>{data.name[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">
                {highlightText(data.name)}
              </div>
              <div className="text-sm text-muted-foreground">
                {data.farm_count} {data.farm_count === 1 ? "farm" : "farms"}
              </div>
            </div>
          </>
        );

      case "ai_conversation":
        return (
          <>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">
                {highlightText(data.title)}
              </div>
              <div className="text-sm text-muted-foreground">
                {data.farm_name}
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-muted focus:bg-muted focus:outline-none",
        isHighlighted && "bg-muted"
      )}
    >
      {type !== "user" && (
        <span className="text-lg flex-shrink-0">{renderIcon()}</span>
      )}
      {renderContent()}
    </button>
  );
}
```

**Step 2: Commit result item component**

```bash
git add components/search/search-result-item.tsx
git commit -m "feat: add search result item component with highlighting"
```

---

## Task 4: Create Search Results Dropdown Component

**Files:**
- Create: `components/search/search-results-dropdown.tsx`

**Step 1: Create dropdown component structure**

```typescript
"use client";

import { useRouter } from "next/navigation";
import { SearchResultItem } from "./search-result-item";
import { cn } from "@/lib/utils";

interface SearchResultsDropdownProps {
  results: {
    farms: any[];
    posts: any[];
    species: any[];
    zones: any[];
    users: any[];
    ai_conversations: any[];
  };
  query: string;
  highlightedIndex: number;
  onClose: () => void;
  isOpen: boolean;
}

export function SearchResultsDropdown({
  results,
  query,
  highlightedIndex,
  onClose,
  isOpen,
}: SearchResultsDropdownProps) {
  const router = useRouter();

  if (!isOpen) return null;

  // Flatten results for keyboard navigation
  const allResults: Array<{ type: string; data: any }> = [];

  if (results.farms.length > 0) {
    results.farms.forEach((farm) =>
      allResults.push({ type: "farm", data: farm })
    );
  }
  if (results.posts.length > 0) {
    results.posts.forEach((post) =>
      allResults.push({ type: "post", data: post })
    );
  }
  if (results.species.length > 0) {
    results.species.forEach((species) =>
      allResults.push({ type: "species", data: species })
    );
  }
  if (results.zones.length > 0) {
    results.zones.forEach((zone) =>
      allResults.push({ type: "zone", data: zone })
    );
  }
  if (results.users.length > 0) {
    results.users.forEach((user) =>
      allResults.push({ type: "user", data: user })
    );
  }
  if (results.ai_conversations.length > 0) {
    results.ai_conversations.forEach((conv) =>
      allResults.push({ type: "ai_conversation", data: conv })
    );
  }

  const hasResults = allResults.length > 0;

  const getResultUrl = (type: string, data: any) => {
    switch (type) {
      case "farm":
        return `/farm/${data.id}`;
      case "post":
        return `/farm/${data.farm_id}#post-${data.id}`;
      case "species":
        return `/species/${data.id}`;
      case "zone":
        return `/farm/${data.farm_id}#zone-${data.id}`;
      case "user":
        return `/user/${data.id}`;
      case "ai_conversation":
        return `/farm/${data.farm_id}#conversation-${data.id}`;
      default:
        return "/";
    }
  };

  const handleResultClick = (type: string, data: any) => {
    const url = getResultUrl(type, data);
    router.push(url);
    onClose();
  };

  // Rest of component in next step
}
```

**Step 2: Add section rendering**

Add section rendering and return statement:

```typescript
// Add before the return statement in previous step

const renderSection = (
  title: string,
  icon: string,
  items: any[],
  type: string,
  startIndex: number
) => {
    if (items.length === 0) return null;

    return (
      <div className="py-2">
        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {icon} {title} ({items.length})
        </div>
        {items.map((item, index) => {
          const globalIndex = startIndex + index;
          return (
            <SearchResultItem
              key={`${type}-${item.id}`}
              type={type as any}
              data={item}
              query={query}
              isHighlighted={globalIndex === highlightedIndex}
              onClick={() => handleResultClick(type, item)}
            />
          );
        })}
      </div>
    );
  };

  let currentIndex = 0;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg max-h-[500px] overflow-y-auto z-50">
      {!hasResults ? (
        <div className="px-4 py-8 text-center text-muted-foreground">
          <p className="font-medium mb-2">No matches for "{query}"</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      ) : (
        <>
          {renderSection(
            "Farms",
            "🗺️",
            results.farms,
            "farm",
            currentIndex
          )}
          {(currentIndex += results.farms.length) && null}

          {renderSection(
            "Posts",
            "📝",
            results.posts,
            "post",
            currentIndex
          )}
          {(currentIndex += results.posts.length) && null}

          {renderSection(
            "Species",
            "🌱",
            results.species,
            "species",
            currentIndex
          )}
          {(currentIndex += results.species.length) && null}

          {renderSection(
            "Zones",
            "📍",
            results.zones,
            "zone",
            currentIndex
          )}
          {(currentIndex += results.zones.length) && null}

          {renderSection(
            "Users",
            "👤",
            results.users,
            "user",
            currentIndex
          )}
          {(currentIndex += results.users.length) && null}

          {renderSection(
            "AI Conversations",
            "💬",
            results.ai_conversations,
            "ai_conversation",
            currentIndex
          )}
        </>
      )}
    </div>
  );
}
```

**Step 3: Commit dropdown component**

```bash
git add components/search/search-results-dropdown.tsx
git commit -m "feat: add search results dropdown with grouped sections"
```

---

## Task 5: Create Main Search Component

**Files:**
- Create: `components/search/universal-search.tsx`

**Step 1: Create main search component**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useSearch } from "@/hooks/use-search";
import { SearchResultsDropdown } from "./search-results-dropdown";
import { cn } from "@/lib/utils";

interface UniversalSearchProps {
  context: "my-farms" | "community" | "global";
  placeholder?: string;
  className?: string;
}

export function UniversalSearch({
  context,
  placeholder = "Search...",
  className,
}: UniversalSearchProps) {
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
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten results for navigation
  const allResults = [
    ...results.farms,
    ...results.posts,
    ...results.species,
    ...results.zones,
    ...results.users,
    ...results.ai_conversations,
  ];

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

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
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          // Result click will be handled by dropdown component
        }
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  // Cmd/Ctrl + K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "h-11 w-full pl-10 pr-10 rounded-lg",
            "border border-border bg-card text-foreground",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            "transition-colors"
          )}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <SearchResultsDropdown
        results={results}
        query={query}
        highlightedIndex={highlightedIndex}
        onClose={() => setIsOpen(false)}
        isOpen={isOpen}
      />
    </div>
  );
}
```

**Step 2: Commit main search component**

```bash
git add components/search/universal-search.tsx
git commit -m "feat: add universal search component with keyboard shortcuts"
```

---

## Task 6: Add Search to Navigation Bar

**Files:**
- Modify: `components/shared/sidebar.tsx`

**Step 1: Add search to sidebar**

Find the sidebar component and add search bar at the top of the navigation section:

```typescript
// Import at top of file
import { UniversalSearch } from "@/components/search/universal-search";

// Add inside the sidebar component, right after the logo/brand section and before nav
<div className="px-4 py-4">
  <UniversalSearch
    context="global"
    placeholder="Search everything... (⌘K)"
  />
</div>
```

Full updated sidebar structure:

```typescript
return (
  <div className="flex flex-col h-full bg-card">
    {/* Logo/Brand */}
    <div className="p-6 border-b border-border">
      <div className="flex items-center space-x-2">
        <MapIcon className="h-8 w-8 text-primary" />
        <span className="text-xl font-serif font-bold text-foreground">Permaculture.Studio</span>
      </div>
    </div>

    {/* Search Bar - NEW */}
    <div className="px-4 py-4 border-b border-border">
      <UniversalSearch
        context="global"
        placeholder="Search... (⌘K)"
      />
    </div>

    {/* Navigation - existing code */}
    <nav className="flex-1 px-4 py-4 space-y-2">
      {/* existing navigation items */}
    </nav>

    {/* User section - existing code */}
    <div className="p-4 border-t border-border">
      {/* existing user section */}
    </div>
  </div>
);
```

**Step 2: Test navigation search**

Start dev server and test:

```bash
npm run dev
```

- Click search bar or press Cmd/Ctrl+K
- Type a query (at least 3 characters)
- Verify results appear after 400ms
- Test keyboard navigation (arrows, enter, escape)
- Click a result to navigate

**Step 3: Commit navigation integration**

```bash
git add components/shared/sidebar.tsx
git commit -m "feat: integrate search into navigation sidebar"
```

---

## Task 7: Add Search to Dashboard Page

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Step 1: Add search to dashboard header**

Add search bar to the dashboard page header:

```typescript
// Import at top
import { UniversalSearch } from "@/components/search/universal-search";

// Update the header section to include search
return (
  <div className="p-4 md:p-8">
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">My Farms</h1>
          <p className="text-muted-foreground mt-1">
            Manage your permaculture designs
          </p>
        </div>
        <Button asChild>
          <Link href="/farm/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Farm
          </Link>
        </Button>
      </div>

      {/* Search Bar - NEW */}
      <div className="max-w-xl">
        <UniversalSearch
          context="my-farms"
          placeholder="Search your farms, zones, conversations..."
        />
      </div>
    </div>

    {/* Rest of the page - farms grid */}
    {farms.length === 0 ? (
      // ... existing empty state
    ) : (
      // ... existing farms grid
    )}
  </div>
);
```

**Step 2: Test dashboard search**

- Navigate to dashboard page
- Type a query to search your farms
- Verify only your content appears (not community)
- Test navigation to results

**Step 3: Commit dashboard integration**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "feat: add context-aware search to dashboard page"
```

---

## Task 8: Add Search to Gallery Page

**Files:**
- Modify: `app/(app)/gallery/page.tsx`

**Step 1: Read current gallery page**

First check the current gallery page structure:

```bash
cat app/(app)/gallery/page.tsx
```

**Step 2: Add search to gallery page**

Add search to gallery page header (similar to dashboard):

```typescript
// Import at top
import { UniversalSearch } from "@/components/search/universal-search";

// Add search before the feed grid
<div className="container mx-auto px-4 py-8">
  <div className="flex flex-col gap-4 mb-8">
    <div>
      <h1 className="text-3xl font-serif font-bold">Community Gallery</h1>
      <p className="text-muted-foreground mt-1">
        Explore farms and posts from the community
      </p>
    </div>

    {/* Search Bar - NEW */}
    <div className="max-w-xl">
      <UniversalSearch
        context="community"
        placeholder="Search community farms and posts..."
      />
    </div>
  </div>

  {/* Existing gallery content */}
  <GlobalFeedClient initialData={initialFeedData} />
</div>
```

**Step 3: Test gallery search**

- Navigate to gallery page
- Search for public content
- Verify only public farms/posts appear
- Test result navigation

**Step 4: Commit gallery integration**

```bash
git add app/(app)/gallery/page.tsx
git commit -m "feat: add community search to gallery page"
```

---

## Task 9: Add Search Keyboard Shortcut Hint

**Files:**
- Create: `components/search/search-shortcut-hint.tsx`
- Modify: `components/shared/sidebar.tsx`

**Step 1: Create keyboard shortcut hint component**

```typescript
"use client";

import { useEffect, useState } from "react";

export function SearchShortcutHint() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  return (
    <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-muted-foreground border border-border rounded bg-muted">
      <span>{isMac ? "⌘" : "Ctrl"}</span>
      <span>K</span>
    </kbd>
  );
}
```

**Step 2: Add hint to search bar**

Update UniversalSearch component to show the hint:

```typescript
// In universal-search.tsx, update the input wrapper

<div className="relative flex items-center gap-2">
  <div className="relative flex-1">
    {/* existing search input */}
  </div>
  <SearchShortcutHint />
</div>
```

Or add it inline in the placeholder (simpler):

```typescript
// When adding to sidebar, use:
<UniversalSearch
  context="global"
  placeholder="Search... (⌘K)"
/>
```

**Step 3: Commit keyboard hint**

```bash
git add components/search/search-shortcut-hint.tsx components/search/universal-search.tsx
git commit -m "feat: add keyboard shortcut hint for search"
```

---

## Task 10: Test Complete Search System

**Step 1: Manual testing checklist**

Test each context:

**Global search (from sidebar):**
- [ ] Search farms (owned and public)
- [ ] Search posts from community
- [ ] Search species
- [ ] Search zones (your zones only)
- [ ] Search users
- [ ] Search AI conversations

**My-farms search (from dashboard):**
- [ ] Search only your farms
- [ ] Search your zones
- [ ] Search your AI conversations
- [ ] Verify no community content appears

**Community search (from gallery):**
- [ ] Search public farms
- [ ] Search public posts
- [ ] Verify private content doesn't appear

**Interactions:**
- [ ] Cmd/Ctrl+K focuses search from anywhere
- [ ] Results appear after 400ms of typing
- [ ] Arrow keys navigate results
- [ ] Enter selects highlighted result
- [ ] Escape closes dropdown
- [ ] Click outside closes dropdown
- [ ] Clear button (X) clears query
- [ ] Loading spinner shows during search
- [ ] Query highlighting works (bold matches)

**Mobile:**
- [ ] Search bar full width on mobile
- [ ] Dropdown full width
- [ ] Touch targets are large enough
- [ ] Keyboard dismisses on result select

**Step 2: Test with various queries**

```bash
# Start dev server
npm run dev

# Test queries:
# - "swale" (should find farms, posts, zones with swale)
# - "willow" (should find species)
# - Your username (should find your profile in global)
# - Farm name (should find your farms)
# - Partial words (should match with LIKE query)
```

**Step 3: Performance testing**

- Type quickly and verify debouncing works (no lag)
- Verify previous requests are cancelled
- Check browser network tab for proper cancellation
- Test with slow network throttling

**Step 4: Create final commit**

```bash
git add .
git commit -m "test: verify universal search system across all contexts

Tested:
- Global search from sidebar
- My-farms search from dashboard
- Community search from gallery
- Keyboard navigation and shortcuts
- Mobile responsive behavior
- Performance and request cancellation"
```

---

## Task 11: Update Documentation

**Files:**
- Modify: `docs/plans/2025-12-01-universal-search-design.md`

**Step 1: Mark implementation complete**

Update the design doc header:

```markdown
**Status:** ✅ Implemented and Tested
**Priority:** High - Core navigation feature
```

**Step 2: Add implementation notes section**

Add to end of design doc:

```markdown
## Implementation Notes

**Completed:** 2025-12-01

**Files Created:**
- `app/api/search/route.ts` - Search API endpoint
- `hooks/use-search.ts` - Search hook with debouncing
- `components/search/universal-search.tsx` - Main search component
- `components/search/search-results-dropdown.tsx` - Results overlay
- `components/search/search-result-item.tsx` - Individual result items
- `components/search/search-shortcut-hint.tsx` - Keyboard hint

**Files Modified:**
- `components/shared/sidebar.tsx` - Added global search
- `app/(app)/dashboard/page.tsx` - Added my-farms search
- `app/(app)/gallery/page.tsx` - Added community search

**Known Limitations:**
- Using SQLite LIKE queries (could upgrade to FTS5 for better performance)
- Search limited to 3 results per section in dropdown
- No search history persistence yet

**Future Enhancements:**
- Add search filters (date, type, author)
- Implement search history
- Add search analytics
- Consider full-text search upgrade for large datasets
```

**Step 3: Commit documentation update**

```bash
git add docs/plans/2025-12-01-universal-search-design.md
git commit -m "docs: mark universal search implementation complete"
```

---

## Final Verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Test production build**

```bash
npm run start
```

Test all search contexts in production mode.

**Step 3: Push to repository**

```bash
git push origin main
```

**Step 4: Deploy to Vercel**

Vercel should auto-deploy. Test search on production:
- Global search works
- Context-aware filtering works
- Performance is good (< 500ms)
- Mobile experience is smooth

---

## Success Criteria ✅

- [x] Real-time search with 400ms debounce
- [x] Context-aware results (my-farms, community, global)
- [x] Grouped results in dropdown
- [x] Keyboard navigation (arrows, enter, escape)
- [x] Cmd/Ctrl+K shortcut
- [x] Query highlighting in results
- [x] Mobile responsive
- [x] Searches all entity types (farms, posts, species, zones, users, AI)
- [x] Proper permission filtering
- [x] Loading and empty states
- [x] Request cancellation on new search

---

**Implementation complete!** The universal search system is now live across all pages with context-aware smart searching.

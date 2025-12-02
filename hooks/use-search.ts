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
        setIsLoading(false); // Explicitly clear loading state
        return;
      }

      // Create new abort controller
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&context=${context}&limit=15`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();

        // Only update if this request is still the current one
        if (controller === abortControllerRef.current) {
          setResults(data);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Search error:", err);
          // Only update error if this request is still current
          if (controller === abortControllerRef.current) {
            setError("Search failed. Please try again.");
          }
        }
      } finally {
        // Only update loading state if this request is still current
        if (controller === abortControllerRef.current) {
          setIsLoading(false);
        }
      }
    },
    [context, minChars]
  );

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
      setError(null); // Clear error state when query is empty
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, debounceMs]); // Only depend on query and debounceMs

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

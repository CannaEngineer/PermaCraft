"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Search, ArrowRight } from 'lucide-react';
import type { Species } from '@/lib/db/schema';

interface SpeciesPickerCompactProps {
  farmId: string;
  onSelectSpecies: (species: Species) => void;
  onClose: () => void;
  onBrowseAll: () => void;
}

export function SpeciesPickerCompact({
  farmId,
  onSelectSpecies,
  onClose,
  onBrowseAll
}: SpeciesPickerCompactProps) {
  const [nativeSpecies, setNativeSpecies] = useState<{
    perfect_match: Species[];
    good_match: Species[];
  }>({ perfect_match: [], good_match: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadNativeSpecies();
  }, [farmId]);

  const loadNativeSpecies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/farms/${farmId}/native-species`);
      const data = await response.json();
      setNativeSpecies({
        perfect_match: data.perfect_match || [],
        good_match: data.good_match || []
      });
    } catch (error) {
      console.error('Failed to load native species:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search and filter results
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const allSpecies = [...nativeSpecies.perfect_match, ...nativeSpecies.good_match];
    const query = debouncedQuery.toLowerCase();

    return allSpecies
      .filter(s =>
        s.common_name.toLowerCase().includes(query) ||
        s.scientific_name?.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        // Prioritize natives
        if (a.is_native && !b.is_native) return -1;
        if (!a.is_native && b.is_native) return 1;
        // Then by match position (earlier match = better)
        const aIndex = a.common_name.toLowerCase().indexOf(query);
        const bIndex = b.common_name.toLowerCase().indexOf(query);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return 0;
      })
      .slice(0, 5);
  }, [debouncedQuery, nativeSpecies]);

  // Show loading state
  const showResults = debouncedQuery.trim().length > 0;

  // Layer display mapping
  const getLayerDisplay = (layer: string | null) => {
    const layerMap: Record<string, { label: string; emoji: string }> = {
      canopy: { label: 'Canopy', emoji: '🌳' },
      understory: { label: 'Understory', emoji: '🌲' },
      shrub: { label: 'Shrub', emoji: '🌿' },
      herbaceous: { label: 'Herbaceous', emoji: '🌾' },
      groundcover: { label: 'Groundcover', emoji: '🍀' },
      vine: { label: 'Vine', emoji: '🌿' },
      root: { label: 'Root', emoji: '🥕' },
      aquatic: { label: 'Aquatic', emoji: '💧' },
    };
    return layerMap[layer || ''] || { label: 'Unknown', emoji: '🌱' };
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/10 z-[998]"
        onClick={onClose}
      />

      {/* Compact Picker Panel */}
      <div className="fixed top-4 right-4 z-[999] w-[320px] max-w-[calc(100vw-2rem)] bg-card rounded-lg shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
        {/* Header with Search */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Select Plant</h3>
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search species..."
              className="w-full pl-8 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-background"
              autoFocus
            />
          </div>
        </div>

        {/* Results or Empty State */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading species...
            </div>
          ) : !showResults ? (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground mb-4">
                Start typing to search for plants
              </p>
              <Button
                onClick={onBrowseAll}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Browse All Species
              </Button>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No species found for "{debouncedQuery}"
              </p>
              <Button
                onClick={onBrowseAll}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Browse All Species
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {searchResults.map((species) => {
                const layerInfo = getLayerDisplay(species.layer);
                return (
                  <button
                    key={species.id}
                    onClick={() => onSelectSpecies(species)}
                    className="w-full text-left p-3 hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {species.common_name}
                          </span>
                          {species.is_native && (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-300 text-xs px-1.5 py-0 shrink-0"
                            >
                              🟢 Native
                            </Badge>
                          )}
                        </div>
                        {species.scientific_name && (
                          <p className="text-xs text-muted-foreground italic mb-1 truncate">
                            {species.scientific_name}
                          </p>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{layerInfo.emoji}</span>
                          <span className="text-xs text-muted-foreground">
                            {layerInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Browse All Option at Bottom */}
              <div className="p-2 bg-muted/30">
                <Button
                  onClick={onBrowseAll}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs"
                >
                  <span>Browse all {nativeSpecies.perfect_match.length + nativeSpecies.good_match.length} species</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

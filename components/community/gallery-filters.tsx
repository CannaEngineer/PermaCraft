'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GalleryFilters {
  search: string;
  sort: 'recent' | 'popular' | 'trending';
  zoneType: string;
}

interface GalleryFiltersProps {
  onFiltersChange: (filters: GalleryFilters) => void;
  initialFilters?: Partial<GalleryFilters>;
  className?: string;
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent' },
  { value: 'popular', label: 'Popular' },
  { value: 'trending', label: 'Trending' },
] as const;

const ZONE_TYPES = [
  { value: '', label: 'All' },
  { value: 'food_forest', label: 'Food Forest' },
  { value: 'water', label: 'Water Features' },
  { value: 'annual_garden', label: 'Annual Garden' },
  { value: 'orchard', label: 'Orchard' },
  { value: 'woodland', label: 'Woodland' },
] as const;

const DEFAULT_FILTERS: GalleryFilters = {
  search: '',
  sort: 'recent',
  zoneType: '',
};

export function GalleryFilters({
  onFiltersChange,
  initialFilters,
  className,
}: GalleryFiltersProps) {
  const [filters, setFilters] = useState<GalleryFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [searchInput, setSearchInput] = useState(initialFilters?.search || '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters((prev) => {
          const next = { ...prev, search: value };
          onFiltersChange(next);
          return next;
        });
      }, 300);
    },
    [onFiltersChange]
  );

  const handleSortChange = useCallback(
    (sort: GalleryFilters['sort']) => {
      setFilters((prev) => {
        const next = { ...prev, sort };
        onFiltersChange(next);
        return next;
      });
    },
    [onFiltersChange]
  );

  const handleZoneTypeChange = useCallback(
    (zoneType: string) => {
      setFilters((prev) => {
        const next = { ...prev, zoneType };
        onFiltersChange(next);
        return next;
      });
    },
    [onFiltersChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters((prev) => {
      const next = { ...prev, search: '' };
      onFiltersChange(next);
      return next;
    });
  }, [onFiltersChange]);

  const handleClearAll = useCallback(() => {
    setSearchInput('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const next = { ...DEFAULT_FILTERS };
    setFilters(next);
    onFiltersChange(next);
  }, [onFiltersChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.sort !== 'recent' ? 1 : 0) +
    (filters.zoneType ? 1 : 0);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search bar + active filter badge */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search posts, farms..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search posts and farms"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            <Badge
              variant="secondary"
              className="rounded-full px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* Sort toggle + Zone type pills in one row on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Sort tabs */}
        <div
          className="flex items-center gap-1 p-1 bg-muted rounded-lg shrink-0"
          role="group"
          aria-label="Sort posts"
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium transition-all duration-150',
                filters.sort === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={filters.sort === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Zone type pill filters */}
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by zone type"
        >
          {ZONE_TYPES.map((zone) => (
            <button
              key={zone.value}
              onClick={() => handleZoneTypeChange(zone.value)}
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150',
                filters.zoneType === zone.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
              )}
              aria-pressed={filters.zoneType === zone.value}
            >
              {zone.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// components/map/info-cards/compact-filter-pills.tsx
'use client';

import { MAP_INFO_TOKENS as tokens } from '@/lib/design/map-info-tokens';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterPill {
  id: string;
  label: string;
  color?: string;
  count?: number;
}

interface CompactFilterPillsProps {
  filters: FilterPill[];
  activeFilters: string[];
  onToggle: (id: string) => void;
  onClearAll?: () => void;
  title?: string;
}

export function CompactFilterPills({
  filters,
  activeFilters,
  onToggle,
  onClearAll,
  title = "Filters"
}: CompactFilterPillsProps) {
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn(
      tokens.colors.card.background,
      tokens.colors.card.border,
      tokens.shadows.card,
      'rounded-lg',
      tokens.spacing.card.padding
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={tokens.typography.title}>{title}</h3>
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilters.includes(filter.id);

          return (
            <Badge
              key={filter.id}
              variant={isActive ? "default" : "outline"}
              className={cn(
                'cursor-pointer select-none',
                tokens.animation.card,
                isActive && 'pr-1'
              )}
              onClick={() => onToggle(filter.id)}
            >
              <span className="flex items-center gap-1.5">
                {filter.color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: filter.color }}
                  />
                )}
                <span>{filter.label}</span>
                {filter.count !== undefined && (
                  <span className="text-xs opacity-70">({filter.count})</span>
                )}
                {isActive && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </span>
            </Badge>
          );
        })}
      </div>

      {hasActiveFilters && (
        <div className="mt-2 text-xs text-muted-foreground">
          {activeFilters.length} active filter{activeFilters.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

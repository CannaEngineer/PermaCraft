"use client";

import { useState, useCallback } from 'react';
import { Layers, MapPin, Leaf, Minus, Hand } from 'lucide-react';

export type InteractionFilter = 'all' | 'zones' | 'plants' | 'lines';

interface InteractionLayerFilterProps {
  activeFilter: InteractionFilter;
  onFilterChange: (filter: InteractionFilter) => void;
  /** Counts for each feature type (shown as badges) */
  counts?: { zones?: number; plants?: number; lines?: number };
}

const FILTERS: { key: InteractionFilter; label: string; icon: typeof Layers; color: string; activeColor: string }[] = [
  { key: 'all', label: 'All', icon: Hand, color: 'text-muted-foreground', activeColor: 'bg-foreground text-background' },
  { key: 'zones', label: 'Zones', icon: MapPin, color: 'text-blue-500', activeColor: 'bg-blue-500 text-white' },
  { key: 'plants', label: 'Plants', icon: Leaf, color: 'text-green-500', activeColor: 'bg-green-500 text-white' },
  { key: 'lines', label: 'Lines', icon: Minus, color: 'text-violet-500', activeColor: 'bg-violet-500 text-white' },
];

export function InteractionLayerFilter({ activeFilter, onFilterChange, counts }: InteractionLayerFilterProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const handleSelect = useCallback((filter: InteractionFilter) => {
    onFilterChange(filter);
    setExpanded(false);
  }, [onFilterChange]);

  const activeConfig = FILTERS.find(f => f.key === activeFilter) || FILTERS[0];
  const ActiveIcon = activeConfig.icon;

  // Collapsed: just show the active filter as a single pill
  if (!expanded) {
    return (
      <button
        onClick={handleToggle}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-full
          bg-background/90 backdrop-blur-md border border-border/50
          shadow-lg hover:shadow-xl transition-all duration-200
          active:scale-95 touch-manipulation
        `}
        aria-label={`Interaction filter: ${activeConfig.label}. Tap to change.`}
      >
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{activeConfig.label}</span>
      </button>
    );
  }

  // Expanded: show all options
  return (
    <div className="flex items-center gap-1 px-1.5 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg animate-in fade-in zoom-in-95 duration-150">
      {FILTERS.map(({ key, label, icon: Icon, color, activeColor }) => {
        const isActive = key === activeFilter;
        const count = key === 'zones' ? counts?.zones : key === 'plants' ? counts?.plants : key === 'lines' ? counts?.lines : undefined;

        return (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              transition-all duration-150 touch-manipulation min-h-[36px]
              ${isActive
                ? activeColor + ' shadow-sm'
                : 'hover:bg-muted/70 active:bg-muted ' + color
              }
            `}
            aria-label={`Filter: ${label}`}
            aria-pressed={isActive}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            {count !== undefined && count > 0 && !isActive && (
              <span className="text-[10px] text-muted-foreground ml-0.5">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

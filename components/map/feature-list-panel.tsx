'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFeatures } from '@/lib/map/feature-search';
import { groupByType, groupByLayer, groupByPhase } from '@/lib/map/feature-grouping';

interface FeatureListPanelProps {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
  onFeatureSelect: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef: React.RefObject<any>;
}

type ViewMode = 'type' | 'layer' | 'phase';

export function FeatureListPanel({
  zones,
  plantings,
  lines,
  guilds,
  phases,
  onFeatureSelect,
  mapRef
}: FeatureListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load active view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('feature-list-view');
    if (saved === 'type' || saved === 'layer' || saved === 'phase') {
      setActiveView(saved);
    }
  }, []);

  // Apply search filter
  const filteredFeatures = useMemo(() => {
    const allFeatures = { zones, plantings, lines, guilds, phases };
    return searchFeatures(allFeatures, debouncedQuery);
  }, [zones, plantings, lines, guilds, phases, debouncedQuery]);

  // Calculate result count
  const resultCount = useMemo(() => {
    return (
      filteredFeatures.zones.length +
      filteredFeatures.plantings.length +
      filteredFeatures.lines.length +
      filteredFeatures.guilds.length +
      filteredFeatures.phases.length
    );
  }, [filteredFeatures]);

  const totalCount = zones.length + plantings.length + lines.length + guilds.length + phases.length;

  // Save active view preference to localStorage
  const handleViewChange = (view: ViewMode) => {
    setActiveView(view);
    localStorage.setItem('feature-list-view', view);
    // Expand all groups when switching views
    setExpandedGroups(new Set());
  };

  // Group features based on active view
  const groupedFeatures = useMemo(() => {
    if (activeView === 'type') {
      return groupByType(filteredFeatures);
    } else if (activeView === 'layer') {
      return groupByLayer(filteredFeatures);
    } else {
      return groupByPhase(filteredFeatures, phases);
    }
  }, [activeView, filteredFeatures, phases]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
            aria-label="Search features"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Result count */}
        {debouncedQuery && (
          <div className="text-xs text-muted-foreground">
            {resultCount} result{resultCount !== 1 ? 's' : ''} for "{debouncedQuery}"
          </div>
        )}

        {/* View Tabs */}
        <div className="flex gap-1 border-b border-border">
          <Button
            variant={activeView === 'type' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('type')}
            className="rounded-b-none"
          >
            By Type
          </Button>
          <Button
            variant={activeView === 'layer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('layer')}
            className="rounded-b-none"
          >
            By Layer
          </Button>
          <Button
            variant={activeView === 'phase' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('phase')}
            className="rounded-b-none"
          >
            By Phase
          </Button>
        </div>

        {/* Feature List - TODO */}
        <div className="text-sm text-muted-foreground">
          Groups: {Object.keys(groupedFeatures).join(', ')}
        </div>
      </div>
    </div>
  );
}

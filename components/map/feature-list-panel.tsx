'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronRight, Square, Sprout, Minus, Sparkles, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFeatures } from '@/lib/map/feature-search';
import { groupByType, groupByLayer, groupByPhase } from '@/lib/map/feature-grouping';
import { center } from '@turf/center';

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

// Icon mapping
const getGroupIcon = (groupName: string) => {
  if (groupName === 'Zones') return Square;
  if (groupName === 'Plantings' || groupName.match(/Canopy|Understory|Shrub|Herbaceous|Groundcover|Vine|Root/)) return Sprout;
  if (groupName === 'Lines') return Minus;
  if (groupName === 'Guilds') return Sparkles;
  if (groupName === 'Phases' || groupName.match(/Year|Unscheduled/)) return Calendar;
  return Square;
};

/**
 * Get center coordinates for a feature
 */
function getFeatureCoordinates(feature: any, featureType: string): [number, number] | null {
  if (featureType === 'planting') {
    // Plantings are points
    return [feature.lng, feature.lat];
  }

  if (featureType === 'zone' || featureType === 'line') {
    // Zones and lines have GeoJSON geometry
    if (feature.geometry) {
      try {
        const geojson = typeof feature.geometry === 'string' ? JSON.parse(feature.geometry) : feature.geometry;
        const centerPoint = center(geojson);
        return centerPoint.geometry.coordinates as [number, number];
      } catch (error) {
        console.error('Failed to parse geometry:', error);
        return null;
      }
    }
  }

  return null;
}

/**
 * Determine feature type from grouped features
 */
function getFeatureType(feature: any, allFeatures: { zones: any[]; plantings: any[]; lines: any[]; guilds: any[]; phases: any[] }): 'zone' | 'planting' | 'line' | 'guild' | 'phase' | null {
  if (allFeatures.zones.some(z => z.id === feature.id)) return 'zone';
  if (allFeatures.plantings.some(p => p.id === feature.id)) return 'planting';
  if (allFeatures.lines.some(l => l.id === feature.id)) return 'line';
  if (allFeatures.guilds.some(g => g.id === feature.id)) return 'guild';
  if (allFeatures.phases.some(p => p.id === feature.id)) return 'phase';
  return null;
}

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

  const allFeatures = useMemo(() => ({ zones, plantings, lines, guilds, phases }), [zones, plantings, lines, guilds, phases]);

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

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleFeatureClick = (feature: any) => {
    const featureType = getFeatureType(feature, allFeatures);
    if (!featureType) return;

    // Pan map to feature
    const coords = getFeatureCoordinates(feature, featureType);
    if (coords && mapRef.current) {
      mapRef.current.flyTo({
        center: coords,
        zoom: 18,
        duration: 500
      });
    }

    // Open details drawer
    onFeatureSelect(feature.id, featureType);
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

        {/* Feature List */}
        <div className="space-y-2 overflow-y-auto max-h-[400px]">
          {Object.entries(groupedFeatures).map(([groupName, features]) => {
            const isExpanded = expandedGroups.has(groupName);
            const Icon = getGroupIcon(groupName);

            return (
              <div key={groupName} className="border rounded-md">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    {groupName} ({features.length})
                  </span>
                </button>

                {/* Group Items */}
                {isExpanded && (
                  <div className="pl-8 pr-2 pb-2 space-y-1">
                    {features.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2">
                        No features in this group
                      </div>
                    ) : (
                      features.map((feature: any) => (
                        <div
                          key={feature.id}
                          className="p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                          onClick={() => handleFeatureClick(feature)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleFeatureClick(feature);
                            }
                          }}
                        >
                          <div className="text-sm truncate">
                            {feature.name || feature.common_name || feature.label || 'Unnamed'}
                          </div>
                          {feature.scientific_name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {feature.scientific_name}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {Object.keys(groupedFeatures).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No features yet.</p>
            <p className="text-xs mt-2">Use the FAB to add zones, plantings, or lines.</p>
          </div>
        )}
      </div>
    </div>
  );
}

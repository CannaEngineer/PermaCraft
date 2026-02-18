'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, X, ChevronDown, ChevronRight, Square, Sprout, Minus, Sparkles, Calendar, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFeatures } from '@/lib/map/feature-search';
import { groupByType, groupByLayer, groupByPhase } from '@/lib/map/feature-grouping';
import { center } from '@turf/center';
import { getZoneTypeConfig } from '@/lib/map/zone-types';
import { PhaseAssignmentModal } from '@/components/phasing/phase-assignment-modal';
import { ArrowUpDown } from 'lucide-react';

interface FeatureListPanelProps {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
  farmId?: string;
  onFeatureSelect: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef: React.RefObject<any>;
  /** Callback when layer filters change (by layer value e.g. 'canopy', 'understory') */
  onLayerFilterChange?: (activeLayers: string[]) => void;
  /** Callback when vital function filters change */
  onVitalFilterChange?: (activeVitals: string[]) => void;
  /** Callback to refresh data after phase changes */
  onDataRefresh?: () => void;
}

type ViewMode = 'type' | 'layer' | 'phase';

/** Planting layer definitions for filter toggles */
const PLANTING_LAYERS = [
  { value: 'canopy', label: 'Canopy', color: 'bg-green-900' },
  { value: 'understory', label: 'Understory', color: 'bg-green-700' },
  { value: 'shrub', label: 'Shrub', color: 'bg-green-500' },
  { value: 'herbaceous', label: 'Herbaceous', color: 'bg-lime-500' },
  { value: 'groundcover', label: 'Groundcover', color: 'bg-lime-300' },
  { value: 'vine', label: 'Vine', color: 'bg-purple-500' },
  { value: 'root', label: 'Root', color: 'bg-amber-900' },
  { value: 'aquatic', label: 'Aquatic', color: 'bg-blue-500' },
];

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
  farmId,
  onFeatureSelect,
  mapRef,
  onLayerFilterChange,
  onVitalFilterChange,
  onDataRefresh,
}: FeatureListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeView, setActiveView] = useState<ViewMode>('type');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // Hidden groups act as visibility filter (eye icon off = hidden on map)
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  // Phase assignment modal
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);

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

  // Auto-expand groups with search results
  useEffect(() => {
    if (debouncedQuery) {
      // Expand all groups that have features when searching
      const groupsWithFeatures = Object.entries(groupedFeatures)
        .filter(([_, features]) => features.length > 0)
        .map(([groupName]) => groupName);

      setExpandedGroups(new Set(groupsWithFeatures));
    }
  }, [debouncedQuery, groupedFeatures]);

  // When in layer view, propagate visibility changes as filter changes
  const toggleGroupVisibility = useCallback((groupName: string) => {
    setHiddenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }

      // When in "By Layer" view, map group names to layer values for filtering
      if (activeView === 'layer' && onLayerFilterChange) {
        const allLayerNames = PLANTING_LAYERS.map(l => l.label.charAt(0).toUpperCase() + l.label.slice(1));
        const activeLayers = PLANTING_LAYERS
          .filter(l => {
            const groupLabel = l.label.charAt(0).toUpperCase() + l.label.slice(1);
            return !next.has(groupLabel);
          })
          .map(l => l.value);
        // Only send filter if some are hidden, otherwise send empty (show all)
        onLayerFilterChange(next.size > 0 ? activeLayers : []);
      }

      return next;
    });
  }, [activeView, onLayerFilterChange]);

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

        {/* Phase management button - shown in phase view */}
        {activeView === 'phase' && farmId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPhaseModalOpen(true)}
            className="w-full"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Rearrange Between Phases
          </Button>
        )}

        {/* Feature List */}
        <ul role="list" className="space-y-2 overflow-y-auto max-h-[400px]">
          {Object.entries(groupedFeatures).map(([groupName, features]) => {
            const isExpanded = expandedGroups.has(groupName);
            const Icon = getGroupIcon(groupName);

            return (
              <li key={groupName} className={`border rounded-md ${hiddenGroups.has(groupName) ? 'opacity-50' : ''}`}>
                {/* Group Header */}
                <div className="flex items-center">
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="flex-1 flex items-center gap-2 p-2 hover:bg-accent rounded-l-md transition-colors"
                    aria-expanded={isExpanded}
                    aria-label={`${groupName} group, ${features.length} features`}
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
                  {/* Visibility toggle for this group */}
                  {activeView === 'layer' && groupName !== 'Other Features' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleGroupVisibility(groupName); }}
                      className="p-2 hover:bg-accent rounded-r-md transition-colors flex-shrink-0"
                      title={hiddenGroups.has(groupName) ? `Show ${groupName} on map` : `Hide ${groupName} on map`}
                    >
                      {hiddenGroups.has(groupName) ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Group Items */}
                {isExpanded && (
                  <ul role="list" className="pl-8 pr-2 pb-2 space-y-1">
                    {features.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2">
                        No features in this group
                      </div>
                    ) : (
                      features.map((feature: any) => (
                        <li
                          key={feature.id}
                          className="p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                          onClick={() => handleFeatureClick(feature)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleFeatureClick(feature);
                            }
                          }}
                          aria-label={`${feature.name || feature.common_name || feature.label || 'Unnamed'} feature`}
                        >
                          <div className="text-sm truncate">
                            {(() => {
                              // For zones, try to get zone type label from properties
                              if (feature.zone_type !== undefined) {
                                if (feature.name) return feature.name;

                                // Parse properties to get user_zone_type
                                try {
                                  const properties = typeof feature.properties === 'string'
                                    ? JSON.parse(feature.properties)
                                    : feature.properties;

                                  if (properties?.user_zone_type) {
                                    const zoneConfig = getZoneTypeConfig(properties.user_zone_type);
                                    return zoneConfig.label;
                                  }
                                } catch (e) {
                                  // Fallback if parsing fails
                                }

                                return 'Unnamed Zone';
                              }

                              // For other features
                              return feature.name || feature.common_name || feature.label || 'Unnamed';
                            })()}
                          </div>
                          {feature.scientific_name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {feature.scientific_name}
                            </div>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        {/* Empty State */}
        {Object.keys(groupedFeatures).length === 0 && !debouncedQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No features yet.</p>
            <p className="text-xs mt-2">Use the FAB to add zones, plantings, or lines.</p>
          </div>
        )}

        {/* No Search Results */}
        {debouncedQuery && resultCount === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No features match "{debouncedQuery}"</p>
            <p className="text-xs mt-2">Try different keywords.</p>
          </div>
        )}
      </div>

      {/* Phase Assignment Modal */}
      {farmId && (
        <PhaseAssignmentModal
          open={phaseModalOpen}
          onOpenChange={setPhaseModalOpen}
          farmId={farmId}
          phases={phases}
          plantings={plantings}
          zones={zones}
          onUpdated={() => {
            setPhaseModalOpen(false);
            onDataRefresh?.();
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronRight, Square, Sprout, Minus, Sparkles, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchFeatures } from '@/lib/map/feature-search';
import { groupByType } from '@/lib/map/feature-grouping';
import { center } from '@turf/center';
import { bbox } from '@turf/bbox';
import { getZoneTypeConfig } from '@/lib/map/zone-types';

interface FeatureListPanelProps {
  zones: any[];
  plantings: any[];
  lines: any[];
  guilds: any[];
  phases: any[];
  onFeatureSelect: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef: React.RefObject<any>;
}


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
 * Get a [west, south, east, north] bounding box for a zone or line so the map
 * can fit the whole feature instead of centering on its midpoint.
 */
function getFeatureBbox(feature: any): [number, number, number, number] | null {
  if (!feature?.geometry) return null;
  try {
    const geojson = typeof feature.geometry === 'string' ? JSON.parse(feature.geometry) : feature.geometry;
    const box = bbox(geojson) as number[];
    if (box.length < 4 || box.some((n) => !Number.isFinite(n))) return null;
    return [box[0], box[1], box[2], box[3]];
  } catch {
    return null;
  }
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
  mapRef,
}: FeatureListPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const allFeatures = useMemo(() => ({ zones, plantings, lines, guilds, phases }), [zones, plantings, lines, guilds, phases]);

  // Group features by type (the natural, intuitive grouping)
  const groupedFeatures = useMemo(() => {
    return groupByType(filteredFeatures);
  }, [filteredFeatures]);

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

    const map = mapRef.current;
    if (map) {
      // For zones and lines, fit the whole feature into view rather than
      // centering on its centroid at a fixed zoom — a long swale or wide
      // food-forest polygon would otherwise disappear offscreen.
      const featureBbox = (featureType === 'zone' || featureType === 'line')
        ? getFeatureBbox(feature)
        : null;

      if (featureBbox) {
        // Clamp max zoom so we don't flatten the map to zoom 22 for a tiny
        // 1 m line. Preserve the user's current zoom if they're already
        // deeper than that (precision work at z20+ stays at that level).
        const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : 18;
        const maxZoom = Math.max(18, currentZoom);
        try {
          map.fitBounds(
            [[featureBbox[0], featureBbox[1]], [featureBbox[2], featureBbox[3]]],
            { padding: 80, duration: 500, maxZoom }
          );
        } catch {
          // Fall back to centering if fitBounds fails on a degenerate geometry.
          const coords = getFeatureCoordinates(feature, featureType);
          if (coords) {
            map.flyTo({ center: coords, zoom: Math.max(18, currentZoom), duration: 500 });
          }
        }
      } else {
        // Point-like features: pan but don't zoom OUT from precision mode.
        const coords = getFeatureCoordinates(feature, featureType);
        if (coords) {
          const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : 18;
          map.flyTo({ center: coords, zoom: Math.max(18, currentZoom), duration: 500 });
        }
      }
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

        {/* Feature List */}
        <ul role="list" className="space-y-2 overflow-y-auto max-h-[400px]">
          {Object.entries(groupedFeatures).map(([groupName, features]) => {
            const isExpanded = expandedGroups.has(groupName);
            const Icon = getGroupIcon(groupName);

            return (
              <li key={groupName} className="border rounded-md">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center gap-2 p-2 hover:bg-accent rounded-md transition-colors"
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
          <div className="text-center py-8 px-4">
            <div className="flex justify-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Sprout className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Square className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Minus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">Your design starts here</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto leading-relaxed">
              Add a plant, draw a zone, or trace a path to begin shaping your land.
            </p>
          </div>
        )}

        {/* No Search Results */}
        {debouncedQuery && resultCount === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-5 w-5 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No features match &ldquo;{debouncedQuery}&rdquo;</p>
            <p className="text-xs mt-1">Try a different name, species, or zone type.</p>
          </div>
        )}
      </div>

    </div>
  );
}

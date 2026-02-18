"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Filter, Activity, Leaf, List, ChevronRight, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FarmVitals } from "@/components/farm/farm-vitals";
import { FeatureListPanel } from "./feature-list-panel";
import { RedesignedTimeMachine } from "@/components/time-machine/redesigned-time-machine";
import { CompactFilterPills } from "./info-cards/compact-filter-pills";
import { MAP_INFO_TOKENS as tokens } from "@/lib/design/map-info-tokens";
import { cn } from "@/lib/utils";

type MapLayer = "satellite" | "mapbox-satellite" | "terrain-3d" | "terrain" | "topo" | "usgs" | "street";
type GridDensity = "auto" | "sparse" | "normal" | "dense" | "off";

const LAYER_FILTERS = [
  { id: 'canopy', label: 'Canopy', color: '#166534' },
  { id: 'understory', label: 'Understory', color: '#16a34a' },
  { id: 'shrub', label: 'Shrub', color: '#22c55e' },
  { id: 'herbaceous', label: 'Herbaceous', color: '#84cc16' },
  { id: 'groundcover', label: 'Groundcover', color: '#a3e635' },
  { id: 'vine', label: 'Vine', color: '#a855f7' },
  { id: 'root', label: 'Root', color: '#78350f' },
  { id: 'aquatic', label: 'Aquatic', color: '#0284c7' },
];

const FUNCTION_FILTERS = [
  { id: 'nitrogen_fixer', label: 'N-Fixers' },
  { id: 'pollinator_support', label: 'Pollinators' },
  { id: 'dynamic_accumulator', label: 'Accumulators' },
  { id: 'wildlife_habitat', label: 'Wildlife' },
  { id: 'edible_fruit', label: 'Edible' },
  { id: 'medicinal', label: 'Medicinal' },
  { id: 'erosion_control', label: 'Erosion Control' },
];

const MAP_LAYERS: { value: MapLayer; label: string }[] = [
  { value: 'satellite', label: 'Satellite (ESRI)' },
  { value: 'mapbox-satellite', label: 'Mapbox Satellite' },
  { value: 'terrain-3d', label: '3D Terrain' },
  { value: 'terrain', label: 'Terrain Map' },
  { value: 'topo', label: 'OpenTopoMap' },
  { value: 'usgs', label: 'USGS Topo' },
  { value: 'street', label: 'Street Map' },
];

interface MapBottomDrawerProps {
  mapLayer: MapLayer;
  gridUnit: "imperial" | "metric";
  gridDensity: GridDensity;
  zones: any[];
  plantings?: any[];
  lines?: any[];
  guilds?: any[];
  phases?: any[];
  farmId?: string;

  // Time Machine props
  currentYear?: number;
  onYearChange?: (year: number) => void;
  minYear?: number;
  maxYear?: number;

  // Filters props
  plantingFilters: string[];
  onTogglePlantingFilter: (layer: string) => void;
  vitalFilters: string[];
  onToggleVitalFilter: (vital: string) => void;

  // Vitals props
  onGetRecommendations?: (vitalKey: string, vitalLabel: string, currentCount: number, plantList: any[]) => void;

  // Map Settings props
  onChangeLayer?: (layer: MapLayer) => void;
  onToggleGridUnit?: () => void;
  onChangeGridDensity?: (density: GridDensity) => void;

  // Actions
  onAddPlant?: () => void;
  onDataRefresh?: () => void;

  // Feature List props
  onFeatureSelectFromList?: (featureId: string, featureType: 'zone' | 'planting' | 'line' | 'guild' | 'phase') => void;
  mapRef?: React.RefObject<any>;
}

type Tab = 'features' | 'filters' | 'vitals';

export function MapBottomDrawer({
  mapLayer,
  gridUnit,
  gridDensity,
  zones,
  plantings = [],
  lines = [],
  guilds = [],
  phases = [],
  farmId,
  currentYear,
  onYearChange,
  minYear = new Date().getFullYear(),
  maxYear = new Date().getFullYear() + 20,
  plantingFilters,
  onTogglePlantingFilter,
  vitalFilters,
  onToggleVitalFilter,
  onGetRecommendations,
  onChangeLayer,
  onToggleGridUnit,
  onChangeGridDensity,
  onAddPlant,
  onDataRefresh,
  onFeatureSelectFromList,
  mapRef,
}: MapBottomDrawerProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('features');
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const activeFilterCount = useMemo(() => {
    return plantingFilters.length + vitalFilters.length;
  }, [plantingFilters.length, vitalFilters.length]);

  const lowVitalCount = useMemo(() => {
    if (plantings.length === 0) return 0;
    const functionCounts: Record<string, number> = {};
    plantings.forEach((planting: any) => {
      if (!planting.permaculture_functions) return;
      try {
        const functions: string[] = JSON.parse(planting.permaculture_functions);
        functions.forEach((fn) => {
          functionCounts[fn] = (functionCounts[fn] || 0) + 1;
        });
      } catch {
        // Ignore parse errors
      }
    });
    const highImportanceFunctions = [
      'nitrogen_fixer', 'nitrogen_fixing',
      'pollinator_support', 'pollinator', 'pollinator_attractor',
      'edible_fruit', 'edible_nuts', 'edible'
    ];
    return highImportanceFunctions.filter(fn => !functionCounts[fn]).length > 0 ? 1 : 0;
  }, [plantings]);

  const nonBoundaryZoneCount = useMemo(() => {
    return zones.filter((z: any) => z.zone_type !== 'farm_boundary').length;
  }, [zones]);

  // Build filter pill data with counts
  const layerPillFilters = useMemo(() => {
    return LAYER_FILTERS.map(layer => ({
      ...layer,
      count: plantings.filter((p: any) => p.layer === layer.id).length,
    }));
  }, [plantings]);

  const functionPillFilters = useMemo(() => {
    return FUNCTION_FILTERS.map(fn => {
      const count = plantings.filter((p: any) => {
        if (!p.permaculture_functions) return false;
        try {
          const functions = typeof p.permaculture_functions === 'string'
            ? JSON.parse(p.permaculture_functions)
            : p.permaculture_functions;
          return functions.includes(fn.id);
        } catch {
          return false;
        }
      }).length;
      return { ...fn, count };
    });
  }, [plantings]);

  const handleClearLayerFilters = useCallback(() => {
    plantingFilters.forEach(id => onTogglePlantingFilter(id));
  }, [plantingFilters, onTogglePlantingFilter]);

  const handleClearVitalFilters = useCallback(() => {
    vitalFilters.forEach(id => onToggleVitalFilter(id));
  }, [vitalFilters, onToggleVitalFilter]);

  const openTab = (tab: Tab) => {
    setActiveTab(tab);
    setIsCollapsed(false);
  };

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border text-xs z-20",
        tokens.animation.slide,
        isCollapsed ? 'translate-y-full' : 'translate-y-0'
      )}
      data-bottom-drawer
      data-collapsed={isCollapsed}
    >
      {/* Peek Bar - Always Visible When Collapsed */}
      {isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="flex items-center justify-between px-3 py-2 min-h-[44px]">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={() => setIsCollapsed(false)}
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors shrink-0"
                aria-label="Expand map info drawer"
              >
                <span className="text-muted-foreground">
                  <Leaf className="inline h-3.5 w-3.5 mr-1" />
                  {plantings.length} {plantings.length === 1 ? 'planting' : 'plantings'}
                </span>
                <span className="text-muted-foreground/60">|</span>
                <span className="text-muted-foreground">
                  {nonBoundaryZoneCount} {nonBoundaryZoneCount === 1 ? 'zone' : 'zones'}
                </span>
              </button>

              {lowVitalCount > 0 && plantings.length > 0 && (
                <Badge
                  onClick={(e) => { e.stopPropagation(); openTab('vitals'); }}
                  variant="destructive"
                  className="cursor-pointer hover:bg-destructive/90 text-[10px] shrink-0"
                >
                  Missing functions
                </Badge>
              )}

              {activeFilterCount > 0 && (
                <Badge
                  onClick={(e) => { e.stopPropagation(); openTab('filters'); }}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/90 text-[10px] shrink-0"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {onAddPlant && (
                <Button
                  size="sm"
                  onClick={onAddPlant}
                  className="h-8 text-xs px-3"
                >
                  <Leaf className="h-3 w-3 mr-1" />
                  Add Plant
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsCollapsed(false)}
                aria-label="Expand"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar - Visible When Expanded */}
      {!isCollapsed && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/95">
          <div className="flex gap-1" role="tablist" aria-label="Map info tabs">
            <button
              role="tab"
              aria-selected={activeTab === 'features'}
              aria-controls="tabpanel-features"
              id="tab-features"
              onClick={() => setActiveTab('features')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px]",
                activeTab === 'features'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <List className="inline h-3 w-3 mr-1" />
              Features
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'filters'}
              aria-controls="tabpanel-filters"
              id="tab-filters"
              onClick={() => setActiveTab('filters')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px]",
                activeTab === 'filters'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Filter className="inline h-3 w-3 mr-1" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[16px] px-1 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'vitals'}
              aria-controls="tabpanel-vitals"
              id="tab-vitals"
              onClick={() => setActiveTab('vitals')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px]",
                activeTab === 'vitals'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Activity className="inline h-3 w-3 mr-1" />
              Vitals & Time
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {onAddPlant && (
              <Button
                size="sm"
                onClick={onAddPlant}
                className="h-8 text-xs px-3"
              >
                <Leaf className="h-3 w-3 mr-1" />
                Add Plant
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsCollapsed(true)}
              aria-label="Collapse"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {!isCollapsed && (
        <div className="overflow-y-auto max-h-[60vh] overscroll-contain">
          {/* Features Tab */}
          {activeTab === 'features' && (
            <div
              role="tabpanel"
              id="tabpanel-features"
              aria-labelledby="tab-features"
            >
              {onFeatureSelectFromList && mapRef ? (
                <FeatureListPanel
                  zones={zones}
                  plantings={plantings}
                  lines={lines}
                  guilds={guilds}
                  phases={phases}
                  farmId={farmId}
                  onFeatureSelect={onFeatureSelectFromList}
                  mapRef={mapRef}
                  onDataRefresh={onDataRefresh}
                />
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Feature list not available
                </div>
              )}
            </div>
          )}

          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <div
              role="tabpanel"
              id="tabpanel-filters"
              aria-labelledby="tab-filters"
              className="p-4 space-y-4"
            >
              <CompactFilterPills
                title="Layer Filters"
                filters={layerPillFilters}
                activeFilters={plantingFilters}
                onToggle={onTogglePlantingFilter}
                onClearAll={plantingFilters.length > 0 ? handleClearLayerFilters : undefined}
              />

              <CompactFilterPills
                title="Function Filters"
                filters={functionPillFilters}
                activeFilters={vitalFilters}
                onToggle={onToggleVitalFilter}
                onClearAll={vitalFilters.length > 0 ? handleClearVitalFilters : undefined}
              />

              {/* Collapsible Map Settings */}
              {onChangeLayer && (
                <div className={cn(
                  tokens.colors.card.background,
                  tokens.colors.card.border,
                  'rounded-lg',
                  tokens.spacing.card.padding
                )}>
                  <button
                    onClick={() => setSettingsExpanded(!settingsExpanded)}
                    className="flex items-center justify-between w-full text-left"
                    aria-expanded={settingsExpanded}
                  >
                    <h3 className={tokens.typography.title}>
                      <Map className="inline h-3.5 w-3.5 mr-1.5" />
                      Map Settings
                    </h3>
                    <ChevronRight className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      settingsExpanded && "rotate-90"
                    )} />
                  </button>

                  {settingsExpanded && (
                    <div className="mt-3 space-y-4">
                      {/* Map Layer Selection */}
                      <div>
                        <div className="text-xs font-medium mb-2 text-muted-foreground">Map Layer</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                          {MAP_LAYERS.map((layer) => (
                            <button
                              key={layer.value}
                              onClick={() => onChangeLayer(layer.value)}
                              className={cn(
                                "px-3 py-2 rounded-lg text-xs transition-colors",
                                mapLayer === layer.value
                                  ? 'bg-primary text-primary-foreground font-medium'
                                  : 'bg-muted/50 hover:bg-muted'
                              )}
                            >
                              {layer.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Grid Unit Toggle */}
                      {onToggleGridUnit && (
                        <div>
                          <div className="text-xs font-medium mb-2 text-muted-foreground">Grid Units</div>
                          <button
                            onClick={onToggleGridUnit}
                            className="w-full px-3 py-2 rounded-lg text-xs bg-muted/50 hover:bg-muted transition-colors text-left"
                          >
                            <span className="font-medium">{gridUnit === 'imperial' ? 'Imperial (ft)' : 'Metric (m)'}</span>
                            <span className="text-muted-foreground ml-2">Tap to toggle</span>
                          </button>
                        </div>
                      )}

                      {/* Grid Density */}
                      {onChangeGridDensity && (
                        <div>
                          <div className="text-xs font-medium mb-2 text-muted-foreground">Grid Density</div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {(['auto', 'sparse', 'normal', 'dense', 'off'] as GridDensity[]).map((density) => (
                              <button
                                key={density}
                                onClick={() => onChangeGridDensity(density)}
                                className={cn(
                                  "px-2 py-2 rounded-lg text-xs transition-colors capitalize",
                                  gridDensity === density
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/50 hover:bg-muted'
                                )}
                              >
                                {density}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Vitals & Time Tab */}
          {activeTab === 'vitals' && (
            <div
              role="tabpanel"
              id="tabpanel-vitals"
              aria-labelledby="tab-vitals"
            >
              <div className="p-4">
                <FarmVitals
                  plantings={plantings}
                  onGetRecommendations={onGetRecommendations}
                />
              </div>

              {currentYear !== undefined && onYearChange && (
                <>
                  <div className="border-t border-border mx-4" />
                  <RedesignedTimeMachine
                    plantings={plantings}
                    currentYear={currentYear}
                    onYearChange={onYearChange}
                    minYear={minYear}
                    maxYear={maxYear}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

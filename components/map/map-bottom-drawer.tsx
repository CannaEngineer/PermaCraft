"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Filter, Map, Activity, Settings, Clock, Leaf, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FarmVitals } from "@/components/farm/farm-vitals";

type MapLayer = "satellite" | "mapbox-satellite" | "terrain-3d" | "terrain" | "topo" | "usgs" | "street";
type GridDensity = "auto" | "sparse" | "normal" | "dense" | "off";

interface MapBottomDrawerProps {
  // Legend props
  mapLayer: MapLayer;
  gridUnit: "imperial" | "metric";
  gridDensity: GridDensity;
  zones: any[];
  plantings?: any[];

  // Time Machine props
  isTimeMachineOpen?: boolean;
  onOpenTimeMachine?: () => void;
  onCloseTimeMachine?: () => void;
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
}

type Tab = 'legend' | 'filters' | 'vitals' | 'settings' | 'timemachine';

export function MapBottomDrawer({
  mapLayer,
  gridUnit,
  gridDensity,
  zones,
  plantings = [],
  isTimeMachineOpen = false,
  onOpenTimeMachine,
  onCloseTimeMachine,
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
}: MapBottomDrawerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('filters');
  const [isPlaying, setIsPlaying] = useState(false);

  // Use isCollapsed directly - remove forced expand
  const effectiveCollapsed = isCollapsed;

  // Time machine playback effect
  useEffect(() => {
    if (!isPlaying || !onYearChange || currentYear === undefined) return;

    const interval = setInterval(() => {
      if (currentYear >= maxYear) {
        setIsPlaying(false);
        return;
      }
      onYearChange(currentYear + 1);
    }, 1000); // Advance one year per second

    return () => clearInterval(interval);
  }, [isPlaying, currentYear, maxYear, onYearChange]);

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border text-xs z-20 transition-all duration-300 ${
        effectiveCollapsed ? 'translate-y-full' : 'translate-y-0'
      }`}
      data-bottom-drawer
      data-collapsed={effectiveCollapsed}
    >
      {/* Peek Tab - Always Visible When Collapsed */}
      {effectiveCollapsed && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setIsCollapsed(false)}
        >
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">
                <Map className="inline h-4 w-4 mr-1" />
                Map Info ▲
              </span>
              <span className="text-xs text-muted-foreground">
                {plantings.length} plantings
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar - Always Visible When Expanded */}
      {!effectiveCollapsed && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/95">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setActiveTab('vitals')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'vitals'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <Activity className="inline h-3 w-3 mr-1" />
              Vitals
            </button>
            <button
              onClick={() => setActiveTab('filters')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'filters'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <Filter className="inline h-3 w-3 mr-1" />
              Filters
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <Settings className="inline h-3 w-3 mr-1" />
              Settings
            </button>
            <button
              onClick={() => {
                setActiveTab('timemachine');
                if (onOpenTimeMachine) onOpenTimeMachine();
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'timemachine'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <Clock className="inline h-3 w-3 mr-1" />
              Time Machine
            </button>
            <button
              onClick={() => setActiveTab('legend')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'legend'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <Map className="inline h-3 w-3 mr-1" />
              Info
            </button>
          </div>
          <div className="flex gap-2">
            {onAddPlant && (
              <Button
                size="sm"
                onClick={onAddPlant}
                className="h-7 text-xs"
              >
                <Leaf className="h-3 w-3 mr-1" />
                Add Plant
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsCollapsed(true)}
              title="Minimize"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Content Area - Tab Content */}
      {!effectiveCollapsed && (
        <div className="overflow-y-auto max-h-[60vh]">
          {activeTab === 'vitals' && (
            <div className="p-4">
              <FarmVitals
                plantings={plantings}
                onGetRecommendations={onGetRecommendations}
              />
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Layer Filters */}
                <div>
                  <div className="text-muted-foreground font-medium mb-3 text-xs">
                    Filter by Layer
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'canopy', label: 'Canopy', color: 'bg-green-900' },
                      { value: 'understory', label: 'Understory', color: 'bg-green-700' },
                      { value: 'shrub', label: 'Shrub', color: 'bg-green-500' },
                      { value: 'herbaceous', label: 'Herbaceous', color: 'bg-lime-500' },
                      { value: 'groundcover', label: 'Groundcover', color: 'bg-lime-300' },
                      { value: 'vine', label: 'Vine', color: 'bg-purple-500' },
                      { value: 'root', label: 'Root', color: 'bg-amber-900' },
                      { value: 'aquatic', label: 'Aquatic', color: 'bg-blue-500' },
                    ].map((layer) => {
                      const isActive = plantingFilters.length === 0 || plantingFilters.includes(layer.value);
                      return (
                        <button
                          key={layer.value}
                          onClick={() => onTogglePlantingFilter(layer.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                            isActive
                              ? 'bg-muted/50 border border-primary/20'
                              : 'bg-muted/20 opacity-50 border border-transparent'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded ${layer.color}`} />
                          <span className={isActive ? 'font-medium' : ''}>{layer.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vital Type Filters */}
                <div>
                  <div className="text-muted-foreground font-medium mb-3 text-xs">
                    Filter by Function
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'nitrogen_fixer', label: 'Nitrogen Fixers', emoji: '🌿' },
                      { value: 'pollinator_support', label: 'Pollinator Plants', emoji: '🐝' },
                      { value: 'dynamic_accumulator', label: 'Dynamic Accumulators', emoji: '⚡' },
                      { value: 'wildlife_habitat', label: 'Wildlife Habitat', emoji: '🦋' },
                      { value: 'edible_fruit', label: 'Edible Plants', emoji: '🍎' },
                      { value: 'medicinal', label: 'Medicinal', emoji: '💊' },
                      { value: 'erosion_control', label: 'Erosion Control', emoji: '🌊' },
                    ].map((vital) => {
                      const isActive = vitalFilters.length === 0 || vitalFilters.includes(vital.value);
                      return (
                        <button
                          key={vital.value}
                          onClick={() => onToggleVitalFilter(vital.value)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                            isActive
                              ? 'bg-muted/50 border border-primary/20'
                              : 'bg-muted/20 opacity-50 border border-transparent'
                          }`}
                        >
                          <span className="text-sm">{vital.emoji}</span>
                          <span className={isActive ? 'font-medium' : ''}>{vital.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && onChangeLayer && (
            <div className="px-4 py-3">
              <div className="space-y-4">
                {/* Map Layer Selection */}
                <div>
                  <div className="text-sm font-medium mb-2">Map Layer</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      { value: 'satellite' as MapLayer, label: 'Satellite (ESRI)' },
                      { value: 'mapbox-satellite' as MapLayer, label: 'Mapbox Satellite' },
                      { value: 'terrain-3d' as MapLayer, label: '3D Terrain' },
                      { value: 'terrain' as MapLayer, label: 'Terrain Map' },
                      { value: 'topo' as MapLayer, label: 'OpenTopoMap' },
                      { value: 'usgs' as MapLayer, label: 'USGS Topo' },
                      { value: 'street' as MapLayer, label: 'Street Map' },
                    ].map((layer) => (
                      <button
                        key={layer.value}
                        onClick={() => onChangeLayer(layer.value)}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          mapLayer === layer.value
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                      >
                        {layer.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid Settings */}
                {onToggleGridUnit && (
                  <div>
                    <div className="text-sm font-medium mb-2">Grid Settings</div>
                    <div className="space-y-2">
                      <button
                        onClick={onToggleGridUnit}
                        className="w-full px-3 py-2 rounded-lg text-xs bg-muted/50 hover:bg-muted transition-colors text-left"
                      >
                        <div className="font-medium">Units: {gridUnit === 'imperial' ? 'Imperial (ft)' : 'Metric (m)'}</div>
                        <div className="text-xs text-muted-foreground mt-1">Tap to toggle</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Grid Density */}
                {onChangeGridDensity && (
                  <div>
                    <div className="text-sm font-medium mb-2">Grid Density</div>
                    <div className="grid grid-cols-5 gap-2">
                      {(['auto', 'sparse', 'normal', 'dense', 'off'] as GridDensity[]).map((density) => (
                        <button
                          key={density}
                          onClick={() => onChangeGridDensity(density)}
                          className={`px-3 py-2 rounded-lg text-xs transition-colors capitalize ${
                            gridDensity === density
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          {density}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'timemachine' && currentYear !== undefined && onYearChange && (
            <div className="px-4 py-3">
              <div className="space-y-4">
                {/* Year Slider */}
                <div>
                  <div className="text-sm font-medium mb-2">Projection Year: {currentYear}</div>
                  <input
                    type="range"
                    min={minYear}
                    max={maxYear}
                    value={currentYear}
                    onChange={(e) => onYearChange(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{minYear}</span>
                    <span>{maxYear}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={isPlaying ? "default" : "outline"}
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onYearChange(minYear)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  {onCloseTimeMachine && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onCloseTimeMachine}
                      className="ml-auto"
                    >
                      Close
                    </Button>
                  )}
                </div>

                {/* Info */}
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <p>Watch your farm grow over time! Use the slider or playback controls to see how plants mature based on their growth rates.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'legend' && (
            <div className="px-4 py-3">

              {/* Map Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Farm Boundary */}
                <div>
                  <div className="text-muted-foreground font-medium mb-2 text-xs">
                    Farm Boundary
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-0.5 bg-background border-2 border-purple-600 rounded"></div>
                    <span className="text-[10px] text-muted-foreground">Purple</span>
                  </div>
                </div>

                {/* Map Layer Info */}
                <div>
                  <div className="text-muted-foreground font-medium mb-2 text-xs">
                    Map Layer
                  </div>
                  <div className="text-xs">
                    {mapLayer === 'satellite' && 'Satellite (ESRI)'}
                    {mapLayer === 'mapbox-satellite' && 'Mapbox Satellite'}
                    {mapLayer === 'terrain-3d' && '3D Terrain'}
                    {mapLayer === 'terrain' && 'Terrain Map'}
                    {mapLayer === 'topo' && 'OpenTopoMap'}
                    {mapLayer === 'usgs' && 'USGS Topo'}
                    {mapLayer === 'street' && 'Street Map'}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Grid: {gridUnit === 'imperial' ? '50 ft' : '25 m'}
                  </div>
                </div>

                {/* Planting Stats */}
                <div>
                  <div className="text-muted-foreground font-medium mb-2 text-xs">
                    Plantings
                  </div>
                  <div className="text-xs">
                    Total: {plantings.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

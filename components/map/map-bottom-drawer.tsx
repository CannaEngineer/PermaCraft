"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Filter, Map, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FarmVitals } from "@/components/farm/farm-vitals";

interface MapBottomDrawerProps {
  // Legend props
  mapLayer: "satellite" | "mapbox-satellite" | "terrain-3d" | "terrain" | "topo" | "usgs" | "street";
  gridUnit: "imperial" | "metric";
  zones: any[];
  plantings?: any[];
  isTimeMachineOpen?: boolean;
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
}

type Tab = 'legend' | 'filters' | 'vitals';

export function MapBottomDrawer({
  mapLayer,
  gridUnit,
  zones,
  plantings = [],
  isTimeMachineOpen = false,
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
}: MapBottomDrawerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('filters');

  // Force expand when time machine is open
  const effectiveCollapsed = isCollapsed && !isTimeMachineOpen;

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
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('vitals')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'vitals'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <Activity className="inline h-3 w-3 mr-1" />
              Vitals ({plantings.length})
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
              onClick={() => setActiveTab('legend')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'legend'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <Map className="inline h-3 w-3 mr-1" />
              Legend
            </button>
          </div>
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

          {activeTab === 'legend' && (
            <div className="px-4 py-3">
              {/* Time Machine Controls */}
              {isTimeMachineOpen && currentYear !== undefined && onYearChange && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Time Machine: {currentYear}</div>
                  <input
                    type="range"
                    min={minYear}
                    max={maxYear}
                    value={currentYear}
                    onChange={(e) => onYearChange(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{minYear}</span>
                    <span>{maxYear}</span>
                  </div>
                </div>
              )}

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

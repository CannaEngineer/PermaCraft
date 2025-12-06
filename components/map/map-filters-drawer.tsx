"use client";

import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapFiltersDrawerProps {
  plantingFilters: string[];
  onTogglePlantingFilter: (layer: string) => void;
  vitalFilters: string[];
  onToggleVitalFilter: (vital: string) => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

// Planting layer colors (matches PlantingMarker.tsx)
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

// Vital types for filtering - matches actual database values
const VITAL_TYPES = [
  { value: 'nitrogen_fixer', label: 'Nitrogen Fixers', emoji: '🌿', alts: ['nitrogen_fixing'] },
  { value: 'pollinator_support', label: 'Pollinator Plants', emoji: '🐝', alts: ['pollinator', 'pollinator_attractor'] },
  { value: 'dynamic_accumulator', label: 'Dynamic Accumulators', emoji: '⚡', alts: [] },
  { value: 'wildlife_habitat', label: 'Wildlife Habitat', emoji: '🦋', alts: ['wildlife_food'] },
  { value: 'edible_fruit', label: 'Edible Plants', emoji: '🍎', alts: ['edible_nuts', 'edible'] },
  { value: 'medicinal', label: 'Medicinal', emoji: '💊', alts: [] },
  { value: 'erosion_control', label: 'Erosion Control', emoji: '🌊', alts: ['groundcover'] },
];

export function MapFiltersDrawer({
  plantingFilters,
  onTogglePlantingFilter,
  vitalFilters,
  onToggleVitalFilter,
  isCollapsed = false,
  onToggle,
}: MapFiltersDrawerProps) {
  const activeLayerCount = plantingFilters.length === 0 ? PLANTING_LAYERS.length : plantingFilters.length;
  const activeVitalCount = vitalFilters.length === 0 ? VITAL_TYPES.length : vitalFilters.length;

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border text-xs z-30 transition-all duration-300 ${
        isCollapsed ? 'translate-y-full' : 'translate-y-0'
      }`}
      data-filters-container
      data-collapsed={isCollapsed}
    >
      {/* Peek Tab - Always Visible When Fully Collapsed */}
      {isCollapsed && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-sm font-semibold">
              <Filter className="inline h-4 w-4 mr-1" />
              Filters ▲
            </span>
            <span className="text-xs text-muted-foreground">
              {activeLayerCount} layers • {activeVitalCount} types
            </span>
          </div>
        </div>
      )}

      {/* Toggle Bar */}
      {!isCollapsed && (
        <div
          className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border"
          onClick={onToggle}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <div className="font-semibold text-sm">Filters</div>
            <div className="text-xs text-muted-foreground">
              {activeLayerCount} layers • {activeVitalCount} types
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Hide filters"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Filter Content */}
      <div
        className={`px-4 py-3 ${isCollapsed ? 'hidden' : 'block'}`}
        data-filters-content
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Layer Filters */}
          <div>
            <div className="text-muted-foreground font-medium mb-3 text-xs">
              Filter by Layer
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PLANTING_LAYERS.map((layer) => {
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
              {VITAL_TYPES.map((vital) => {
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
    </div>
  );
}

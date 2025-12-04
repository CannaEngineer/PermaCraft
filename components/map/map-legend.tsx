"use client";

import { ZONE_TYPES, ZONE_TYPE_CATEGORIES } from "@/lib/map/zone-types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapLegendProps {
  mapLayer: "satellite" | "mapbox-satellite" | "terrain-3d" | "terrain" | "topo" | "usgs" | "street";
  gridUnit: "imperial" | "metric";
  zones: any[]; // Array of zones on the map
  plantings?: any[]; // Array of plantings on the map
  isCollapsed?: boolean;
  onToggle?: () => void;
}

// Planting layer colors (matches PlantingMarker.tsx)
const LAYER_COLORS: Record<string, string> = {
  canopy: '#166534',
  understory: '#16a34a',
  shrub: '#22c55e',
  herbaceous: '#84cc16',
  groundcover: '#a3e635',
  vine: '#a855f7',
  root: '#78350f',
  aquatic: '#0284c7'
};

const LAYER_LABELS: Record<string, string> = {
  canopy: 'Canopy',
  understory: 'Understory',
  shrub: 'Shrub',
  herbaceous: 'Herbaceous',
  groundcover: 'Groundcover',
  vine: 'Vine',
  root: 'Root',
  aquatic: 'Aquatic'
};

export function MapLegend({ mapLayer, gridUnit, zones, plantings = [], isCollapsed = false, onToggle }: MapLegendProps) {
  const gridSpacing = gridUnit === "imperial" ? "50 ft" : "25 m";

  const layerNames = {
    satellite: "Satellite Imagery (ESRI)",
    "mapbox-satellite": "Mapbox Satellite",
    "terrain-3d": "3D Terrain",
    terrain: "Terrain Map",
    topo: "OpenTopoMap",
    usgs: "USGS Topographic",
    street: "Street Map",
  };

  // Get unique zone types actually used on the map
  const usedZoneTypes = new Set<string>();
  zones.forEach((zone) => {
    const zoneType = zone.properties?.user_zone_type || zone.zone_type || "other";
    if (zoneType && zoneType !== "other") {
      usedZoneTypes.add(zoneType);
    }
  });

  // Convert to sorted array for display
  const displayZoneTypes = Array.from(usedZoneTypes).sort();

  // Get unique planting layers actually used on the map
  const usedPlantingLayers = new Set<string>();
  plantings.forEach((planting) => {
    if (planting.layer) {
      usedPlantingLayers.add(planting.layer);
    }
  });

  // Convert to sorted array for display (in order of canopy -> aquatic)
  const layerOrder = ['canopy', 'understory', 'shrub', 'herbaceous', 'groundcover', 'vine', 'root', 'aquatic'];
  const displayPlantingLayers = layerOrder.filter(layer => usedPlantingLayers.has(layer));

  if (isCollapsed) {
    return (
      <div
        className="absolute bottom-[140px] md:bottom-4 right-4 bg-white/95 dark:bg-slate-900/95 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors"
        data-legend-container
        data-collapsed={isCollapsed}
        onClick={onToggle}
      >
        <div className="p-2 md:p-3 flex items-center gap-2">
          <ChevronUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Legend
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-[140px] md:bottom-4 right-4 bg-white/95 dark:bg-slate-900/95 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs max-w-[240px] z-10"
      data-legend-container
      data-collapsed={isCollapsed}
    >
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="font-serif font-semibold text-sm text-slate-900 dark:text-slate-100">
          Map Legend
        </div>
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0"
            title="Collapse legend"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div
        className="px-3 pb-3"
        data-legend-content
        style={{ display: isCollapsed ? 'none' : 'block' }}
      >

      {/* Map Layer */}
      <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">
          Map Layer
        </div>
        <div className="text-slate-900 dark:text-slate-100 text-[10px]">
          {layerNames[mapLayer]}
        </div>
      </div>

      {/* Grid System */}
      <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">
          Grid System
        </div>
        <div className="text-slate-900 dark:text-slate-100 text-[10px]">
          {gridSpacing} spacing • A1, B2 labels
        </div>
      </div>

      {/* Farm Boundary */}
      <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">
          Farm Boundary
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-0.5 bg-white border-2 border-purple-600 rounded"></div>
          <span className="text-[9px] text-slate-600 dark:text-slate-400">
            Purple outline
          </span>
        </div>
      </div>

      {/* Zone Colors */}
      <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">
          Zone Types
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {displayZoneTypes.map((type) => {
            const config = ZONE_TYPES[type];
            if (!config) return null;

            return (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm border flex-shrink-0"
                  style={{
                    backgroundColor: config.fillColor,
                    opacity: config.fillOpacity + 0.5,
                    borderColor: config.strokeColor,
                  }}
                />
                <span className="text-[9px] text-slate-700 dark:text-slate-300 truncate">
                  {config.label.replace(/\s*\(.*?\)\s*/g, '')}
                </span>
              </div>
            );
          })}
        </div>
        {displayZoneTypes.length === 0 && (
          <div className="text-[9px] text-slate-500 dark:text-slate-400 italic">
            No zones labeled yet
          </div>
        )}
      </div>

      {/* Plantings */}
      {displayPlantingLayers.length > 0 && (
        <div>
          <div className="text-slate-600 dark:text-slate-400 font-medium mb-1">
            Plantings ({plantings.length})
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {displayPlantingLayers.map((layer) => {
              const count = plantings.filter(p => p.layer === layer).length;
              return (
                <div key={layer} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2 border-white flex-shrink-0 shadow-sm"
                    style={{
                      backgroundColor: LAYER_COLORS[layer],
                    }}
                  />
                  <span className="text-[9px] text-slate-700 dark:text-slate-300 truncate">
                    {LAYER_LABELS[layer]} ({count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

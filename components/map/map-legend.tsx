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

  // Time Machine props (new)
  isTimeMachineOpen?: boolean;
  onCloseTimeMachine?: () => void;
  currentYear?: number;
  onYearChange?: (year: number) => void;
  minYear?: number;
  maxYear?: number;
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

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border text-xs z-20 transition-all duration-300 ${
        isCollapsed ? 'translate-y-full' : 'translate-y-0'
      }`}
      data-legend-container
      data-collapsed={isCollapsed}
    >
      {/* Toggle Bar - Always Visible */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <div className="font-semibold text-sm">Legend</div>
          <div className="text-xs text-muted-foreground">
            {layerNames[mapLayer]} • {gridSpacing}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title={isCollapsed ? "Show legend" : "Hide legend"}
        >
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded Content */}
      <div
        className={`px-4 py-3 ${isCollapsed ? 'hidden' : 'block'}`}
        data-legend-content
      >

        {/* Horizontal Layout for Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Farm Boundary */}
          <div>
            <div className="text-muted-foreground font-medium mb-2 text-xs">
              Farm Boundary
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-0.5 bg-background border-2 border-purple-600 rounded"></div>
              <span className="text-[10px] text-muted-foreground">
                Purple
              </span>
            </div>
          </div>

          {/* Zone Colors */}
          <div>
            <div className="text-muted-foreground font-medium mb-2 text-xs">
              Zone Types
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {displayZoneTypes.map((type) => {
                const config = ZONE_TYPES[type];
                if (!config) return null;

                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm border flex-shrink-0"
                      style={{
                        backgroundColor: config.fillColor,
                        opacity: config.fillOpacity + 0.5,
                        borderColor: config.strokeColor,
                      }}
                    />
                    <span className="text-[10px] truncate">
                      {config.label.replace(/\s*\(.*?\)\s*/g, '')}
                    </span>
                  </div>
                );
              })}
            </div>
            {displayZoneTypes.length === 0 && (
              <div className="text-[10px] text-muted-foreground italic">
                No zones yet
              </div>
            )}
          </div>

          {/* Plantings */}
          <div className="md:col-span-2">
            <div className="text-muted-foreground font-medium mb-2 text-xs">
              Plantings ({plantings.length})
            </div>
            {displayPlantingLayers.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5">
                {displayPlantingLayers.map((layer) => {
                  const count = plantings.filter(p => p.layer === layer).length;
                  return (
                    <div key={layer} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border-2 border-background flex-shrink-0 shadow-sm"
                        style={{
                          backgroundColor: LAYER_COLORS[layer],
                        }}
                      />
                      <span className="text-[10px] truncate">
                        {LAYER_LABELS[layer]} ({count})
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground italic">
                No plantings yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { Settings, ChevronUp, Layers as LayersIcon, Grid, Filter, Leaf, Square, MessageSquare, Clock } from 'lucide-react';
import { FAB } from '@/components/ui/fab';
import type { FABAction } from '@/components/ui/fab';

type MapLayer = "satellite" | "mapbox-satellite" | "street" | "terrain" | "topo" | "usgs" | "terrain-3d";

interface MapControlsSheetProps {
  mapLayer: string;
  onChangeLayer: (layer: MapLayer) => void;
  gridUnit: 'imperial' | 'metric';
  onToggleGridUnit: () => void;
  gridDensity: string;
  onChangeGridDensity: (density: string) => void;
  plantingFilters: string[];
  onTogglePlantingFilter: (layer: string) => void;
  onAddPlant?: () => void;
  onDrawZone?: () => void;
  onCreatePost?: () => void;
  onOpenTimeMachine?: () => void;
  hasPlantings?: boolean;
  className?: string;
}

const LAYER_OPTIONS: { value: MapLayer; label: string }[] = [
  { value: 'satellite', label: 'Satellite (ESRI)' },
  { value: 'mapbox-satellite', label: 'Mapbox Satellite' },
  { value: 'terrain-3d', label: '3D Terrain' },
  { value: 'terrain', label: 'Terrain Map' },
  { value: 'topo', label: 'OpenTopoMap' },
  { value: 'usgs', label: 'USGS Topo' },
  { value: 'street', label: 'Street Map' },
];

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

/**
 * Map Controls Bottom Sheet
 *
 * Expandable FAB that consolidates all map controls and actions.
 * Primary actions (Plant, Zone, Post) expand on click.
 * Settings action opens the full controls drawer.
 *
 * Visible on both mobile and desktop for consistent UX.
 */
export function MapControlsSheet({
  mapLayer,
  onChangeLayer,
  gridUnit,
  onToggleGridUnit,
  gridDensity,
  onChangeGridDensity,
  plantingFilters,
  onTogglePlantingFilter,
  onAddPlant,
  onDrawZone,
  onCreatePost,
  onOpenTimeMachine,
  hasPlantings = false,
  className = '',
}: MapControlsSheetProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Build FAB actions array
  const fabActions: FABAction[] = [];

  if (onAddPlant) {
    fabActions.push({
      icon: <Leaf className="h-5 w-5" />,
      label: "Add Plant",
      onClick: onAddPlant,
      color: "bg-green-600 text-white"
    });
  }

  // Draw Zone removed - use polygon tool in map controls instead

  if (onCreatePost) {
    fabActions.push({
      icon: <MessageSquare className="h-5 w-5" />,
      label: "Create Post",
      onClick: onCreatePost,
      color: "bg-purple-600 text-white"
    });
  }

  // Only show Time Machine if there are plantings
  if (onOpenTimeMachine && hasPlantings) {
    fabActions.push({
      icon: <Clock className="h-5 w-5" />,
      label: "Time Machine",
      onClick: onOpenTimeMachine,
      color: "bg-orange-600 text-white"
    });
  }

  return (
    <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="bg-card flex flex-col rounded-t-xl h-[70vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
          {/* Handle */}
          <div className="flex-shrink-0 p-4 border-b border-border">
            <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-4" />
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Map Tools</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Layer Controls Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <LayersIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  Map Layers
                </h3>
              </div>
              <div className="space-y-2">
                {LAYER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onChangeLayer(option.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                      mapLayer === option.value
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Grid Controls Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Grid className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  Grid Settings
                </h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={onToggleGridUnit}
                  className="w-full px-4 py-3 rounded-lg text-sm bg-muted/50 hover:bg-muted transition-colors text-left"
                >
                  <div className="font-medium">Units: {gridUnit === 'imperial' ? 'Imperial (ft)' : 'Metric (m)'}</div>
                  <div className="text-xs text-muted-foreground mt-1">Tap to toggle</div>
                </button>
                <div>
                  <div className="text-sm font-medium mb-2">Grid Density</div>
                  <div className="space-y-2">
                    {['auto', 'sparse', 'normal', 'dense'].map((density) => (
                      <button
                        key={density}
                        onClick={() => onChangeGridDensity(density)}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors capitalize ${
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
              </div>
            </section>

            {/* Planting Filters Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide">
                  Filter by Layer
                </h3>
              </div>
              <div className="space-y-2">
                {PLANTING_LAYERS.map((layer) => {
                  const isActive = plantingFilters.length === 0 || plantingFilters.includes(layer.value);
                  return (
                    <button
                      key={layer.value}
                      onClick={() => onTogglePlantingFilter(layer.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-muted/50'
                          : 'bg-muted/20 opacity-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded ${layer.color}`} />
                      <span className={isActive ? 'font-medium' : ''}>{layer.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

          </div>
        </Drawer.Content>
      </Drawer.Portal>

      {/* Expandable FAB with Settings trigger at the end */}
      <FAB
        ariaLabel="Map actions and settings"
        actions={[
          ...fabActions,
          {
            icon: <Settings className="h-5 w-5" />,
            label: "Map Settings",
            onClick: () => setIsDrawerOpen(true),
            color: "bg-gray-600 text-white"
          }
        ]}
        className={className}
      />
    </Drawer.Root>
  );
}

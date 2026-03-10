"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { Layers, Grid, Minimize2, ChevronRight, Keyboard } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayerPanel } from "@/components/layers/layer-panel";

interface MapControlPanelProps {
  farmId: string;
  currentLayer: string;
  onLayerChange: (layer: string) => void;
  gridUnit: 'imperial' | 'metric';
  onGridUnitChange: (unit: 'imperial' | 'metric') => void;
  gridDensity: string;
  onGridDensityChange: (density: string) => void;
  terrainEnabled: boolean;
  onTerrainToggle: () => void;
  onLayerVisibilityChange?: (layerIds: string[]) => void;
}

/**
 * Simplified Map Control Panel — 2 sections + keyboard shortcut tooltip.
 *
 * Before: 5 accordion sections (Map Layers, Grid Settings, Map Options, Design Layers, Help)
 * After:  2 sections (Layers, Grid & Options) + keyboard shortcut tooltip button
 *
 * Changes:
 *   - Merged "Map Layers" and "Design Layers" into one "Layers" section
 *   - Merged "Map Options" (single 3D toggle) into "Grid & Options"
 *   - Moved "Help" from a full section to a compact tooltip (always accessible, zero clicks)
 *   - Reduced cognitive load: users scan 2 section headers instead of 5
 */

type PanelSection = 'layers' | 'grid';

export function MapControlPanel({
  farmId,
  currentLayer,
  onLayerChange,
  gridUnit,
  onGridUnitChange,
  gridDensity,
  onGridDensityChange,
  terrainEnabled,
  onTerrainToggle,
  onLayerVisibilityChange,
}: MapControlPanelProps) {
  const { controlPanelMinimized, controlPanelSection, setControlPanelSection, toggleControlPanel } = useImmersiveMapUI();

  const toggleSection = (section: PanelSection) => {
    setControlPanelSection(controlPanelSection === section ? null : section);
  };

  const [showShortcuts, setShowShortcuts] = useState(false);

  if (controlPanelMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="fixed top-20 right-4 z-30"
      >
        <Button
          onClick={toggleControlPanel}
          size="icon"
          className="glass-panel rounded-full h-14 w-14"
        >
          <Layers className="h-5 w-5" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed top-20 right-4 z-30 glass-panel rounded-xl p-3 w-64 max-w-[calc(100vw-2rem)]"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
        <h3 className="text-sm font-semibold">Map Controls</h3>
        <div className="flex items-center gap-1">
          {/* Keyboard Shortcuts — compact popover instead of full accordion section */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowShortcuts(!showShortcuts)}
              title="Keyboard shortcuts"
            >
              <Keyboard className="h-3 w-3" />
            </Button>
            <AnimatePresence>
              {showShortcuts && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 text-xs space-y-1 z-50 whitespace-nowrap"
                >
                  <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">C</kbd> Toggle chat</p>
                  <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">D</kbd> Drawing mode</p>
                  <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">Esc</kbd> Close panel</p>
                  <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">Space</kbd> Pan map</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleControlPanel}
            className="h-6 w-6"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Layers Section — combines Map Layers + Design Layers */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection('layers')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="text-sm font-medium">Layers</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              controlPanelSection === 'layers' ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {controlPanelSection === 'layers' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-4 pr-2 py-2 space-y-3">
                {/* Base Map */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Base Map</label>
                  <div className="space-y-0.5">
                    {[
                      { value: 'satellite', label: 'Satellite' },
                      { value: 'terrain', label: 'Terrain' },
                      { value: 'topo', label: 'OpenTopoMap' },
                      { value: 'usgs', label: 'USGS Topo' },
                      { value: 'street', label: 'Street' },
                    ].map((layer) => (
                      <button
                        key={layer.value}
                        onClick={() => onLayerChange(layer.value)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          currentLayer === layer.value
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'hover:bg-accent/50'
                        }`}
                      >
                        {layer.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Design Layers */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Design Layers</label>
                  <LayerPanel
                    farmId={farmId}
                    onLayerVisibilityChange={onLayerVisibilityChange}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid & Options Section — combines Grid Settings + Map Options */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection('grid')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            <span className="text-sm font-medium">Grid & Options</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              controlPanelSection === 'grid' ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {controlPanelSection === 'grid' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-4 pr-2 py-2 space-y-3">
                {/* Units */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Units</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onGridUnitChange('imperial')}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        gridUnit === 'imperial'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/50 hover:bg-accent'
                      }`}
                    >
                      Imperial
                    </button>
                    <button
                      onClick={() => onGridUnitChange('metric')}
                      className={`flex-1 px-2 py-1 text-xs rounded ${
                        gridUnit === 'metric'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent/50 hover:bg-accent'
                      }`}
                    >
                      Metric
                    </button>
                  </div>
                </div>

                {/* Density */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Density</label>
                  <select
                    value={gridDensity}
                    onChange={(e) => onGridDensityChange(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded bg-accent/50 border border-border/30"
                  >
                    <option value="auto">Auto</option>
                    <option value="sparse">Sparse</option>
                    <option value="normal">Normal</option>
                    <option value="dense">Dense</option>
                  </select>
                </div>

                {/* 3D Terrain toggle */}
                <div>
                  <label className="flex items-center cursor-pointer px-1 py-1 rounded text-sm hover:bg-accent/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={terrainEnabled}
                      onChange={onTerrainToggle}
                      className="mr-2"
                    />
                    3D Terrain
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

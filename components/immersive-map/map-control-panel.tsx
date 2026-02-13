"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { Layers, Grid, Settings, HelpCircle, ChevronRight, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MapControlPanelProps {
  currentLayer: string;
  onLayerChange: (layer: string) => void;
  gridUnit: 'imperial' | 'metric';
  onGridUnitChange: (unit: 'imperial' | 'metric') => void;
  gridDensity: string;
  onGridDensityChange: (density: string) => void;
  terrainEnabled: boolean;
  onTerrainToggle: () => void;
}

type PanelSection = 'layers' | 'grid' | 'options' | 'help';

export function MapControlPanel({
  currentLayer,
  onLayerChange,
  gridUnit,
  onGridUnitChange,
  gridDensity,
  onGridDensityChange,
  terrainEnabled,
  onTerrainToggle,
}: MapControlPanelProps) {
  const { controlPanelMinimized, controlPanelSection, setControlPanelSection, toggleControlPanel } = useImmersiveMapUI();

  const toggleSection = (section: PanelSection) => {
    setControlPanelSection(controlPanelSection === section ? null : section);
  };

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
      className="fixed top-20 right-4 z-30 glass-panel rounded-xl p-3 w-64"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/30">
        <h3 className="text-sm font-semibold">Map Controls</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleControlPanel}
          className="h-6 w-6"
        >
          <Minimize2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Layers Section */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection('layers')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="text-sm font-medium">Map Layers</span>
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
              <div className="pl-8 pr-2 py-2 space-y-1">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid Section */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection('grid')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            <span className="text-sm font-medium">Grid Settings</span>
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
              <div className="pl-8 pr-2 py-2 space-y-2">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Options Section */}
      <div className="mb-2">
        <button
          onClick={() => toggleSection('options')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Map Options</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              controlPanelSection === 'options' ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {controlPanelSection === 'options' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-8 pr-2 py-2">
                <button
                  onClick={onTerrainToggle}
                  className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors"
                >
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={terrainEnabled}
                      onChange={onTerrainToggle}
                      className="mr-2"
                    />
                    3D Terrain
                  </label>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help Section */}
      <div>
        <button
          onClick={() => toggleSection('help')}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Help</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 transition-transform ${
              controlPanelSection === 'help' ? 'rotate-90' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {controlPanelSection === 'help' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pl-8 pr-2 py-2 text-xs text-muted-foreground space-y-1">
                <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">C</kbd> Toggle chat</p>
                <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">D</kbd> Drawing mode</p>
                <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">Esc</kbd> Close panel</p>
                <p><kbd className="px-1 py-0.5 bg-accent rounded text-xs">Space</kbd> Pan map</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

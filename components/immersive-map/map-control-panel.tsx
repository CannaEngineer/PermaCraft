"use client";

import { useImmersiveMapUI } from "@/contexts/immersive-map-ui-context";
import { Button } from "@/components/ui/button";
import { Layers, Minimize2, Keyboard } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayerPanel } from "@/components/layers/layer-panel";

interface MapControlPanelProps {
  farmId: string;
  currentLayer: string;
  onLayerChange: (layer: string) => void;
  onLayerVisibilityChange?: (layerIds: string[]) => void;
}

/**
 * Map Control Panel — simplified to a single Layers panel.
 *
 * Removed: Grid Density, Units, 3D Terrain controls.
 * Grid density defaults to "auto" (zoom-adaptive). Units default to imperial.
 * These are engineering controls that don't help farmers design their land.
 */

export function MapControlPanel({
  farmId,
  currentLayer,
  onLayerChange,
  onLayerVisibilityChange,
}: MapControlPanelProps) {
  const { controlPanelMinimized, toggleControlPanel } = useImmersiveMapUI();
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
          variant="secondary"
          className="glass-panel rounded-xl h-10 w-10 shadow-md"
          title="Map Controls"
        >
          <Layers className="h-4 w-4" />
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
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Layers</h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Keyboard Shortcuts — compact popover */}
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

      {/* Base Map — directly visible, no accordion */}
      <div className="space-y-3">
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
  );
}

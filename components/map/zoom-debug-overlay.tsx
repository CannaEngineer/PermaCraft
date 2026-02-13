"use client";

import { useEffect, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import {
  getSatelliteOpacity,
  getGridThickness,
  getZoneBoundaryThickness,
  shouldShowFineGrid,
  getSnapStrength,
  isPrecisionMode,
  ZOOM_THRESHOLDS,
} from '@/lib/map/zoom-enhancements';

interface ZoomDebugOverlayProps {
  map: maplibregl.Map | null;
  snapEnabled?: boolean;
}

export function ZoomDebugOverlay({ map, snapEnabled = true }: ZoomDebugOverlayProps) {
  const [zoom, setZoom] = useState(0);
  const [tileZoom, setTileZoom] = useState(0);

  useEffect(() => {
    if (!map) return;

    const updateZoom = () => {
      const currentZoom = map.getZoom();
      setZoom(currentZoom);

      // Get tile zoom from one of the tile layers
      const satelliteLayer = map.getLayer('satellite');
      if (satelliteLayer) {
        // MapLibre doesn't expose tile zoom directly, but we can infer it
        // For now, just show the clamped value
        setTileZoom(Math.min(currentZoom, ZOOM_THRESHOLDS.TILE_MAX));
      }
    };

    map.on('zoom', updateZoom);
    map.on('zoomend', updateZoom);
    updateZoom();

    return () => {
      map.off('zoom', updateZoom);
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  if (!map) return null;

  const satOpacity = getSatelliteOpacity(zoom);
  const gridThickness = getGridThickness(zoom);
  const zoneBoundaryThickness = getZoneBoundaryThickness(zoom);
  const fineGrid = shouldShowFineGrid(zoom);
  const snapStrength = getSnapStrength(zoom, false);
  const snapStrengthTouch = getSnapStrength(zoom, true);
  const precisionMode = isPrecisionMode(zoom);

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-white p-4 rounded-lg font-mono text-xs space-y-1 min-w-[300px]">
      <div className="text-sm font-bold mb-2 border-b border-white/20 pb-1">
        🔍 Zoom Debug Overlay
      </div>

      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span className="text-gray-400">Current Zoom:</span>
          <span className="font-bold text-green-400">{zoom.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Tile Zoom:</span>
          <span className={tileZoom < zoom ? "text-yellow-400" : "text-green-400"}>
            {tileZoom.toFixed(2)} {tileZoom < zoom ? "(LOCKED)" : ""}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Precision Mode:</span>
          <span className={precisionMode ? "text-green-400" : "text-gray-500"}>
            {precisionMode ? "✓ ACTIVE" : "✗ Inactive"}
          </span>
        </div>
      </div>

      <div className="border-t border-white/20 pt-2 mt-2 space-y-0.5">
        <div className="text-xs text-gray-400 mb-1">Visual Enhancements:</div>

        <div className="flex justify-between">
          <span className="text-gray-400">Satellite Opacity:</span>
          <span>{(satOpacity * 100).toFixed(0)}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Grid Thickness:</span>
          <span>{gridThickness.toFixed(1)}px</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Zone Boundaries:</span>
          <span>{zoneBoundaryThickness.toFixed(1)}px</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Fine Grid:</span>
          <span className={fineGrid ? "text-green-400" : "text-gray-500"}>
            {fineGrid ? "✓ 10ft/5m" : "✗ 50ft/25m"}
          </span>
        </div>
      </div>

      <div className="border-t border-white/20 pt-2 mt-2 space-y-0.5">
        <div className="text-xs text-gray-400 mb-1">Snap-to-Grid:</div>

        <div className="flex justify-between">
          <span className="text-gray-400">Status:</span>
          <span className={snapEnabled && snapStrength > 0 ? "text-green-400" : "text-gray-500"}>
            {snapEnabled && snapStrength > 0 ? "✓ Enabled" : "✗ Disabled"}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Snap Radius (desktop):</span>
          <span>{snapStrength.toFixed(0)}px</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Snap Radius (touch):</span>
          <span>{snapStrengthTouch.toFixed(0)}px</span>
        </div>
      </div>

      <div className="border-t border-white/20 pt-2 mt-2 space-y-0.5">
        <div className="text-xs text-gray-400 mb-1">Zoom Thresholds:</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
          <span className={zoom > ZOOM_THRESHOLDS.TILE_MAX ? "text-yellow-400" : "text-gray-500"}>
            Tile Max: {ZOOM_THRESHOLDS.TILE_MAX}
          </span>
          <span className={zoom > ZOOM_THRESHOLDS.FADE_START ? "text-yellow-400" : "text-gray-500"}>
            Fade Start: {ZOOM_THRESHOLDS.FADE_START}
          </span>
          <span className={zoom >= ZOOM_THRESHOLDS.FINE_GRID ? "text-yellow-400" : "text-gray-500"}>
            Fine Grid: {ZOOM_THRESHOLDS.FINE_GRID}
          </span>
          <span className={zoom >= ZOOM_THRESHOLDS.MAX_ZOOM ? "text-yellow-400" : "text-gray-500"}>
            Max Zoom: {ZOOM_THRESHOLDS.MAX_ZOOM}
          </span>
        </div>
      </div>

      <div className="border-t border-white/20 pt-2 mt-2">
        <div className="text-[10px] text-gray-500">
          Press S to toggle snap • Hold Shift to disable
        </div>
      </div>
    </div>
  );
}

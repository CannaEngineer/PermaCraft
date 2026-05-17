"use client";

import { useRef } from 'react';
import type maplibregl from 'maplibre-gl';

interface MeasurementOverlayProps {
  map: maplibregl.Map | null;
  enabled: boolean;
  unit: 'imperial' | 'metric';
}

export function MeasurementOverlay({ enabled }: MeasurementOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  if (!enabled) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Measurement rendering placeholder — event listeners will be added
          when distance/area display is implemented */}
    </svg>
  );
}

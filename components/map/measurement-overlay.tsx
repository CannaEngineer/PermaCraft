"use client";

import { useEffect, useState, useRef } from 'react';
import type maplibregl from 'maplibre-gl';

interface MeasurementOverlayProps {
  map: maplibregl.Map | null;
  enabled: boolean;
  unit: 'imperial' | 'metric';
}

interface Measurement {
  id: string;
  start: { lng: number; lat: number };
  end: { lng: number; lat: number };
  distance: number;
}

export function MeasurementOverlay({ map, enabled, unit }: MeasurementOverlayProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  // Calculate distance between two points
  const calculateDistance = (
    start: { lng: number; lat: number },
    end: { lng: number; lat: number }
  ): number => {
    // Haversine formula
    const R = unit === 'imperial' ? 20902231 : 6371000; // feet or meters
    const lat1 = start.lat * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    const dLat = (end.lat - start.lat) * Math.PI / 180;
    const dLng = (end.lng - start.lng) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Format distance for display
  const formatDistance = (distance: number): string => {
    if (unit === 'imperial') {
      if (distance < 3) return `${Math.round(distance * 12)}"`;
      return `${Math.round(distance * 10) / 10}'`;
    } else {
      if (distance < 1) return `${Math.round(distance * 100)} cm`;
      return `${Math.round(distance * 10) / 10} m`;
    }
  };

  // Render measurements on SVG overlay
  useEffect(() => {
    if (!map || !svgRef.current || !enabled) return;

    const updateOverlay = () => {
      // This will be expanded in future tasks to show:
      // - Distance measurements while drawing
      // - Area measurements on hover
      // - Spacing guides for plantings
    };

    map.on('move', updateOverlay);
    map.on('zoom', updateOverlay);
    updateOverlay();

    return () => {
      map.off('move', updateOverlay);
      map.off('zoom', updateOverlay);
    };
  }, [map, enabled, measurements]);

  if (!enabled) return null;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Measurements will be rendered here */}
    </svg>
  );
}

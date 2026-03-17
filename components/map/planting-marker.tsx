'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { Planting } from '@/lib/db/schema';

interface PlantingMarkerProps {
  planting: any; // Planting with species data joined
  map: maplibregl.Map;
  currentYear?: number;
  onClick?: (planting: any) => void;
}

import { PLANTING_LAYER_COLORS } from '@/lib/design/design-system';

const LAYER_COLORS = PLANTING_LAYER_COLORS;

export function PlantingMarker({ planting, map, currentYear, onClick }: PlantingMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(map.getZoom());

  // Listen for zoom changes
  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoom', onZoom);
    return () => {
      map.off('zoom', onZoom);
    };
  }, [map]);

  // Calculate size based on growth and map scale
  const calculateSize = (year: number) => {
    const plantedYear = planting.planted_year || year;
    const yearsSincePlanting = year - plantedYear;
    const yearsToMaturity = planting.years_to_maturity || 10;
    const growthFraction = Math.max(0, Math.min(yearsSincePlanting / yearsToMaturity, 1));

    // Sigmoid growth curve
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-8 * (x - 0.5)));
    const sizeFraction = sigmoid(growthFraction);

    // Calculate current width in feet based on growth
    const matureWidth = planting.mature_width_ft || 10;
    const currentWidthFeet = matureWidth * sizeFraction;

    // Convert feet to meters
    const currentWidthMeters = currentWidthFeet * 0.3048;

    // Calculate meters per pixel at current zoom and latitude
    // Formula: metersPerPixel = (156543.03392 * cos(lat)) / (2 ^ zoom)
    const currentZoom = zoom;
    const lat = planting.lat;
    const metersPerPixel = (156543.03392 * Math.cos(lat * Math.PI / 180)) / Math.pow(2, currentZoom);

    // Convert width in meters to pixels (diameter)
    const diameterPixels = (currentWidthMeters / metersPerPixel) * 2.5;

    // Ensure minimum visible size
    return Math.max(14, diameterPixels);
  };

  // Initialize marker once
  useEffect(() => {
    // Create marker dot
    const el = document.createElement('div');
    el.className = 'planting-marker';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = LAYER_COLORS[planting.layer] || '#16a34a';
    el.style.border = '2.5px solid white';
    el.style.cursor = 'pointer';
    el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)';
    el.style.transition = 'width 0.3s ease, height 0.3s ease';
    el.style.transform = 'translate(-50%, -50%)'; // Center the marker

    // Set initial size
    const initialSize = calculateSize(currentYear || planting.current_year);
    el.style.width = `${initialSize}px`;
    el.style.height = `${initialSize}px`;

    if (onClick) {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick(planting);
      });
    } else {
      // When no onClick handler, let clicks pass through to the map
      // so the unified feature detection in handleMapClick can pick up plantings
      el.style.pointerEvents = 'none';
    }

    elRef.current = el;

    markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([planting.lng, planting.lat])
      .addTo(map);

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [planting.id, map, onClick]);

  // Update marker size when currentYear or zoom changes
  useEffect(() => {
    if (!elRef.current) return;

    const newSize = calculateSize(currentYear || planting.current_year);
    elRef.current.style.width = `${newSize}px`;
    elRef.current.style.height = `${newSize}px`;

  }, [currentYear, planting.current_year, zoom]);

  return null;
}

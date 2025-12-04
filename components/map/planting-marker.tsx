'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { Planting } from '@/lib/db/schema';

interface PlantingMarkerProps {
  planting: any; // Planting with species data joined
  map: maplibregl.Map;
  currentYear?: number;
  onClick?: (planting: any) => void;
}

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

export function PlantingMarker({ planting, map, currentYear, onClick }: PlantingMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const layerId = `planting-circle-${planting.id}`;
  const sourceId = `planting-${planting.id}`;

  // Initialize marker and layer once
  useEffect(() => {
    // Create marker dot
    const el = document.createElement('div');
    el.className = 'planting-marker';
    el.style.width = '12px';
    el.style.height = '12px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = LAYER_COLORS[planting.layer] || '#16a34a';
    el.style.border = '2px solid white';
    el.style.cursor = 'pointer';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

    if (onClick) {
      el.addEventListener('click', () => onClick(planting));
    }

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([planting.lng, planting.lat])
      .addTo(map);

    // Add circle layer for canopy visualization
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [planting.lng, planting.lat]
          },
          properties: {}
        }
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 0, // Will be updated by the growth effect
          'circle-radius-transition': {
            duration: 600, // 600ms smooth transition
            delay: 0
          },
          'circle-color': LAYER_COLORS[planting.layer] || '#16a34a',
          'circle-opacity': 0.2,
          'circle-stroke-width': 1,
          'circle-stroke-color': LAYER_COLORS[planting.layer] || '#16a34a',
          'circle-stroke-opacity': 0.4
        }
      });
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [planting.id, map, onClick]);

  // Update circle size when currentYear changes
  useEffect(() => {
    if (!map.getLayer(layerId)) return;

    // Calculate current size based on years since planting
    const yearsSincePlanting = (currentYear || planting.current_year) - planting.planted_year;
    const yearsToMaturity = planting.years_to_maturity || 10;
    const growthFraction = Math.max(0, Math.min(yearsSincePlanting / yearsToMaturity, 1));

    // Sigmoid growth curve
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-8 * (x - 0.5)));
    const sizeFraction = sigmoid(growthFraction);

    const currentWidth = (planting.mature_width_ft || 10) * sizeFraction;
    const radiusMeters = (currentWidth / 2) * 0.3048; // feet to meters

    // Calculate radius in pixels at different zoom levels
    // Use MapLibre's metersToPixelsAtLatitude to get accurate scaling
    const metersPerPixelAtZoom15 = 156543.03392 * Math.cos(planting.lat * Math.PI / 180) / Math.pow(2, 15);
    const radiusPixelsAtZoom15 = radiusMeters / metersPerPixelAtZoom15;

    // Update the circle radius with zoom interpolation
    map.setPaintProperty(layerId, 'circle-radius', [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, radiusPixelsAtZoom15 / 32,  // Smaller at low zoom
      15, radiusPixelsAtZoom15,        // Base size at zoom 15
      20, radiusPixelsAtZoom15 * 32    // Larger at high zoom
    ] as any);

  }, [currentYear, planting.planted_year, planting.current_year, planting.years_to_maturity, planting.mature_width_ft, planting.lat, map, layerId]);

  return null;
}

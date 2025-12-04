'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    // Calculate current size based on years since planting
    const yearsSincePlanting = (currentYear || planting.current_year) - planting.planted_year;
    const yearsToMaturity = planting.years_to_maturity || 10;
    const growthFraction = Math.min(yearsSincePlanting / yearsToMaturity, 1);

    // Sigmoid growth curve
    const sigmoid = (x: number) => 1 / (1 + Math.exp(-8 * (x - 0.5)));
    const sizeFraction = sigmoid(growthFraction);

    const currentWidth = (planting.mature_width_ft || 10) * sizeFraction;
    const radiusMeters = (currentWidth / 2) * 0.3048; // feet to meters

    // Create circle element
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

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([planting.lng, planting.lat])
      .addTo(map);

    // Add circle for mature size visualization
    const sourceId = `planting-${planting.id}`;

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

      map.addLayer({
        id: `planting-circle-${planting.id}`,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0, 0,
            22, radiusMeters * 10
          ] as any,
          'circle-color': LAYER_COLORS[planting.layer] || '#16a34a',
          'circle-opacity': 0.2,
          'circle-stroke-width': 1,
          'circle-stroke-color': LAYER_COLORS[planting.layer] || '#16a34a',
          'circle-stroke-opacity': 0.4
        }
      });
    }

    return () => {
      marker.remove();
      if (map.getLayer(`planting-circle-${planting.id}`)) {
        map.removeLayer(`planting-circle-${planting.id}`);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [planting, map, currentYear, onClick]);

  return null;
}

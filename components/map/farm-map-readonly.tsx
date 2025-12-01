'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Farm } from '@/lib/db/schema';

interface FarmMapReadonlyProps {
  farm: Farm;
}

export function FarmMapReadonly({ farm }: FarmMapReadonlyProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Initialize map centered on farm
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [farm.center_lng, farm.center_lat],
      zoom: 16,
      attributionControl: false,
    });

    // Add attribution control
    map.current.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    // Add navigation controls (zoom in/out)
    map.current.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
      }),
      'top-right'
    );

    // Calculate farm bounds from acres
    // Approximate: 1 acre ≈ 4047 m² ≈ 63.6m × 63.6m square
    const acres = farm.acres || 1; // Default to 1 acre if not set
    const metersPerSide = Math.sqrt(acres * 4047);
    const latOffset = metersPerSide / 111320; // 1 degree latitude ≈ 111.32 km
    const lngOffset = metersPerSide / (111320 * Math.cos(farm.center_lat * Math.PI / 180));

    // Create simple rectangular boundary
    const boundary: [number, number][] = [
      [farm.center_lng - lngOffset / 2, farm.center_lat - latOffset / 2],
      [farm.center_lng + lngOffset / 2, farm.center_lat - latOffset / 2],
      [farm.center_lng + lngOffset / 2, farm.center_lat + latOffset / 2],
      [farm.center_lng - lngOffset / 2, farm.center_lat + latOffset / 2],
      [farm.center_lng - lngOffset / 2, farm.center_lat - latOffset / 2], // Close the loop
    ];

    // Wait for map to load
    map.current.on('load', () => {
      if (!map.current) return;

      // Add farm boundary outline
      map.current.addSource('farm-boundary', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [boundary],
          },
        },
      });

      // Add fill layer (semi-transparent)
      map.current.addLayer({
        id: 'farm-boundary-fill',
        type: 'fill',
        source: 'farm-boundary',
        paint: {
          'fill-color': '#22c55e',
          'fill-opacity': 0.1,
        },
      });

      // Add outline layer
      map.current.addLayer({
        id: 'farm-boundary-outline',
        type: 'line',
        source: 'farm-boundary',
        paint: {
          'line-color': '#22c55e',
          'line-width': 3,
        },
      });

      // Fit map to boundary
      const coordinates = boundary;
      const bounds = coordinates.reduce(
        (bounds, coord) => bounds.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 16,
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [farm]);

  return (
    <div className="relative h-[400px] w-full rounded-lg overflow-hidden border">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Map info overlay */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur rounded-lg px-3 py-2 text-sm shadow-lg">
        <p className="font-semibold">{farm.acres || 1} acres</p>
        {farm.climate_zone && (
          <p className="text-xs text-muted-foreground">Zone {farm.climate_zone}</p>
        )}
      </div>
    </div>
  );
}

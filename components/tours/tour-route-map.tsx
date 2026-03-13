'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface RouteStop {
  id: string;
  title: string;
  lat: number | null;
  lng: number | null;
  stop_type: string;
}

interface TourRouteMapProps {
  stops: RouteStop[];
  currentStopIndex: number;
  userLocation?: { lat: number; lng: number } | null;
  /** When true, map auto-follows the user's position */
  followUser?: boolean;
  className?: string;
}

export function TourRouteMap({
  stops,
  currentStopIndex,
  userLocation,
  followUser = false,
  className = '',
}: TourRouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const routeLayerAdded = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  // Get stops with valid coordinates
  const geoStops = stops.filter((s) => s.lat != null && s.lng != null);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainer.current || geoStops.length === 0) return;

    let cancelled = false;

    (async () => {
      const maplibregl = await import('maplibre-gl');
      await import('maplibre-gl/dist/maplibre-gl.css');

      if (cancelled || !mapContainer.current) return;

      const MapLib = maplibregl.default || maplibregl;
      (window as any).__maplibregl = MapLib;

      // Calculate bounds
      const lats = geoStops.map((s) => s.lat!);
      const lngs = geoStops.map((s) => s.lng!);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      const m = new MapLib.Map({
        container: mapContainer.current!,
        style: {
          version: 8 as const,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: [centerLng, centerLat],
        zoom: 15,
        maxZoom: 19,
        minZoom: 2,
      });

      mapRef.current = m;

      m.on('load', () => {
        if (cancelled) return;
        setMapReady(true);

        // Add route line between stops
        const coordinates = geoStops.map((s) => [s.lng!, s.lat!]);

        m.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates },
          },
        });

        // Route line background (wider, for contrast)
        m.addLayer({
          id: 'route-bg',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.8 },
        });

        // Route line
        m.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-dasharray': [2, 1],
          },
        });

        routeLayerAdded.current = true;

        // Add stop markers
        geoStops.forEach((stop, idx) => {
          const el = document.createElement('div');
          const stopIdx = stops.findIndex((s) => s.id === stop.id);
          const isCurrent = stopIdx === currentStopIndex;
          const isPast = stopIdx < currentStopIndex;

          el.className = 'tour-stop-marker';
          el.style.cssText = `
            width: ${isCurrent ? '32px' : '24px'};
            height: ${isCurrent ? '32px' : '24px'};
            border-radius: 50%;
            background: ${isCurrent ? '#3b82f6' : isPast ? '#22c55e' : '#94a3b8'};
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isCurrent ? '14px' : '11px'};
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
          `;
          el.textContent = `${stopIdx + 1}`;

          const marker = new MapLib.Marker({ element: el })
            .setLngLat([stop.lng!, stop.lat!])
            .addTo(m);

          markersRef.current.push(marker);
        });

        // Fit bounds to show all stops
        if (geoStops.length > 1) {
          const bounds = new MapLib.LngLatBounds();
          geoStops.forEach((s) => bounds.extend([s.lng!, s.lat!]));
          if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
          m.fitBounds(bounds, { padding: 60, maxZoom: 17 });
        }
      });
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      routeLayerAdded.current = false;
      setMapReady(false);
    };
  }, []);  // Initialize once

  // Update stop marker styles when currentStopIndex changes
  useEffect(() => {
    if (!mapReady) return;
    markersRef.current.forEach((marker, idx) => {
      const el = marker.getElement();
      const stopIdx = stops.findIndex((s) => s.id === geoStops[idx]?.id);
      const isCurrent = stopIdx === currentStopIndex;
      const isPast = stopIdx < currentStopIndex;

      el.style.width = isCurrent ? '32px' : '24px';
      el.style.height = isCurrent ? '32px' : '24px';
      el.style.background = isCurrent ? '#3b82f6' : isPast ? '#22c55e' : '#94a3b8';
      el.style.fontSize = isCurrent ? '14px' : '11px';
    });
  }, [currentStopIndex, mapReady, geoStops, stops]);

  // Update user location marker
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;

    const MapLib = (window as any).__maplibregl;
    if (!MapLib) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    } else {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        border: 3px solid white;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.3), 0 2px 6px rgba(0,0,0,0.3);
      `;
      userMarkerRef.current = new MapLib.Marker({ element: el })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(mapRef.current);
    }

    if (followUser) {
      mapRef.current.easeTo({
        center: [userLocation.lng, userLocation.lat],
        duration: 500,
      });
    }
  }, [userLocation, mapReady, followUser]);

  // Pan to current stop when it changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const stop = stops[currentStopIndex];
    if (stop?.lat && stop?.lng) {
      mapRef.current.flyTo({
        center: [stop.lng, stop.lat],
        zoom: 17,
        duration: 1000,
      });
    }
  }, [currentStopIndex, mapReady, stops]);

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '200px' }}
    />
  );
}

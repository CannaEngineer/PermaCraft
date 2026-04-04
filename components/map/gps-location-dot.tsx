'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGeolocation } from '@/hooks/use-geolocation';
import { accuracyCircleGeoJSON } from '@/lib/gps';
import type maplibregl from 'maplibre-gl';

const DOT_SOURCE = 'gps-location-dot';
const CIRCLE_SOURCE = 'gps-accuracy-circle';
const DOT_LAYER = 'gps-location-dot-layer';
const DOT_OUTER_LAYER = 'gps-location-dot-outer';
const CIRCLE_LAYER = 'gps-accuracy-circle-layer';
const PULSE_LAYER = 'gps-location-pulse';

interface GPSLocationDotProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  enabled?: boolean;
}

export function GPSLocationDot({ mapRef, enabled = true }: GPSLocationDotProps) {
  const { position, startTracking, stopTracking, supported } = useGeolocation({
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 15000,
  });
  const animFrameRef = useRef<number | null>(null);
  const cleanedUpRef = useRef(false);

  const cleanup = useCallback(() => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    const map = mapRef.current;
    if (!map) return;

    [PULSE_LAYER, DOT_LAYER, DOT_OUTER_LAYER, CIRCLE_LAYER].forEach(layer => {
      if (map.getLayer(layer)) map.removeLayer(layer);
    });
    [DOT_SOURCE, CIRCLE_SOURCE].forEach(source => {
      if (map.getSource(source)) map.removeSource(source);
    });

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, [mapRef]);

  // Start/stop tracking based on enabled prop
  useEffect(() => {
    if (enabled && supported) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => stopTracking();
  }, [enabled, supported, startTracking, stopTracking]);

  // Add/update map layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position || !enabled) return;

    cleanedUpRef.current = false;

    const pointData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [position.lng, position.lat] },
        properties: {},
      }],
    };

    const circleData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [accuracyCircleGeoJSON(position.lat, position.lng, position.accuracy, 64)],
    };

    // Update or create sources
    const dotSource = map.getSource(DOT_SOURCE) as maplibregl.GeoJSONSource | undefined;
    const circSource = map.getSource(CIRCLE_SOURCE) as maplibregl.GeoJSONSource | undefined;

    if (dotSource) {
      dotSource.setData(pointData);
    } else {
      map.addSource(DOT_SOURCE, { type: 'geojson', data: pointData });
    }

    if (circSource) {
      circSource.setData(circleData);
    } else {
      map.addSource(CIRCLE_SOURCE, { type: 'geojson', data: circleData });
    }

    // Add layers if they don't exist
    if (!map.getLayer(CIRCLE_LAYER)) {
      map.addLayer({
        id: CIRCLE_LAYER,
        type: 'fill',
        source: CIRCLE_SOURCE,
        paint: {
          'fill-color': '#4285F4',
          'fill-opacity': 0.08,
        },
      });
    }

    if (!map.getLayer(DOT_OUTER_LAYER)) {
      map.addLayer({
        id: DOT_OUTER_LAYER,
        type: 'circle',
        source: DOT_SOURCE,
        paint: {
          'circle-radius': 11,
          'circle-color': '#ffffff',
          'circle-opacity': 0.95,
        },
      });
    }

    if (!map.getLayer(DOT_LAYER)) {
      map.addLayer({
        id: DOT_LAYER,
        type: 'circle',
        source: DOT_SOURCE,
        paint: {
          'circle-radius': 7,
          'circle-color': '#4285F4',
          'circle-opacity': 1,
        },
      });
    }

    if (!map.getLayer(PULSE_LAYER)) {
      map.addLayer({
        id: PULSE_LAYER,
        type: 'circle',
        source: DOT_SOURCE,
        paint: {
          'circle-radius': 7,
          'circle-color': '#4285F4',
          'circle-opacity': 0.4,
          'circle-stroke-width': 0,
        },
      });

      // Animate pulse
      let start = performance.now();
      const animate = (time: number) => {
        if (cleanedUpRef.current) return;
        const elapsed = (time - start) % 2000;
        const t = elapsed / 2000;
        const radius = 7 + t * 18;
        const opacity = 0.4 * (1 - t);

        if (map.getLayer(PULSE_LAYER)) {
          map.setPaintProperty(PULSE_LAYER, 'circle-radius', radius);
          map.setPaintProperty(PULSE_LAYER, 'circle-opacity', opacity);
        }

        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      // Don't clean up on every position update - only on unmount
    };
  }, [mapRef, position, enabled]);

  // Clean up on unmount or disable
  useEffect(() => {
    if (!enabled) cleanup();
    return cleanup;
  }, [enabled, cleanup]);

  return null;
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Navigation, Loader2, MapPin, X, Crosshair, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGeolocation, type GeolocationPosition } from '@/hooks/use-geolocation';
import {
  classifyAccuracy,
  formatAccuracy,
  formatCoordinates,
  isPositionNearFarm,
  accuracyCircleGeoJSON,
  type GPSMarkerType,
} from '@/lib/gps';
import { GPSDropPinForm, type GPSDropPinFormData } from './gps-drop-pin-form';
import type maplibregl from 'maplibre-gl';

interface GPSFieldMarkerProps {
  /** Reference to the MapLibre map instance */
  mapRef: React.RefObject<maplibregl.Map | null>;
  /** Farm center coordinates for proximity check */
  farmCenter: { lat: number; lng: number };
  /** Callback when a planting-type pin is dropped (triggers species picker flow) */
  onPlantingDrop: (lat: number, lng: number, notes: string) => void;
  /** Callback when a non-planting pin is dropped (observation, soil test, etc.) */
  onMarkerDrop: (data: GPSDropPinFormData) => void;
  /** Whether the component should be visible */
  visible?: boolean;
  /** Optional className for the FAB positioning */
  className?: string;
  /** When this value changes (and is > 0), auto-trigger GPS capture without showing FAB */
  triggerCapture?: number;
  /** Called when the drop-pin form visibility changes (true = form shown, false = form dismissed) */
  onFormVisibilityChange?: (visible: boolean) => void;
}

/**
 * GPSFieldMarker — Field-mapping component for in-field use.
 *
 * Provides a FAB button that, when pressed:
 * 1. Captures the user's current GPS position (high accuracy)
 * 2. Flies the map to that position
 * 3. Shows an accuracy circle on the map
 * 4. Opens a form to categorize and annotate the pin
 * 5. For plantings, hands off to the species picker flow
 *
 * Reusable architecture: the onMarkerDrop callback receives typed data
 * that can route to different handlers (plantings, soil tests, observations, etc.)
 */
export function GPSFieldMarker({
  mapRef,
  farmCenter,
  onPlantingDrop,
  onMarkerDrop,
  visible = true,
  className,
  triggerCapture,
  onFormVisibilityChange,
}: GPSFieldMarkerProps) {
  const {
    position,
    error,
    loading,
    supported,
    getCurrentPosition,
  } = useGeolocation({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 20000,
  });

  const [showForm, setShowForm] = useState(false);
  const [capturedPosition, setCapturedPosition] = useState<GeolocationPosition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationWarning, setLocationWarning] = useState<string | null>(null);
  const accuracySourceRef = useRef<string | null>(null);

  // Add/remove accuracy circle on the map
  const showAccuracyCircle = useCallback((pos: GeolocationPosition) => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = `gps-accuracy-${Date.now()}`;
    accuracySourceRef.current = sourceId;
    const layerFillId = `${sourceId}-fill`;
    const layerStrokeId = `${sourceId}-stroke`;
    const markerLayerId = `${sourceId}-marker`;

    const circleGeoJSON = accuracyCircleGeoJSON(pos.lat, pos.lng, pos.accuracy);
    const pointGeoJSON: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [pos.lng, pos.lat] },
    };

    // Accuracy circle source + layers
    map.addSource(sourceId, {
      type: 'geojson',
      data: circleGeoJSON,
    });

    map.addLayer({
      id: layerFillId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.12,
      },
    });

    map.addLayer({
      id: layerStrokeId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
        'line-dasharray': [3, 2],
        'line-opacity': 0.6,
      },
    });

    // Center dot
    const markerSourceId = `${sourceId}-point`;
    map.addSource(markerSourceId, {
      type: 'geojson',
      data: pointGeoJSON,
    });

    map.addLayer({
      id: markerLayerId,
      type: 'circle',
      source: markerSourceId,
      paint: {
        'circle-radius': 8,
        'circle-color': '#3b82f6',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 3,
        'circle-opacity': 0.9,
      },
    });

    // Pulse animation layer
    const pulseLayerId = `${sourceId}-pulse`;
    map.addLayer({
      id: pulseLayerId,
      type: 'circle',
      source: markerSourceId,
      paint: {
        'circle-radius': 20,
        'circle-color': '#3b82f6',
        'circle-opacity': 0,
        'circle-stroke-color': '#3b82f6',
        'circle-stroke-width': 2,
        'circle-stroke-opacity': 0.4,
      },
    });
  }, [mapRef]);

  const removeAccuracyCircle = useCallback(() => {
    const map = mapRef.current;
    const sourceId = accuracySourceRef.current;
    if (!map || !sourceId) return;

    const layerIds = [
      `${sourceId}-fill`,
      `${sourceId}-stroke`,
      `${sourceId}-marker`,
      `${sourceId}-pulse`,
    ];
    const sourceIds = [sourceId, `${sourceId}-point`];

    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    }
    for (const sid of sourceIds) {
      if (map.getSource(sid)) map.removeSource(sid);
    }
    accuracySourceRef.current = null;
  }, [mapRef]);

  // Clean up accuracy circle on unmount
  useEffect(() => {
    return () => removeAccuracyCircle();
  }, [removeAccuracyCircle]);

  const handleDropPin = useCallback(async () => {
    setLocationWarning(null);

    try {
      const pos = await getCurrentPosition();
      setCapturedPosition(pos);

      // Check if the user is near their farm
      if (!isPositionNearFarm(pos.lat, pos.lng, farmCenter.lat, farmCenter.lng)) {
        setLocationWarning(
          'You appear to be far from this farm. The pin will still be placed at your GPS location.'
        );
      }

      // Fly the map to the GPS position
      const map = mapRef.current;
      if (map) {
        map.flyTo({
          center: [pos.lng, pos.lat],
          zoom: Math.max(map.getZoom(), 18),
          duration: 1500,
        });

        // Show accuracy circle after flight
        setTimeout(() => showAccuracyCircle(pos), 800);
      }

      setShowForm(true);
    } catch {
      // Error is already in the hook state
    }
  }, [getCurrentPosition, farmCenter, mapRef, showAccuracyCircle]);

  const handleFormSubmit = useCallback(async (data: GPSDropPinFormData) => {
    setSubmitting(true);

    try {
      if (data.markerType === 'planting') {
        onPlantingDrop(data.lat, data.lng, data.notes);
      } else {
        onMarkerDrop(data);
      }
    } finally {
      setSubmitting(false);
      setShowForm(false);
      setCapturedPosition(null);
      removeAccuracyCircle();
    }
  }, [onPlantingDrop, onMarkerDrop, removeAccuracyCircle]);

  const handleCancel = useCallback(() => {
    setShowForm(false);
    setCapturedPosition(null);
    setLocationWarning(null);
    removeAccuracyCircle();
  }, [removeAccuracyCircle]);

  // Notify parent when form visibility changes (so drawer can collapse)
  useEffect(() => {
    onFormVisibilityChange?.(showForm);
  }, [showForm, onFormVisibilityChange]);

  // Auto-trigger capture when triggerCapture changes (from GPS tools menu)
  const lastTriggerRef = useRef(0);
  useEffect(() => {
    if (triggerCapture && triggerCapture > lastTriggerRef.current) {
      lastTriggerRef.current = triggerCapture;
      handleDropPin();
    }
  }, [triggerCapture, handleDropPin]);

  if (!visible && !showForm) return null;
  if (!supported) return null;

  const accuracyInfo = capturedPosition
    ? classifyAccuracy(capturedPosition.accuracy)
    : null;

  return (
    <>
      {/* GPS Drop Pin FAB — positioned on left side to not conflict with main FAB */}
      {!showForm && (
        <button
          onClick={handleDropPin}
          disabled={loading}
          className={cn(
            'fixed z-[45] flex items-center gap-2 rounded-full shadow-xl transition-all duration-200',
            'bg-blue-600 text-white hover:bg-blue-700 active:scale-95',
            'focus:outline-none focus:ring-4 focus:ring-blue-600/30',
            'disabled:opacity-70 disabled:cursor-wait',
            // Mobile: left side, above nav. Desktop: left side, lower
            'bottom-[88px] left-5 md:bottom-8 md:left-8',
            'h-14 px-4',
            className,
          )}
          aria-label="Drop pin at my GPS location"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Crosshair className="h-5 w-5" />
          )}
          <span className="text-sm font-semibold pr-1">
            {loading ? 'Locating...' : 'I\'m Here'}
          </span>
        </button>
      )}

      {/* Error toast */}
      {error && !showForm && (
        <div className="fixed bottom-[148px] left-5 md:bottom-24 md:left-8 z-[46] max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Location Error</p>
                <p className="text-xs text-red-600 mt-0.5">{error.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop Pin Form — centered at bottom of screen */}
      {showForm && capturedPosition && accuracyInfo && (
        <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 pb-6 md:pb-8">
          {/* Scrim */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10 animate-in fade-in duration-200"
            onClick={handleCancel}
          />

          <div className="w-full max-w-sm">
            {/* Distance warning */}
            {locationWarning && (
              <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800 flex items-start gap-2 animate-in fade-in duration-200">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>{locationWarning}</span>
              </div>
            )}

            <GPSDropPinForm
              position={capturedPosition}
              accuracyInfo={accuracyInfo}
              onSubmit={handleFormSubmit}
              onCancel={handleCancel}
              submitting={submitting}
            />
          </div>
        </div>
      )}
    </>
  );
}

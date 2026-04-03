'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Footprints, Square, Loader2, MapPin, Undo2, Pause, Play, X,
  CheckCircle2, AlertTriangle, Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useGeolocation, type GeolocationPosition } from '@/hooks/use-geolocation';
import {
  classifyAccuracy,
  formatAccuracy,
  distanceBetween,
} from '@/lib/gps';
import type maplibregl from 'maplibre-gl';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoundaryPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface BoundaryWalkerResult {
  points: BoundaryPoint[];
  name: string;
  zoneType: string;
  totalDistanceMeters: number;
}

interface BoundaryWalkerProps {
  mapRef: React.RefObject<maplibregl.Map | null>;
  farmId: string;
  onComplete: (result: BoundaryWalkerResult) => void;
  onCancel: () => void;
  visible?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum distance (meters) between recorded points to avoid clutter */
const MIN_POINT_DISTANCE = 2;
/** Minimum number of points to form a valid polygon */
const MIN_POLYGON_POINTS = 3;
/** Auto-close threshold: if within this distance of start, suggest closing */
const AUTO_CLOSE_DISTANCE = 10;

// ─── Boundary Walker Component ────────────────────────────────────────────────

type WalkerPhase = 'ready' | 'walking' | 'paused' | 'naming';

export function BoundaryWalker({
  mapRef,
  farmId,
  onComplete,
  onCancel,
  visible = true,
}: BoundaryWalkerProps) {
  const [phase, setPhase] = useState<WalkerPhase>('ready');
  const [points, setPoints] = useState<BoundaryPoint[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [zoneName, setZoneName] = useState('');
  const [nearStart, setNearStart] = useState(false);

  const lineSourceRef = useRef<string | null>(null);
  const pointsSourceRef = useRef<string | null>(null);

  const {
    position,
    error,
    loading,
    tracking,
    supported,
    startTracking,
    stopTracking,
  } = useGeolocation({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 20000,
  });

  // ─── Map visualization ────────────────────────────────────────────────────

  const updateMapLine = useCallback((pts: BoundaryPoint[]) => {
    const map = mapRef.current;
    if (!map || pts.length < 1) return;

    const coordinates = pts.map(p => [p.lng, p.lat]);
    const lineId = 'boundary-walk-line';
    const pointsId = 'boundary-walk-points';
    const dotsId = 'boundary-walk-dots';

    lineSourceRef.current = lineId;
    pointsSourceRef.current = pointsId;

    const lineGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    };

    const pointsGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: pts.map((p, i) => ({
        type: 'Feature' as const,
        properties: { index: i, isFirst: i === 0, isLast: i === pts.length - 1 },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      })),
    };

    // Line source/layer
    if (map.getSource(lineId)) {
      (map.getSource(lineId) as any).setData(lineGeoJSON);
    } else {
      map.addSource(lineId, { type: 'geojson', data: lineGeoJSON });
      map.addLayer({
        id: `${lineId}-layer`,
        type: 'line',
        source: lineId,
        paint: {
          'line-color': '#f97316',
          'line-width': 3,
          'line-dasharray': [2, 1],
          'line-opacity': 0.9,
        },
      });
    }

    // Points source/layer
    if (map.getSource(pointsId)) {
      (map.getSource(pointsId) as any).setData(pointsGeoJSON);
    } else {
      map.addSource(pointsId, { type: 'geojson', data: pointsGeoJSON });
      map.addLayer({
        id: dotsId,
        type: 'circle',
        source: pointsId,
        paint: {
          'circle-radius': [
            'case',
            ['get', 'isFirst'], 7,
            ['get', 'isLast'], 6,
            3,
          ],
          'circle-color': [
            'case',
            ['get', 'isFirst'], '#22c55e',
            ['get', 'isLast'], '#f97316',
            '#ffffff',
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }
  }, [mapRef]);

  const cleanupMapLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const layerIds = ['boundary-walk-line-layer', 'boundary-walk-dots'];
    const sourceIds = ['boundary-walk-line', 'boundary-walk-points'];

    for (const id of layerIds) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of sourceIds) {
      if (map.getSource(id)) map.removeSource(id);
    }
  }, [mapRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupMapLayers();
      stopTracking();
    };
  }, [cleanupMapLayers, stopTracking]);

  // ─── Handle GPS updates ─────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'walking' || !position) return;

    const newPoint: BoundaryPoint = {
      lat: position.lat,
      lng: position.lng,
      accuracy: position.accuracy,
      timestamp: position.timestamp,
    };

    setPoints(prev => {
      // Skip if too close to last point
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const dist = distanceBetween(last.lat, last.lng, newPoint.lat, newPoint.lng);
        if (dist < MIN_POINT_DISTANCE) return prev;

        // Update total distance
        setTotalDistance(d => d + dist);
      }

      const updated = [...prev, newPoint];
      updateMapLine(updated);

      // Check proximity to start
      if (updated.length >= MIN_POLYGON_POINTS) {
        const start = updated[0];
        const distToStart = distanceBetween(
          start.lat, start.lng,
          newPoint.lat, newPoint.lng
        );
        setNearStart(distToStart <= AUTO_CLOSE_DISTANCE);
      }

      // Follow user on map
      const map = mapRef.current;
      if (map) {
        map.easeTo({
          center: [newPoint.lng, newPoint.lat],
          duration: 500,
        });
      }

      return updated;
    });
  }, [phase, position, updateMapLine, mapRef]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    setPhase('walking');
    setPoints([]);
    setTotalDistance(0);
    setNearStart(false);
    startTracking();
  }, [startTracking]);

  const handlePause = useCallback(() => {
    setPhase('paused');
    stopTracking();
  }, [stopTracking]);

  const handleResume = useCallback(() => {
    setPhase('walking');
    startTracking();
  }, [startTracking]);

  const handleUndo = useCallback(() => {
    setPoints(prev => {
      if (prev.length <= 1) return prev;
      const updated = prev.slice(0, -1);
      updateMapLine(updated);

      // Recalculate distance
      let dist = 0;
      for (let i = 1; i < updated.length; i++) {
        dist += distanceBetween(
          updated[i - 1].lat, updated[i - 1].lng,
          updated[i].lat, updated[i].lng
        );
      }
      setTotalDistance(dist);

      return updated;
    });
  }, [updateMapLine]);

  const handleFinish = useCallback(() => {
    stopTracking();
    setPhase('naming');
  }, [stopTracking]);

  const handleSave = useCallback(() => {
    onComplete({
      points,
      name: zoneName.trim() || 'Walked boundary',
      zoneType: 'other',
      totalDistanceMeters: totalDistance,
    });
    cleanupMapLayers();
    setPhase('ready');
    setPoints([]);
    setZoneName('');
  }, [points, zoneName, totalDistance, onComplete, cleanupMapLayers]);

  const handleCancel = useCallback(() => {
    stopTracking();
    cleanupMapLayers();
    setPhase('ready');
    setPoints([]);
    setZoneName('');
    setTotalDistance(0);
    onCancel();
  }, [stopTracking, cleanupMapLayers, onCancel]);

  if (!visible || !supported) return null;

  const accuracyInfo = position ? classifyAccuracy(position.accuracy) : null;
  const canFinish = points.length >= MIN_POLYGON_POINTS;

  const formatDistance = (m: number) => {
    if (m < 1000) return `${Math.round(m)}m`;
    return `${(m / 1000).toFixed(2)}km`;
  };

  // ─── Ready state: show the launch button ──────────────────────────────

  if (phase === 'ready') {
    return (
      <button
        onClick={handleStart}
        disabled={loading}
        className={cn(
          'fixed z-[45] flex items-center gap-2 rounded-full shadow-xl transition-all duration-200',
          'bg-orange-600 text-white hover:bg-orange-700 active:scale-95',
          'focus:outline-none focus:ring-4 focus:ring-orange-600/30',
          'disabled:opacity-70 disabled:cursor-wait',
          'bottom-[88px] left-5 md:bottom-8 md:left-8',
          'h-14 px-4',
        )}
        aria-label="Walk a zone boundary"
      >
        <Footprints className="h-5 w-5" />
        <span className="text-sm font-semibold pr-1">Walk Boundary</span>
      </button>
    );
  }

  // ─── Naming phase: name the boundary before save ──────────────────────

  if (phase === 'naming') {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-4 pb-6 md:pb-8">
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] -z-10 animate-in fade-in duration-200"
          onClick={handleCancel}
        />
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="px-4 pt-4 pb-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Boundary Recorded
              </h3>
              <button
                onClick={handleCancel}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="Cancel"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {points.length} points &middot; {formatDistance(totalDistance)} walked
            </p>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label htmlFor="boundary-name" className="text-xs font-medium text-muted-foreground mb-1 block">
                Name this zone
              </label>
              <Input
                id="boundary-name"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="e.g., South pasture, Food forest area..."
                className="text-sm"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleCancel}>
                Discard
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 gap-1.5"
                onClick={handleSave}
              >
                <CheckCircle2 className="h-4 w-4" />
                Save Zone
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Walking / Paused: the HUD ───────────────────────────────────────

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-4 pb-6 md:pb-8 pointer-events-none">
      <div className="w-full max-w-sm pointer-events-auto">
        {/* Near-start hint */}
        {nearStart && canFinish && (
          <div className="mb-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 text-xs text-green-800 dark:text-green-200 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Navigation className="h-3.5 w-3.5 flex-shrink-0" />
            <span>You&apos;re near your starting point. Tap <strong>Finish</strong> to close the boundary.</span>
          </div>
        )}

        {/* Main HUD card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
          {/* Status bar */}
          <div className="px-4 pt-3 pb-2 border-b border-border/50 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  phase === 'walking' ? 'bg-green-500 animate-pulse' : 'bg-amber-500',
                )} />
                <span className="text-sm font-semibold text-foreground">
                  {phase === 'walking' ? 'Recording...' : 'Paused'}
                </span>
              </div>
              <button
                onClick={handleCancel}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="Cancel walk"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-px bg-border/50">
            <div className="bg-card px-3 py-2 text-center">
              <p className="text-lg font-bold tabular-nums text-foreground">{points.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</p>
            </div>
            <div className="bg-card px-3 py-2 text-center">
              <p className="text-lg font-bold tabular-nums text-foreground">{formatDistance(totalDistance)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Distance</p>
            </div>
            <div className="bg-card px-3 py-2 text-center">
              {accuracyInfo ? (
                <>
                  <p className={cn('text-lg font-bold', accuracyInfo.color)}>
                    {formatAccuracy(position!.accuracy)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Accuracy</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">GPS</p>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={points.length < 2}
              className="h-10 w-10 p-0"
              aria-label="Undo last point"
            >
              <Undo2 className="h-4 w-4" />
            </Button>

            {phase === 'walking' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                className="flex-1 h-10 gap-1.5"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResume}
                className="flex-1 h-10 gap-1.5"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleFinish}
              disabled={!canFinish}
              className={cn(
                'flex-1 h-10 gap-1.5',
                canFinish
                  ? 'bg-green-600 hover:bg-green-700'
                  : '',
              )}
            >
              <Square className="h-3.5 w-3.5" />
              Finish
            </Button>
          </div>

          {/* Error display */}
          {error && (
            <div className="px-4 pb-3">
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{error.message}</span>
              </div>
            </div>
          )}

          {/* Hint */}
          {points.length < MIN_POLYGON_POINTS && (
            <div className="px-4 pb-3">
              <p className="text-[11px] text-muted-foreground text-center">
                Walk along the boundary edge. Need at least {MIN_POLYGON_POINTS} points to create a zone.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

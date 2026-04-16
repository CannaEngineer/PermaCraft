import type maplibregl from 'maplibre-gl';
import { getSnapStrength } from './zoom-enhancements';

/**
 * Grid spacing expressed as separate latitude and longitude steps in degrees.
 *
 * 1° of latitude is ~constant (~110.574 km); 1° of longitude shrinks toward the
 * poles by cos(latitude). The visual measurement grid in
 * `lib/map/measurement-grid.ts` uses different lat/lng degree steps for this
 * reason — snap must match, otherwise the magnetic target drifts off the
 * visible intersection at non-equatorial latitudes (~23% drift at 40°N).
 */
export interface GridSpacing {
  latDegrees: number;
  lngDegrees: number;
}

/**
 * Legacy scalar accepted by `snapCoordinate` — treated as identical lat/lng
 * spacing. Kept so any caller that still passes a single number keeps working
 * during a deprecation window. Prefer passing a {@link GridSpacing}.
 */
export type GridSpacingInput = number | GridSpacing;

function normalizeSpacing(input: GridSpacingInput): GridSpacing {
  if (typeof input === 'number') {
    return { latDegrees: input, lngDegrees: input };
  }
  return input;
}

/**
 * Calculate the nearest grid intersection to a given coordinate.
 *
 * The grid is anchored at (0°, 0°) — the same origin used by the visual grid's
 * `Math.floor(south / coarseLatStep) * coarseLatStep` calculation, since any
 * floor-to-multiple of the same step lands on the same lattice.
 */
export function getNearestGridIntersection(
  lng: number,
  lat: number,
  spacing: GridSpacingInput
): { lng: number; lat: number } {
  const { latDegrees, lngDegrees } = normalizeSpacing(spacing);
  const snappedLng = Math.round(lng / lngDegrees) * lngDegrees;
  const snappedLat = Math.round(lat / latDegrees) * latDegrees;

  return { lng: snappedLng, lat: snappedLat };
}

/**
 * Calculate distance in pixels between two map coordinates
 */
export function getPixelDistance(
  map: maplibregl.Map,
  coord1: { lng: number; lat: number },
  coord2: { lng: number; lat: number }
): number {
  const point1 = map.project([coord1.lng, coord1.lat]);
  const point2 = map.project([coord2.lng, coord2.lat]);

  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Snap coordinate to nearest grid intersection if within snap radius
 */
export function snapCoordinate(
  map: maplibregl.Map,
  lng: number,
  lat: number,
  spacing: GridSpacingInput,
  zoom: number,
  enabled: boolean = true,
  isTouch: boolean = false
): { lng: number; lat: number; snapped: boolean } {
  if (!enabled) {
    return { lng, lat, snapped: false };
  }

  const snapStrength = getSnapStrength(zoom, isTouch);

  // No snapping if strength is 0 (zoom < 20)
  if (snapStrength === 0) {
    return { lng, lat, snapped: false };
  }

  const nearest = getNearestGridIntersection(lng, lat, spacing);
  const distance = getPixelDistance(map, { lng, lat }, nearest);

  // Snap if within radius
  if (distance <= snapStrength) {
    return { ...nearest, snapped: true };
  }

  return { lng, lat, snapped: false };
}

/**
 * Calculate grid spacing in degrees based on unit and subdivision.
 *
 * Returns separate lat/lng steps so snap aligns to the visual grid.
 * 1° latitude ≈ 111,320 m (~364,567 ft) — effectively constant.
 * 1° longitude ≈ 111,320 × cos(latitude) m — shrinks toward the poles.
 */
export function getGridSpacingDegrees(
  unit: 'imperial' | 'metric',
  subdivision: 'coarse' | 'fine',
  latitude: number
): GridSpacing {
  const METERS_PER_DEGREE_LAT = 111320;
  const cosLat = Math.cos(latitude * Math.PI / 180);
  // Avoid divide-by-zero at the poles; clamp to a tiny non-zero value.
  const safeCos = Math.abs(cosLat) < 1e-6 ? 1e-6 : cosLat;

  const spacingMeters = unit === 'imperial'
    ? (subdivision === 'fine' ? 10 : 50) * 0.3048 // ft → m
    : (subdivision === 'fine' ? 5 : 25);

  return {
    latDegrees: spacingMeters / METERS_PER_DEGREE_LAT,
    lngDegrees: spacingMeters / (METERS_PER_DEGREE_LAT * safeCos),
  };
}

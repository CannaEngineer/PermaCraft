import type maplibregl from 'maplibre-gl';
import { getSnapStrength } from './zoom-enhancements';

/**
 * Calculate the nearest grid intersection to a given coordinate
 */
export function getNearestGridIntersection(
  lng: number,
  lat: number,
  gridSpacingDegrees: number
): { lng: number; lat: number } {
  const snappedLng = Math.round(lng / gridSpacingDegrees) * gridSpacingDegrees;
  const snappedLat = Math.round(lat / gridSpacingDegrees) * gridSpacingDegrees;

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
  gridSpacingDegrees: number,
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

  const nearest = getNearestGridIntersection(lng, lat, gridSpacingDegrees);
  const distance = getPixelDistance(map, { lng, lat }, nearest);

  // Snap if within radius
  if (distance <= snapStrength) {
    return { ...nearest, snapped: true };
  }

  return { lng, lat, snapped: false };
}

/**
 * Calculate grid spacing in degrees based on unit and subdivision
 */
export function getGridSpacingDegrees(
  unit: 'imperial' | 'metric',
  subdivision: 'coarse' | 'fine',
  latitude: number
): number {
  // Approximate degrees per foot/meter at given latitude
  const feetPerDegree = 364000 * Math.cos(latitude * Math.PI / 180);
  const metersPerDegree = 111320 * Math.cos(latitude * Math.PI / 180);

  let spacingFt = subdivision === 'fine' ? 10 : 50;
  let spacingM = subdivision === 'fine' ? 5 : 25;

  if (unit === 'imperial') {
    return spacingFt / feetPerDegree;
  } else {
    return spacingM / metersPerDegree;
  }
}

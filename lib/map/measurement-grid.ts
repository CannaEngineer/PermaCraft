import type { Feature, LineString, Point } from 'geojson';

export type GridUnit = 'imperial' | 'metric';

interface GridInterval {
  value: number;
  unit: string;
}

/**
 * Get appropriate grid interval based on zoom level and unit system
 */
export function getGridInterval(zoom: number, unit: GridUnit): GridInterval {
  if (unit === 'imperial') {
    if (zoom >= 19) return { value: 50, unit: 'ft' };
    if (zoom >= 17) return { value: 100, unit: 'ft' };
    if (zoom >= 15) return { value: 250, unit: 'ft' };
    if (zoom >= 13) return { value: 500, unit: 'ft' };
    return { value: 1000, unit: 'ft' };
  } else {
    if (zoom >= 19) return { value: 25, unit: 'm' };
    if (zoom >= 17) return { value: 50, unit: 'm' };
    if (zoom >= 15) return { value: 100, unit: 'm' };
    if (zoom >= 13) return { value: 250, unit: 'm' };
    return { value: 500, unit: 'm' };
  }
}

/**
 * Convert feet to meters
 */
function feetToMeters(feet: number): number {
  return feet * 0.3048;
}

/**
 * Calculate degrees of latitude/longitude for given distance in meters
 */
function metersToDegreesLat(meters: number): number {
  return meters / 111320; // 1 degree latitude ≈ 111.32km
}

function metersToDegreesLng(meters: number, latitude: number): number {
  return meters / (111320 * Math.cos(latitude * Math.PI / 180));
}

/**
 * Generate grid lines for map bounds
 */
export function generateGridLines(
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  zoom: number,
  unit: GridUnit
): { lines: Feature<LineString>[], labels: Feature<Point>[] } {
  const interval = getGridInterval(zoom, unit);
  const intervalMeters = unit === 'imperial'
    ? feetToMeters(interval.value)
    : interval.value;

  const centerLat = (bounds.north + bounds.south) / 2;

  const latStep = metersToDegreesLat(intervalMeters);
  const lngStep = metersToDegreesLng(intervalMeters, centerLat);

  // Add 20% buffer
  const latBuffer = (bounds.north - bounds.south) * 0.2;
  const lngBuffer = (bounds.east - bounds.west) * 0.2;

  const north = bounds.north + latBuffer;
  const south = bounds.south - latBuffer;
  const east = bounds.east + lngBuffer;
  const west = bounds.west - lngBuffer;

  const lines: Feature<LineString>[] = [];
  const labels: Feature<Point>[] = [];

  // Generate latitude lines (horizontal)
  let count = 0;
  for (let lat = Math.floor(south / latStep) * latStep; lat <= north && count < 50; lat += latStep) {
    lines.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[west, lat], [east, lat]]
      }
    });
    count++;
  }

  // Generate longitude lines (vertical)
  count = 0;
  for (let lng = Math.floor(west / lngStep) * lngStep; lng <= east && count < 50; lng += lngStep) {
    lines.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[lng, south], [lng, north]]
      }
    });
    count++;
  }

  // Generate labels at grid intersections (only at major intervals)
  const majorInterval = interval.value * 2;
  const majorLatStep = latStep * 2;
  const majorLngStep = lngStep * 2;

  count = 0;
  for (let lat = Math.floor(south / majorLatStep) * majorLatStep; lat <= north && count < 25; lat += majorLatStep) {
    for (let lng = Math.floor(west / majorLngStep) * majorLngStep; lng <= east && count < 25; lng += majorLngStep) {
      labels.push({
        type: 'Feature',
        properties: {
          label: `${majorInterval} ${interval.unit}`
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });
      count++;
    }
  }

  return { lines, labels };
}

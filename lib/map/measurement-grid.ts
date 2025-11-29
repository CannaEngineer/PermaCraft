import type { Feature, LineString, Point } from 'geojson';

export type GridUnit = 'imperial' | 'metric';

interface GridInterval {
  value: number;
  unit: string;
}

/**
 * Get appropriate grid interval based on zoom level and unit system
 * Values are half the original size for more accurate spatial identification
 */
export function getGridInterval(zoom: number, unit: GridUnit): GridInterval {
  if (unit === 'imperial') {
    if (zoom >= 19) return { value: 25, unit: 'ft' };
    if (zoom >= 17) return { value: 50, unit: 'ft' };
    if (zoom >= 15) return { value: 125, unit: 'ft' };
    if (zoom >= 13) return { value: 250, unit: 'ft' };
    return { value: 500, unit: 'ft' };
  } else {
    if (zoom >= 19) return { value: 12.5, unit: 'm' };
    if (zoom >= 17) return { value: 25, unit: 'm' };
    if (zoom >= 15) return { value: 50, unit: 'm' };
    if (zoom >= 13) return { value: 125, unit: 'm' };
    return { value: 250, unit: 'm' };
  }
}

/**
 * Convert column index to letter label (0→A, 1→B, ..., 25→Z, 26→AA, etc.)
 */
function getColumnLabel(index: number): string {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
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

  // Collect grid line coordinates for labeling
  const latLines: number[] = [];
  const lngLines: number[] = [];

  // Generate latitude lines (horizontal) - these are rows
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
    latLines.push(lat);
    count++;
  }

  // Generate longitude lines (vertical) - these are columns
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
    lngLines.push(lng);
    count++;
  }

  // Generate alphanumeric labels at grid intersections
  // Columns are labeled A, B, C, etc. (west to east)
  // Rows are labeled 1, 2, 3, etc. (south to north)
  count = 0;
  for (let rowIndex = 0; rowIndex < latLines.length && count < 100; rowIndex++) {
    for (let colIndex = 0; colIndex < lngLines.length && count < 100; colIndex++) {
      const rowLabel = rowIndex + 1; // Start from 1
      const colLabel = getColumnLabel(colIndex);

      labels.push({
        type: 'Feature',
        properties: {
          label: `${colLabel}${rowLabel}`
        },
        geometry: {
          type: 'Point',
          coordinates: [lngLines[colIndex], latLines[rowIndex]]
        }
      });
      count++;
    }
  }

  return { lines, labels };
}

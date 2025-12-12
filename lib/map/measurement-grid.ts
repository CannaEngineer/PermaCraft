import type { Feature, LineString, Point } from 'geojson';

export type GridUnit = 'imperial' | 'metric';
export type GridDensity = 'auto' | 'sparse' | 'normal' | 'dense' | 'off';

interface GridInterval {
  value: number;
  unit: string;
}

/**
 * Get grid interval based on zoom level and user preference
 * Adaptive grid that adjusts to zoom level unless user overrides
 */
export function getGridInterval(zoom: number, unit: GridUnit, density: GridDensity = 'auto'): GridInterval {
  // If user turned off grid
  if (density === 'off') {
    return { value: 0, unit: unit === 'imperial' ? 'ft' : 'm' };
  }

  // User-specified density overrides
  if (density === 'sparse') {
    return unit === 'imperial' ? { value: 200, unit: 'ft' } : { value: 100, unit: 'm' };
  }
  if (density === 'normal') {
    return unit === 'imperial' ? { value: 100, unit: 'ft' } : { value: 50, unit: 'm' };
  }
  if (density === 'dense') {
    return unit === 'imperial' ? { value: 50, unit: 'ft' } : { value: 25, unit: 'm' };
  }

  // Auto mode - adapt to zoom level
  if (unit === 'imperial') {
    if (zoom < 14) return { value: 200, unit: 'ft' }; // Very sparse for overview
    if (zoom < 17) return { value: 100, unit: 'ft' }; // Moderate for planning
    if (zoom < 20) return { value: 50, unit: 'ft' };  // Detailed work
    return { value: 25, unit: 'ft' }; // Ultra-detailed for urban plots
  } else {
    if (zoom < 14) return { value: 100, unit: 'm' }; // Very sparse for overview
    if (zoom < 17) return { value: 50, unit: 'm' };  // Moderate for planning
    if (zoom < 20) return { value: 25, unit: 'm' };  // Detailed work
    return { value: 10, unit: 'm' }; // Ultra-detailed for urban plots
  }
}

/**
 * Get fixed grid interval for the farm (independent of zoom level)
 * This creates a consistent reference grid that doesn't change as you zoom
 * Used for AI consistency - grid labels stay the same regardless of zoom
 */
export function getFixedGridInterval(unit: GridUnit): GridInterval {
  if (unit === 'imperial') {
    return { value: 50, unit: 'ft' }; // Fixed 50 ft grid
  } else {
    return { value: 25, unit: 'm' }; // Fixed 25 m grid
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
 * Generate fixed grid lines for farm bounds
 * Grid stays in the same geographic location regardless of zoom level
 * This ensures AI always references the same grid coordinates
 */
export function generateGridLines(
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  unit: GridUnit,
  zoom: number = 15,
  density: GridDensity = 'auto'
): { lines: Feature<LineString>[], labels: Feature<Point>[], latLines: number[], lngLines: number[] } {
  // Always use fixed grid interval for lines so AI has consistent reference
  const interval = getFixedGridInterval(unit);

  // If grid is off, return empty
  if (interval.value === 0) {
    return { lines: [], labels: [], latLines: [], lngLines: [] };
  }

  const intervalMeters = unit === 'imperial'
    ? feetToMeters(interval.value)
    : interval.value;

  const centerLat = (bounds.north + bounds.south) / 2;

  const latStep = metersToDegreesLat(intervalMeters);
  const lngStep = metersToDegreesLng(intervalMeters, centerLat);

  // Add small buffer to ensure grid covers entire farm
  const latBuffer = latStep * 2;
  const lngBuffer = lngStep * 2;

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

  return { lines, labels, latLines, lngLines };
}

/**
 * Generate viewport-specific labels ensuring labels are visible in current view
 * This provides context for AI screenshot analysis
 * Grid spacing is fixed (same as grid lines), but label DENSITY adjusts with zoom
 * This means labels reference the same grid cells at all zoom levels
 */
export function generateViewportLabels(
  farmBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  viewportBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  unit: GridUnit,
  zoom: number,
  density: GridDensity = 'auto'
): Feature<Point>[] {
  // Use fixed grid interval to match grid lines
  const interval = getFixedGridInterval(unit);

  // If grid is off, return empty
  if (interval.value === 0) {
    return [];
  }

  const intervalMeters = unit === 'imperial'
    ? feetToMeters(interval.value)
    : interval.value;

  const centerLat = (farmBounds.north + farmBounds.south) / 2;
  const latStep = metersToDegreesLat(intervalMeters);
  const lngStep = metersToDegreesLng(intervalMeters, centerLat);

  // Find which grid lines intersect the viewport
  const visibleLabels: Feature<Point>[] = [];

  // Calculate grid origin (southwest corner of farm)
  const farmSouth = farmBounds.south - latStep * 2;
  const farmWest = farmBounds.west - lngStep * 2;

  // Find latitude lines in viewport
  const vpLatLines: number[] = [];
  for (let lat = Math.floor(farmSouth / latStep) * latStep; lat <= viewportBounds.north; lat += latStep) {
    if (lat >= viewportBounds.south) {
      vpLatLines.push(lat);
    }
  }

  // Find longitude lines in viewport
  const vpLngLines: number[] = [];
  for (let lng = Math.floor(farmWest / lngStep) * lngStep; lng <= viewportBounds.east; lng += lngStep) {
    if (lng >= viewportBounds.west) {
      vpLngLines.push(lng);
    }
  }

  // Calculate row/column indices based on farm origin
  const originLat = Math.floor(farmSouth / latStep) * latStep;
  const originLng = Math.floor(farmWest / lngStep) * lngStep;

  // Determine label skip interval based on zoom level
  // Much fewer labels when zoomed out for better readability and AI context
  let skipInterval = 1;
  if (zoom < 12) {
    skipInterval = 20; // Extremely sparse - show every 20th label
  } else if (zoom < 13) {
    skipInterval = 12; // Very sparse - show every 12th label
  } else if (zoom < 14) {
    skipInterval = 8; // Sparse - show every 8th label
  } else if (zoom < 15) {
    skipInterval = 6; // Moderate - show every 6th label
  } else if (zoom < 16) {
    skipInterval = 4; // Show every 4th label
  } else if (zoom < 17) {
    skipInterval = 2; // Show every 2nd label
  } else {
    skipInterval = 1; // Show all labels when very zoomed in
  }

  // Generate labels for visible grid intersections
  for (const lat of vpLatLines) {
    for (const lng of vpLngLines) {
      const rowIndex = Math.round((lat - originLat) / latStep);
      const colIndex = Math.round((lng - originLng) / lngStep);

      // Skip labels based on zoom level for better readability
      if (rowIndex % skipInterval !== 0 || colIndex % skipInterval !== 0) {
        continue;
      }

      const rowLabel = rowIndex + 1;
      const colLabel = getColumnLabel(colIndex);

      visibleLabels.push({
        type: 'Feature',
        properties: {
          label: `${colLabel}${rowLabel}`
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });
    }
  }

  return visibleLabels;
}

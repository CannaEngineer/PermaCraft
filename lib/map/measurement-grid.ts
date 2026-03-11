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
 * Return the next power of two >= n (minimum 1).
 * Used for hierarchical label skip logic so zooming in only ADDS labels,
 * never removes previously visible ones.
 */
function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return Math.pow(2, Math.ceil(Math.log2(n)));
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
  density: GridDensity = 'auto',
  subdivision: 'coarse' | 'fine' = 'coarse' // New parameter
): { lines: Feature<LineString>[], labels: Feature<Point>[], latLines: number[], lngLines: number[] } {
  // Always use COARSE grid interval to establish the fixed origin
  // This ensures grid alignment is consistent regardless of subdivision
  const coarseInterval = getFixedGridInterval(unit);

  // If grid is off, return empty
  if (coarseInterval.value === 0) {
    return { lines: [], labels: [], latLines: [], lngLines: [] };
  }

  // Calculate coarse grid spacing in degrees (for establishing origin)
  const coarseIntervalMeters = unit === 'imperial'
    ? feetToMeters(coarseInterval.value)
    : coarseInterval.value;

  const centerLat = (bounds.north + bounds.south) / 2;
  const coarseLatStep = metersToDegreesLat(coarseIntervalMeters);
  const coarseLngStep = metersToDegreesLng(coarseIntervalMeters, centerLat);

  // Determine actual interval to use based on subdivision
  // Fine grid: 10ft/5m, Coarse grid: 50ft/25m
  const actualInterval = subdivision === 'fine'
    ? { value: coarseInterval.value / 5, unit: coarseInterval.unit }
    : coarseInterval;

  const actualIntervalMeters = unit === 'imperial'
    ? feetToMeters(actualInterval.value)
    : actualInterval.value;

  const latStep = metersToDegreesLat(actualIntervalMeters);
  const lngStep = metersToDegreesLng(actualIntervalMeters, centerLat);

  // Add small buffer to ensure grid covers entire farm
  const latBuffer = coarseLatStep * 2;
  const lngBuffer = coarseLngStep * 2;

  const north = bounds.north + latBuffer;
  const south = bounds.south - latBuffer;
  const east = bounds.east + lngBuffer;
  const west = bounds.west - lngBuffer;

  const lines: Feature<LineString>[] = [];
  const labels: Feature<Point>[] = [];

  // Collect grid line coordinates for labeling
  const latLines: number[] = [];
  const lngLines: number[] = [];

  // CRITICAL: Calculate origin based on COARSE grid to ensure consistency
  // Fine grid will align with coarse grid (every 5th fine line = 1 coarse line)
  const originLat = Math.floor(south / coarseLatStep) * coarseLatStep;
  const originLng = Math.floor(west / coarseLngStep) * coarseLngStep;

  // Generate latitude lines (horizontal) - these are rows
  let count = 0;
  for (let lat = originLat; lat <= north && count < 250; lat += latStep) {
    if (lat >= south - latStep) {
      lines.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [[west, lat], [east, lat]]
        }
      });
      latLines.push(lat);
    }
    count++;
  }

  // Generate longitude lines (vertical) - these are columns
  count = 0;
  for (let lng = originLng; lng <= east && count < 250; lng += lngStep) {
    if (lng >= west - lngStep) {
      lines.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [[lng, south], [lng, north]]
        }
      });
      lngLines.push(lng);
    }
    count++;
  }

  // Generate alphanumeric labels ONLY at COARSE grid intersections
  // This ensures labels stay consistent regardless of subdivision (fine/coarse).
  // Columns are labeled A, B, C, etc. (west to east)
  // Rows are labeled 1, 2, 3, etc. (south to north)
  count = 0;
  for (let rowIndex = 0; rowIndex < latLines.length && count < 200; rowIndex++) {
    const lat = latLines[rowIndex];
    // Only label at coarse-aligned positions
    const coarseRowIndex = Math.round((lat - originLat) / coarseLatStep);
    const isCoarseRow = Math.abs(lat - (originLat + coarseRowIndex * coarseLatStep)) < coarseLatStep * 0.01;
    if (!isCoarseRow) continue;

    for (let colIndex = 0; colIndex < lngLines.length && count < 200; colIndex++) {
      const lng = lngLines[colIndex];
      // Only label at coarse-aligned positions
      const coarseColIndex = Math.round((lng - originLng) / coarseLngStep);
      const isCoarseCol = Math.abs(lng - (originLng + coarseColIndex * coarseLngStep)) < coarseLngStep * 0.01;
      if (!isCoarseCol) continue;

      const rowLabel = coarseRowIndex + 1; // Start from 1
      const colLabel = getColumnLabel(coarseColIndex);

      labels.push({
        type: 'Feature',
        properties: {
          label: `${colLabel}${rowLabel}`
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
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
  density: GridDensity = 'auto',
  subdivision: 'coarse' | 'fine' = 'coarse' // New parameter
): Feature<Point>[] {
  // Always use COARSE grid to establish fixed origin (same as generateGridLines)
  const coarseInterval = getFixedGridInterval(unit);

  // If grid is off, return empty
  if (coarseInterval.value === 0) {
    return [];
  }

  // Calculate coarse grid spacing (for origin calculation)
  const coarseIntervalMeters = unit === 'imperial'
    ? feetToMeters(coarseInterval.value)
    : coarseInterval.value;

  const centerLat = (farmBounds.north + farmBounds.south) / 2;
  const coarseLatStep = metersToDegreesLat(coarseIntervalMeters);
  const coarseLngStep = metersToDegreesLng(coarseIntervalMeters, centerLat);

  // ALWAYS iterate over COARSE grid positions for labels.
  // This ensures labels are stable regardless of subdivision (fine/coarse).
  // Fine grid adds visual lines between coarse intersections, but labels
  // only appear at coarse positions with consistent indices.
  const visibleLabels: Feature<Point>[] = [];

  // Calculate grid origin based on COARSE grid (ensures consistency)
  const farmSouth = farmBounds.south - coarseLatStep * 2;
  const farmWest = farmBounds.west - coarseLngStep * 2;

  const originLat = Math.floor(farmSouth / coarseLatStep) * coarseLatStep;
  const originLng = Math.floor(farmWest / coarseLngStep) * coarseLngStep;

  // Find COARSE latitude lines in viewport (labels always at coarse positions)
  const vpCoarseLatLines: number[] = [];
  for (let lat = originLat; lat <= viewportBounds.north; lat += coarseLatStep) {
    if (lat >= viewportBounds.south) {
      vpCoarseLatLines.push(lat);
    }
  }

  // Find COARSE longitude lines in viewport
  const vpCoarseLngLines: number[] = [];
  for (let lng = originLng; lng <= viewportBounds.east; lng += coarseLngStep) {
    if (lng >= viewportBounds.west) {
      vpCoarseLngLines.push(lng);
    }
  }

  // Hierarchical skip using powers of 2.
  // This guarantees that zooming in only ADDS labels, never removes them.
  // Example: skip=4 shows indices 0,4,8,12. skip=2 shows 0,2,4,6,8,10,12.
  // All indices visible at skip=4 remain visible at skip=2.
  const maxLabelsPerAxis = 8;
  const rawLatSkip = Math.ceil(vpCoarseLatLines.length / maxLabelsPerAxis);
  const rawLngSkip = Math.ceil(vpCoarseLngLines.length / maxLabelsPerAxis);
  const latSkip = nextPowerOfTwo(rawLatSkip);
  const lngSkip = nextPowerOfTwo(rawLngSkip);

  // Generate labels at COARSE grid intersections with stable indices
  for (const lat of vpCoarseLatLines) {
    for (const lng of vpCoarseLngLines) {
      // ALWAYS use coarse step for index calculation - this is what makes
      // labels stable across zoom levels and subdivision changes
      const rowIndex = Math.round((lat - originLat) / coarseLatStep);
      const colIndex = Math.round((lng - originLng) / coarseLngStep);

      // Hierarchical skip (power-of-2) for smooth density transitions
      if (rowIndex % latSkip !== 0 || colIndex % lngSkip !== 0) {
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

/**
 * Generate dimension labels for grid cells at zoom 20+
 * Shows cell dimensions (10ft × 10ft or 50ft × 50ft) at grid intersections
 */
export function generateDimensionLabels(
  bounds: { north: number; south: number; east: number; west: number },
  unit: GridUnit,
  subdivision: 'coarse' | 'fine' = 'coarse'
): Feature<Point>[] {
  const features: Feature<Point>[] = [];

  // Calculate spacing
  let spacingFt = subdivision === 'fine' ? 10 : 50;
  let spacingM = subdivision === 'fine' ? 5 : 25;

  const displaySpacing = unit === 'imperial'
    ? `${spacingFt}ft × ${spacingFt}ft`
    : `${spacingM}m × ${spacingM}m`;

  // Calculate grid spacing in degrees
  const intervalMeters = unit === 'imperial'
    ? feetToMeters(spacingFt)
    : spacingM;

  const centerLat = (bounds.north + bounds.south) / 2;
  const latSpacing = metersToDegreesLat(intervalMeters);
  const lngSpacing = metersToDegreesLng(intervalMeters, centerLat);

  // Generate labels at every 4th intersection (to avoid clutter)
  let latCount = 0;
  for (let lat = Math.floor(bounds.south / latSpacing) * latSpacing; lat <= bounds.north; lat += latSpacing) {
    latCount++;
    if (latCount % 4 !== 0) continue;

    let lngCount = 0;
    for (let lng = Math.floor(bounds.west / lngSpacing) * lngSpacing; lng <= bounds.east; lng += lngSpacing) {
      lngCount++;
      if (lngCount % 4 !== 0) continue;

      features.push({
        type: 'Feature',
        properties: {
          label: displaySpacing,
          type: 'dimension',
        },
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      });
    }
  }

  return features;
}

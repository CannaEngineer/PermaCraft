/**
 * Zone Grid Calculator
 *
 * Calculates which alphanumeric grid cells (A1, B2, C3, etc.) a zone intersects.
 * This enables the AI to reference precise locations when making recommendations.
 *
 * Grid Coordinate System:
 * - Origin: Southwest corner of farm bounds (padded by 2 grid cells)
 * - Columns: A, B, C, ... (west to east)
 * - Rows: 1, 2, 3, ... (south to north)
 * - Spacing: 50 feet (imperial) or 25 meters (metric)
 *
 * Example:
 * ```
 *     A    B    C    D
 *  4  A4   B4   C4   D4
 *  3  A3   B3   C3   D3
 *  2  A2   B2   C2   D2
 *  1  A1   B1   C1   D1
 * ```
 *
 * Algorithm:
 * 1. Convert grid spacing to lat/lng degrees (accounts for earth curvature)
 * 2. Determine grid origin (southwest corner)
 * 3. For each zone geometry:
 *    - Point: Calculate which cell contains it
 *    - Line: Sample cells along the line
 *    - Polygon: Find bounding box, test which cells intersect
 * 4. Return sorted array of cell labels (e.g., ["A1", "A2", "B1"])
 *
 * Why This Matters:
 * - AI can say "plant at grid D5" instead of vague locations
 * - Users can correlate AI recommendations with map
 * - Provides precise communication between AI and user
 *
 * Technical Notes:
 * - Uses ray casting for point-in-polygon test
 * - Tests cell center + 4 corners for polygon intersection
 * - Handles earth curvature (lng spacing varies by latitude)
 * - Matches grid spacing from measurement-grid.ts exactly
 */

import type { GridUnit } from './measurement-grid';

/**
 * Convert Column Index to Letter Label
 *
 * Excel-style column labeling:
 * - 0 → A
 * - 25 → Z
 * - 26 → AA
 * - 27 → AB
 * - 701 → ZZ
 * - 702 → AAA
 *
 * Algorithm:
 * - Convert base-10 number to base-26 using letters
 * - Similar to decimal to hexadecimal conversion
 * - Handles multi-letter columns for large farms
 *
 * @param index - Zero-based column index
 * @returns Letter label (A, B, ..., Z, AA, AB, ...)
 */
function getColumnLabel(index: number): string {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label; // 65 = 'A' in ASCII
    num = Math.floor(num / 26) - 1;
  }
  return label;
}

/**
 * Convert Feet to Meters
 *
 * Standard conversion factor: 1 foot = 0.3048 meters exactly
 */
function feetToMeters(feet: number): number {
  return feet * 0.3048;
}

/**
 * Calculate Latitude Degrees for Given Distance in Meters
 *
 * Earth's circumference: ~40,075 km at equator
 * 1 degree latitude = 40,075 km / 360 = ~111.32 km = 111,320 meters
 *
 * This is constant at all latitudes (latitude lines are parallel).
 *
 * @param meters - Distance in meters
 * @returns Equivalent degrees of latitude
 */
function metersToDegreesLat(meters: number): number {
  return meters / 111320; // 1 degree latitude ≈ 111.32km
}

/**
 * Calculate Longitude Degrees for Given Distance in Meters
 *
 * Longitude lines converge at poles, so 1 degree longitude varies by latitude.
 *
 * Formula: degrees_lng = meters / (111.32km * cos(latitude))
 *
 * Examples:
 * - At equator (0°): 1° longitude ≈ 111.32 km
 * - At 45°N: 1° longitude ≈ 78.71 km (cos(45°) ≈ 0.707)
 * - At 60°N: 1° longitude ≈ 55.66 km (cos(60°) = 0.5)
 * - At poles (90°): 1° longitude ≈ 0 km (cos(90°) = 0)
 *
 * Why this matters:
 * - Grid cell width (in degrees) must account for latitude
 * - Otherwise cells would appear stretched on east-west axis
 *
 * @param meters - Distance in meters
 * @param latitude - Latitude in degrees
 * @returns Equivalent degrees of longitude at that latitude
 */
function metersToDegreesLng(meters: number, latitude: number): number {
  return meters / (111320 * Math.cos(latitude * Math.PI / 180));
}

/**
 * Get fixed grid interval (matches measurement-grid.ts)
 */
function getFixedGridInterval(unit: GridUnit): { value: number; unit: string } {
  if (unit === 'imperial') {
    return { value: 50, unit: 'ft' }; // Fixed 50 ft grid
  } else {
    return { value: 25, unit: 'm' }; // Fixed 25 m grid
  }
}

/**
 * Calculate which grid cells a geometry intersects
 */
export function calculateGridCoordinates(
  geometry: any, // GeoJSON geometry
  farmBounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  },
  unit: GridUnit
): string[] {
  const interval = getFixedGridInterval(unit);
  const intervalMeters = unit === 'imperial'
    ? feetToMeters(interval.value)
    : interval.value;

  const centerLat = (farmBounds.north + farmBounds.south) / 2;
  const latStep = metersToDegreesLat(intervalMeters);
  const lngStep = metersToDegreesLng(intervalMeters, centerLat);

  // Calculate farm origin (southwest corner)
  const farmSouth = farmBounds.south - latStep * 2;
  const farmWest = farmBounds.west - lngStep * 2;
  const originLat = Math.floor(farmSouth / latStep) * latStep;
  const originLng = Math.floor(farmWest / lngStep) * lngStep;

  const gridCells = new Set<string>();

  // Handle different geometry types
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    const col = Math.round((lng - originLng) / lngStep);
    const row = Math.round((lat - originLat) / latStep);
    gridCells.add(`${getColumnLabel(col)}${row + 1}`);
  }
  else if (geometry.type === 'LineString') {
    // For lines, sample points along the line
    const coords = geometry.coordinates;
    for (let i = 0; i < coords.length; i++) {
      const [lng, lat] = coords[i];
      const col = Math.round((lng - originLng) / lngStep);
      const row = Math.round((lat - originLat) / latStep);
      gridCells.add(`${getColumnLabel(col)}${row + 1}`);
    }
  }
  else if (geometry.type === 'Polygon') {
    // For polygons, get bounding box and check all cells within it
    const coords = geometry.coordinates[0]; // Outer ring

    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    coords.forEach(([lng, lat]: [number, number]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });

    // Get grid cell range
    const minCol = Math.floor((minLng - originLng) / lngStep);
    const maxCol = Math.ceil((maxLng - originLng) / lngStep);
    const minRow = Math.floor((minLat - originLat) / latStep);
    const maxRow = Math.ceil((maxLat - originLat) / latStep);

    // Check each cell in the bounding box to see if it intersects the polygon
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellLng = originLng + col * lngStep;
        const cellLat = originLat + row * latStep;

        // Simple point-in-polygon check for cell center
        if (isPointInPolygon([cellLng, cellLat], coords)) {
          gridCells.add(`${getColumnLabel(col)}${row + 1}`);
        } else {
          // Check cell corners
          const corners = [
            [cellLng, cellLat],
            [cellLng + lngStep, cellLat],
            [cellLng, cellLat + latStep],
            [cellLng + lngStep, cellLat + latStep],
          ];

          for (const corner of corners) {
            if (isPointInPolygon(corner, coords)) {
              gridCells.add(`${getColumnLabel(col)}${row + 1}`);
              break;
            }
          }
        }
      }
    }
  }

  return Array.from(gridCells).sort();
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function isPointInPolygon(point: number[], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Format grid cells as a readable range or list
 */
export function formatGridRange(cells: string[]): string {
  if (cells.length === 0) return 'none';
  if (cells.length === 1) return cells[0];

  // If it's a compact range, show as "A1-C3"
  if (cells.length > 4) {
    const firstCell = cells[0];
    const lastCell = cells[cells.length - 1];
    return `${firstCell}-${lastCell} (${cells.length} cells)`;
  }

  // Otherwise list them
  return cells.join(', ');
}

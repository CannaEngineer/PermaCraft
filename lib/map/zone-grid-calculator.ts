import type { GridUnit } from './measurement-grid';

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

/**
 * Water harvesting calculation utilities
 * Based on standard permaculture hydrology formulas
 */

import { area as turfArea } from "@turf/area";

export interface RainfallCatchmentInput {
  catchmentAreaSqFt: number;
  annualRainfallInches: number;
  runoffCoefficient?: number; // 0.0-1.0, default 0.9 for roofs
}

export interface SwaleVolumeInput {
  lengthFeet: number;
  widthFeet: number;
  depthFeet: number;
  sideSlope?: number; // Default 2:1 (horizontal:vertical)
}

/**
 * Calculate annual water capture from a catchment area
 * Formula: Volume (gallons) = Area (sq ft) × Rainfall (inches) × 0.623 × Runoff Coefficient
 */
export function calculateCatchmentCapture(input: RainfallCatchmentInput): number {
  const { catchmentAreaSqFt, annualRainfallInches, runoffCoefficient = 0.9 } = input;
  const gallonsPerInch = catchmentAreaSqFt * 0.623;
  const annualCapture = gallonsPerInch * annualRainfallInches * runoffCoefficient;
  return Math.round(annualCapture);
}

/**
 * Calculate swale water holding capacity
 * Formula for trapezoidal cross-section
 */
export function calculateSwaleCapacity(input: SwaleVolumeInput): number {
  const { lengthFeet, widthFeet, depthFeet, sideSlope = 2 } = input;
  const bottomWidth = widthFeet;
  const topWidth = bottomWidth + (2 * depthFeet * sideSlope);
  const avgWidth = (bottomWidth + topWidth) / 2;
  const crossSectionArea = avgWidth * depthFeet;
  const volumeCubicFeet = crossSectionArea * lengthFeet;
  const volumeGallons = volumeCubicFeet * 7.48052;
  return Math.round(volumeGallons);
}

/**
 * Calculate area from GeoJSON geometry, returned in square feet.
 *
 * Uses the geodesic area from @turf/area (spherical-excess formula), which
 * correctly accounts for Earth's curvature and longitude convergence at
 * higher latitudes. The previous flat shoelace implementation applied a
 * single `feetPerDegree` scalar to both axes, overstating area by a factor
 * of 1/cos(lat) — roughly +31% at 40°N, +100% at 60°N — which quietly
 * inflated catchment capture estimates everywhere they're shown.
 *
 * 1 m² = 10.7639 ft² (exact: 1 / 0.3048² ).
 */
const SQ_FT_PER_SQ_METER = 10.7639104167;

export function calculateAreaFromGeometry(geometry: any): number {
  if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates) return 0;
  try {
    const areaSquareMeters = turfArea({
      type: 'Feature',
      properties: {},
      geometry,
    });
    if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) return 0;
    return Math.round(areaSquareMeters * SQ_FT_PER_SQ_METER);
  } catch {
    return 0;
  }
}

/**
 * Calculate length from GeoJSON LineString
 */
export function calculateLengthFromGeometry(geometry: any): number {
  if (geometry.type !== 'LineString' || !geometry.coordinates) return 0;
  const coords = geometry.coordinates;
  let totalLength = 0;
  const toRadians = (deg: number) => deg * (Math.PI / 180);
  const R = 20902231; // Earth radius in feet

  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalLength += R * c;
  }
  return Math.round(totalLength);
}

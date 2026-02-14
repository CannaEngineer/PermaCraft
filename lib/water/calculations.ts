import * as turf from '@turf/turf';
import type { Polygon, LineString } from 'geojson';

/**
 * Calculate catchment area in square feet and estimated capture volume
 */
export function calculateCatchment(
  polygon: Polygon,
  rainfallInchesPerYear: number
): {
  areaSquareFeet: number;
  areaAcres: number;
  estimatedCaptureGallons: number;
} {
  const areaSquareMeters = turf.area(polygon);
  const areaSquareFeet = areaSquareMeters * 10.764;
  const areaAcres = areaSquareFeet / 43560;

  // Calculate capture volume
  const rainfallFeet = rainfallInchesPerYear / 12;
  const volumeCubicFeet = areaSquareFeet * rainfallFeet;
  const estimatedCaptureGallons = volumeCubicFeet * 7.48; // ft³ to gallons

  return {
    areaSquareFeet: Math.round(areaSquareFeet),
    areaAcres: parseFloat(areaAcres.toFixed(3)),
    estimatedCaptureGallons: Math.round(estimatedCaptureGallons)
  };
}

/**
 * Calculate swale volume based on length and cross-section
 * Assumes triangular cross-section
 */
export function calculateSwaleVolume(
  lineGeometry: LineString,
  widthFeet: number,
  depthFeet: number
): {
  lengthFeet: number;
  lengthMeters: number;
  volumeCubicFeet: number;
  volumeGallons: number;
  volumeLiters: number;
} {
  const lengthMeters = turf.length(lineGeometry, { units: 'meters' });
  const lengthFeet = lengthMeters * 3.28084;

  // Triangular cross-section: (width * depth / 2) * length
  const volumeCubicFeet = (widthFeet * depthFeet / 2) * lengthFeet;
  const volumeGallons = volumeCubicFeet * 7.48;
  const volumeLiters = volumeGallons * 3.78541;

  return {
    lengthFeet: Math.round(lengthFeet),
    lengthMeters: parseFloat(lengthMeters.toFixed(2)),
    volumeCubicFeet: Math.round(volumeCubicFeet),
    volumeGallons: Math.round(volumeGallons),
    volumeLiters: Math.round(volumeLiters)
  };
}

/**
 * Get average annual rainfall for a location (mock for now)
 * TODO: Integrate with NOAA API or use user input
 */
export async function getAverageRainfall(
  lat: number,
  lng: number
): Promise<number> {
  // For MVP, return a placeholder
  // In production, call NOAA Climate Data API
  return 40; // inches per year (national average)
}

/**
 * GPS Utilities for Field Mapping
 *
 * Reusable functions for GPS accuracy classification, coordinate formatting,
 * and distance calculations. Used across field mapping features:
 * - Planting placement
 * - Zone boundary walking
 * - Soil test marking
 * - Infrastructure location
 */

// ─── Accuracy Classification ────────────────────────────────────────────────

export type AccuracyLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface AccuracyInfo {
  level: AccuracyLevel;
  label: string;
  description: string;
  /** Tailwind color class for the indicator */
  color: string;
  /** Tailwind background color class */
  bgColor: string;
  /** Whether this accuracy is suitable for precise planting placement */
  suitableForPlanting: boolean;
}

/**
 * Classify GPS accuracy in meters into a human-readable level.
 *
 * Thresholds based on real-world GPS behavior:
 * - <3m: RTK/dual-frequency GPS (survey-grade phones, external receivers)
 * - <10m: Good consumer GPS with clear sky (modern smartphones)
 * - <25m: Typical urban/light canopy GPS
 * - >25m: Degraded signal (indoors, heavy canopy, urban canyon)
 */
export function classifyAccuracy(accuracyMeters: number): AccuracyInfo {
  if (accuracyMeters <= 3) {
    return {
      level: 'excellent',
      label: 'Excellent',
      description: 'Survey-grade precision',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500',
      suitableForPlanting: true,
    };
  }
  if (accuracyMeters <= 10) {
    return {
      level: 'good',
      label: 'Good',
      description: 'Suitable for planting placement',
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      suitableForPlanting: true,
    };
  }
  if (accuracyMeters <= 25) {
    return {
      level: 'fair',
      label: 'Fair',
      description: 'Approximate location — move to open sky for better accuracy',
      color: 'text-amber-600',
      bgColor: 'bg-amber-500',
      suitableForPlanting: true,
    };
  }
  return {
    level: 'poor',
    label: 'Poor',
    description: 'Low accuracy — try moving outdoors or to an open area',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    suitableForPlanting: false,
  };
}

// ─── Coordinate Formatting ──────────────────────────────────────────────────

export type CoordinateFormat = 'decimal' | 'dms' | 'ddm';

/**
 * Format coordinates as Degrees Minutes Seconds (e.g., 40°26'46.3"N)
 */
function toDMS(decimal: number, isLat: boolean): string {
  const direction = isLat
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W';
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesDecimal = (abs - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(1);
  return `${degrees}\u00B0${minutes}'${seconds}"${direction}`;
}

/**
 * Format coordinates as Degrees Decimal Minutes (e.g., 40°26.772'N)
 */
function toDDM(decimal: number, isLat: boolean): string {
  const direction = isLat
    ? decimal >= 0 ? 'N' : 'S'
    : decimal >= 0 ? 'E' : 'W';
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutes = ((abs - degrees) * 60).toFixed(3);
  return `${degrees}\u00B0${minutes}'${direction}`;
}

/**
 * Format a lat/lng pair in the specified format.
 */
export function formatCoordinates(
  lat: number,
  lng: number,
  format: CoordinateFormat = 'decimal',
): string {
  switch (format) {
    case 'dms':
      return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
    case 'ddm':
      return `${toDDM(lat, true)} ${toDDM(lng, false)}`;
    case 'decimal':
    default:
      return `${lat.toFixed(7)}, ${lng.toFixed(7)}`;
  }
}

/**
 * Format accuracy as a human-readable string.
 */
export function formatAccuracy(meters: number): string {
  if (meters < 1) return `${(meters * 100).toFixed(0)}cm`;
  if (meters < 100) return `\u00B1${meters.toFixed(1)}m`;
  return `\u00B1${meters.toFixed(0)}m`;
}

// ─── Distance Calculations ──────────────────────────────────────────────────

/**
 * Calculate the distance between two points using the Haversine formula.
 * Returns distance in meters.
 */
export function distanceBetween(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a GPS position is within the bounds of a farm.
 * Uses a simple bounding box check with a buffer.
 */
export function isPositionNearFarm(
  lat: number, lng: number,
  farmCenterLat: number, farmCenterLng: number,
  /** Maximum distance from farm center in meters. Default: 5000 (5km) */
  maxDistanceMeters: number = 5000,
): boolean {
  const distance = distanceBetween(lat, lng, farmCenterLat, farmCenterLng);
  return distance <= maxDistanceMeters;
}

// ─── GPS Marker Types ───────────────────────────────────────────────────────

/**
 * Types of field markers that can be dropped via GPS.
 * This is extensible — add new types as features are built.
 */
export type GPSMarkerType =
  | 'planting'
  | 'soil_test'
  | 'observation'
  | 'waypoint'
  | 'photo'
  | 'infrastructure';

export interface GPSMarkerTypeConfig {
  type: GPSMarkerType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color
}

export const GPS_MARKER_TYPES: Record<GPSMarkerType, GPSMarkerTypeConfig> = {
  planting: {
    type: 'planting',
    label: 'Plant',
    description: 'Mark where you planted something',
    icon: 'Leaf',
    color: 'text-green-600',
  },
  soil_test: {
    type: 'soil_test',
    label: 'Soil Test',
    description: 'Mark a soil test location',
    icon: 'TestTube2',
    color: 'text-amber-700',
  },
  observation: {
    type: 'observation',
    label: 'Observation',
    description: 'Note something at this location',
    icon: 'Eye',
    color: 'text-blue-600',
  },
  waypoint: {
    type: 'waypoint',
    label: 'Waypoint',
    description: 'Mark a reference point',
    icon: 'MapPin',
    color: 'text-purple-600',
  },
  photo: {
    type: 'photo',
    label: 'Photo',
    description: 'Attach a photo to this location',
    icon: 'Camera',
    color: 'text-pink-600',
  },
  infrastructure: {
    type: 'infrastructure',
    label: 'Infrastructure',
    description: 'Mark built structures, fences, paths',
    icon: 'Hammer',
    color: 'text-gray-600',
  },
};

// ─── Accuracy Circle Geometry ───────────────────────────────────────────────

/**
 * Generate a GeoJSON circle polygon representing the GPS accuracy radius.
 * Used to visualize the accuracy zone on the map.
 */
export function accuracyCircleGeoJSON(
  lat: number,
  lng: number,
  radiusMeters: number,
  segments: number = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    // Approximate meters to degrees (varies by latitude)
    const dLat = (radiusMeters / 111320) * Math.cos(angle);
    const dLng = (radiusMeters / (111320 * Math.cos(toRad(lat)))) * Math.sin(angle);
    coords.push([lng + dLng, lat + dLat]);
  }

  return {
    type: 'Feature',
    properties: {
      type: 'gps_accuracy',
      radius_meters: radiusMeters,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

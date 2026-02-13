/**
 * Zoom Enhancement Utilities
 *
 * Provides calculations for progressive visual enhancements as users zoom
 * beyond the satellite tile limit (zoom 18) up to maximum precision (zoom 21).
 */

export const ZOOM_THRESHOLDS = {
  TILE_MAX: 18,        // Max zoom for satellite tiles
  FADE_START: 18,      // Start fading satellite
  DESIGN_MODE: 19,     // Design mode emphasized
  FINE_GRID: 20,       // Enable fine grid subdivision
  MAX_ZOOM: 21,        // Absolute maximum zoom
} as const;

/**
 * Calculate satellite layer opacity based on zoom level
 * Progressive fade: 100% @ z18 → 60% @ z19 → 40% @ z20 → 30% @ z21
 */
export function getSatelliteOpacity(zoom: number): number {
  if (zoom <= 18) return 1.0;
  if (zoom <= 19) return 1.0 - (zoom - 18) * 0.4; // 1.0 → 0.6
  if (zoom <= 20) return 0.6 - (zoom - 19) * 0.2;  // 0.6 → 0.4
  return Math.max(0.3, 0.4 - (zoom - 20) * 0.1);   // 0.4 → 0.3 (min)
}

/**
 * Calculate grid line thickness based on zoom level
 * Progressive thickening: 1px @ z18 → 1.5px @ z19 → 2px @ z20 → 2.5px @ z21
 */
export function getGridThickness(zoom: number): number {
  if (zoom <= 18) return 1;
  if (zoom <= 19) return 1 + (zoom - 18) * 0.5;    // 1 → 1.5
  if (zoom <= 20) return 1.5 + (zoom - 19) * 0.5;  // 1.5 → 2
  return 2 + (zoom - 20) * 0.5;                     // 2 → 2.5
}

/**
 * Calculate zone boundary thickness based on zoom level
 * Progressive thickening: 2px @ z18 → 3px @ z19 → 4px @ z20 → 5px @ z21
 */
export function getZoneBoundaryThickness(zoom: number): number {
  if (zoom <= 18) return 2;
  if (zoom <= 19) return 2 + (zoom - 18);          // 2 → 3
  if (zoom <= 20) return 3 + (zoom - 19);          // 3 → 4
  return 4 + (zoom - 20);                           // 4 → 5
}

/**
 * Calculate label font size multiplier based on zoom level
 */
export function getLabelSizeMultiplier(zoom: number): number {
  if (zoom <= 18) return 1.0;
  if (zoom <= 19) return 1.0 + (zoom - 18) * 0.1;  // 1.0 → 1.1 (10% increase)
  if (zoom <= 20) return 1.1 + (zoom - 19) * 0.1;  // 1.1 → 1.2 (20% total)
  return 1.2;                                       // Cap at 1.2x
}

/**
 * Calculate planting marker size multiplier based on zoom level
 */
export function getPlantingMarkerSizeMultiplier(zoom: number): number {
  if (zoom <= 18) return 1.0;
  if (zoom <= 19) return 1.0;                       // No change z18-19
  if (zoom <= 20) return 1.0 + (zoom - 19) * 0.25; // 1.0 → 1.25 (25% increase)
  return 1.25 + (zoom - 20) * 0.25;                 // 1.25 → 1.5 (50% total)
}

/**
 * Determine if fine grid subdivision should be shown
 * Subdivision changes from 50ft to 10ft spacing at zoom 20+
 */
export function shouldShowFineGrid(zoom: number): boolean {
  return zoom >= ZOOM_THRESHOLDS.FINE_GRID;
}

/**
 * Calculate snap-to-grid strength (pixel radius for magnetic snap)
 * No snap below zoom 20, increases to 15px max at zoom 21+
 */
export function getSnapStrength(zoom: number): number {
  if (zoom < 20) return 0;
  return Math.min(15, (zoom - 19) * 5); // 0px @ z19 → 5px @ z20 → 10px @ z21
}

/**
 * Determine if precision mode is active
 */
export function isPrecisionMode(zoom: number): boolean {
  return zoom > ZOOM_THRESHOLDS.FADE_START;
}

/**
 * Get user-friendly zoom level label
 */
export function getZoomLabel(zoom: number): string {
  const rounded = Math.round(zoom * 10) / 10; // Round to 1 decimal
  if (zoom > ZOOM_THRESHOLDS.FADE_START) {
    return `Zoom: ${rounded} (Precision Mode)`;
  }
  return `Zoom: ${rounded}`;
}

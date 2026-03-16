import maplibregl from 'maplibre-gl';

export interface SnapshotOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number; // 0-1 for JPEG
  includeUI?: boolean;
  plantings?: any[]; // Planting records with lat/lng/layer/growth fields
  currentYear?: number;
}

import { PLANTING_LAYER_COLORS } from '@/lib/design/design-system';

const LAYER_COLORS = PLANTING_LAYER_COLORS;

/** Calculate planting circle radius in CSS pixels — mirrors PlantingMarker.calculateSize(). */
function calcPlantingRadius(planting: any, year: number, zoom: number): number {
  const plantedYear = planting.planted_year || year;
  const yearsSincePlanting = year - plantedYear;
  const yearsToMaturity = planting.years_to_maturity || 10;
  const growthFraction = Math.max(0, Math.min(yearsSincePlanting / yearsToMaturity, 1));
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-8 * (x - 0.5)));
  const sizeFraction = sigmoid(growthFraction);
  const matureWidth = planting.mature_width_ft || 10;
  const currentWidthMeters = matureWidth * sizeFraction * 0.3048;
  const metersPerPixel = (156543.03392 * Math.cos(planting.lat * Math.PI / 180)) / Math.pow(2, zoom);
  const diameterPixels = (currentWidthMeters / metersPerPixel) * 2.5;
  return Math.max(12, diameterPixels) / 2; // return radius
}

/**
 * Capture map snapshot as data URL.
 * Triggers a repaint and captures synchronously inside the render event
 * to avoid blank WebGL canvas issues. Optionally composites planting
 * markers which are DOM overlays not captured by canvas.toDataURL().
 */
export async function captureMapSnapshot(
  map: maplibregl.Map,
  options: SnapshotOptions = {}
): Promise<string> {
  const {
    format = 'png',
    quality = 0.95,
    plantings,
    currentYear,
  } = options;

  // Wait for map to be fully loaded, but proceed after timeout with whatever is rendered
  await new Promise<void>((resolve) => {
    if (map.loaded()) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => resolve(), 8000);
    map.once('idle', () => {
      clearTimeout(timeout);
      resolve();
    });
  });

  // Trigger a repaint and capture synchronously inside the render event.
  // Do NOT defer with requestAnimationFrame — that extra frame allows
  // the WebGL drawing buffer to be swapped/cleared before toDataURL() runs,
  // producing a blank or partial image.
  const mapDataUrl = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Map snapshot timed out. The map may not be fully rendered.'));
    }, 10000);

    map.once('render', () => {
      clearTimeout(timeout);
      try {
        const canvas = map.getCanvas();
        const result = canvas.toDataURL(`image/${format}`, quality);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    map.triggerRepaint();
  });

  // Validate the captured data URL isn't blank
  if (!mapDataUrl || mapDataUrl.length < 1000) {
    throw new Error('Map snapshot captured a blank image. Please try again.');
  }

  // If no plantings to composite, return the raw canvas capture
  if (!plantings || plantings.length === 0) {
    return mapDataUrl;
  }

  // Composite planting markers onto the captured image.
  // Planting markers are HTML DOM elements positioned on top of the WebGL canvas,
  // so they are NOT captured by canvas.toDataURL(). We draw them manually.
  const year = currentYear || new Date().getFullYear();
  const composited = await compositeWithPlantings(map, mapDataUrl, plantings, year, format, quality);
  return composited;
}

/**
 * Composite planting markers onto a captured map image.
 * Draws colored circles at the correct geo-projected positions.
 */
async function compositeWithPlantings(
  map: maplibregl.Map,
  mapDataUrl: string,
  plantings: any[],
  year: number,
  format: 'png' | 'jpeg',
  quality: number,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Draw the map image
      ctx.drawImage(img, 0, 0);

      // Project planting coordinates to canvas pixels and draw circles
      const container = map.getContainer();
      const cssW = container.offsetWidth;
      const cssH = container.offsetHeight;
      const scaleX = canvas.width / cssW;
      const scaleY = canvas.height / cssH;
      const zoom = map.getZoom();

      ctx.save();
      for (const planting of plantings) {
        const point = map.project([planting.lng, planting.lat]);
        const x = point.x * scaleX;
        const y = point.y * scaleY;
        const radius = calcPlantingRadius(planting, year, zoom) * ((scaleX + scaleY) / 2);
        const color = LAYER_COLORS[planting.layer] || '#16a34a';

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 * ((scaleX + scaleY) / 2);
        ctx.stroke();
      }
      ctx.restore();

      resolve(canvas.toDataURL(`image/${format}`, quality));
    };
    img.onerror = () => resolve(mapDataUrl); // fallback to raw capture
    img.src = mapDataUrl;
  });
}

/**
 * Download snapshot as file
 */
export function downloadSnapshot(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Convert data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

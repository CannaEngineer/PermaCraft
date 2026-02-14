import maplibregl from 'maplibre-gl';

export interface SnapshotOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number; // 0-1 for JPEG
  includeUI?: boolean;
}

/**
 * Capture map snapshot as data URL
 */
export async function captureMapSnapshot(
  map: maplibregl.Map,
  options: SnapshotOptions = {}
): Promise<string> {
  const {
    width = 1920,
    height = 1080,
    format = 'png',
    quality = 0.95,
    includeUI = false
  } = options;

  // Wait for map to be idle
  await new Promise(resolve => {
    if (map.loaded()) {
      resolve(null);
    } else {
      map.once('idle', () => resolve(null));
    }
  });

  const canvas = map.getCanvas();

  if (includeUI) {
    // Capture entire map container with UI overlays
    // (More complex - requires html2canvas or similar)
    return canvas.toDataURL(`image/${format}`, quality);
  } else {
    // Capture just the map canvas
    return canvas.toDataURL(`image/${format}`, quality);
  }
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

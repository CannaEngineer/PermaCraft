import maplibregl from 'maplibre-gl';

export interface SnapshotOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg';
  quality?: number; // 0-1 for JPEG
  includeUI?: boolean;
}

/**
 * Capture map snapshot as data URL.
 * Triggers a repaint before capturing to avoid blank WebGL canvas issues.
 */
export async function captureMapSnapshot(
  map: maplibregl.Map,
  options: SnapshotOptions = {}
): Promise<string> {
  const {
    format = 'png',
    quality = 0.95,
  } = options;

  // Wait for map to be fully loaded
  await new Promise<void>(resolve => {
    if (map.loaded()) {
      resolve();
    } else {
      map.once('idle', () => resolve());
    }
  });

  // Trigger a repaint and capture on the next render frame.
  // This avoids the blank canvas issue with WebGL's preserveDrawingBuffer.
  const dataUrl = await new Promise<string>((resolve) => {
    map.once('render', () => {
      requestAnimationFrame(() => {
        const canvas = map.getCanvas();
        const result = canvas.toDataURL(`image/${format}`, quality);
        resolve(result);
      });
    });
    map.triggerRepaint();
  });

  // Validate the captured data URL isn't blank
  // A blank PNG data URL is typically very short (< 1000 chars)
  if (!dataUrl || dataUrl.length < 1000) {
    throw new Error('Map snapshot captured a blank image. Please try again.');
  }

  return dataUrl;
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

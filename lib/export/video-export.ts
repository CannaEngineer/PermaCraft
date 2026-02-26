// lib/export/video-export.ts

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import maplibregl from 'maplibre-gl';
import { getSeason, getSeasonalInfo } from '@/lib/time-machine/seasonal-context';

export interface VideoExportOptions {
  map: maplibregl.Map;
  farmName: string;
  minYear: number;
  maxYear: number;
  durationSeconds: number; // 15, 30, or 60
  setYear: (year: number) => void;
  onProgress?: (year: number, total: number, phase: 'capturing' | 'encoding') => void;
  plantings?: any[]; // Planting records with lat/lng/layer/growth fields
}

// Mirrors LAYER_COLORS from planting-marker.tsx
const LAYER_COLORS: Record<string, string> = {
  canopy: '#166534',
  understory: '#16a34a',
  shrub: '#22c55e',
  herbaceous: '#84cc16',
  groundcover: '#a3e635',
  vine: '#a855f7',
  root: '#78350f',
  aquatic: '#0284c7',
};

/** Calculate planting circle radius in map canvas pixels — mirrors PlantingMarker.calculateSize(). */
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

/** Draw planting circles onto the compositing canvas, projecting geo coords to video pixels. */
function drawPlantings(
  ctx: CanvasRenderingContext2D,
  map: maplibregl.Map,
  plantings: any[],
  year: number,
): void {
  const mapCanvas = map.getCanvas();
  const scaleX = VIDEO_WIDTH / mapCanvas.width;
  const scaleY = VIDEO_HEIGHT / mapCanvas.height;
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
}

const VIDEO_WIDTH = 1280;
const VIDEO_HEIGHT = 720;

/** Check if VideoEncoder (WebCodecs) is supported in this browser. */
export function isVideoEncoderSupported(): boolean {
  return typeof VideoEncoder !== 'undefined';
}

/**
 * Capture a single year's map frame as a composited canvas (map + overlay).
 * Uses the same repaint→render→rAF pattern as captureMapSnapshot().
 */
async function captureFrame(
  map: maplibregl.Map,
  year: number,
  farmName: string,
  plantings: any[],
): Promise<HTMLCanvasElement> {
  // Wait for map repaint
  const mapDataUrl = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Frame capture timed out')), 8000);
    map.once('render', () => {
      requestAnimationFrame(() => {
        clearTimeout(timeout);
        resolve(map.getCanvas().toDataURL('image/jpeg', 0.85));
      });
    });
    map.triggerRepaint();
  });

  // Composite onto output canvas
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // Draw map image (stretched to fill)
  await new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
      resolve();
    };
    img.onerror = () => resolve(); // proceed even if image fails
    img.src = mapDataUrl;
  });

  // Draw plant markers (HTML DOM overlays — not in WebGL canvas)
  if (plantings.length > 0) {
    drawPlantings(ctx, map, plantings, year);
  }

  drawOverlay(ctx, year, farmName);
  return canvas;
}

/** Draw year + season badge overlay on the compositing canvas. */
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  year: number,
  farmName: string
): void {
  const season = getSeason(new Date(year, 2, 1).getMonth()); // Use March (spring) for cleaner labels
  const { icon: seasonIcon, label: seasonLabel } = getSeasonalInfo(season);

  // Bottom-right badge: "🌸 Spring · 2031"
  const badgeText = `${seasonIcon}  ${seasonLabel} · ${year}`;
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  const textW = ctx.measureText(badgeText).width;
  const padX = 20;
  const padY = 14;
  const badgeW = textW + padX * 2;
  const badgeH = 30 + padY * 2;
  const badgeX = VIDEO_WIDTH - badgeW - 20;
  const badgeY = VIDEO_HEIGHT - badgeH - 20;

  // Semi-transparent dark pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
  } else {
    ctx.rect(badgeX, badgeY, badgeW, badgeH);
  }
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.fillText(badgeText, badgeX + padX, badgeY + padY + 24);

  // Top-left farm name label
  ctx.font = '15px system-ui, -apple-system, sans-serif';
  const nameW = ctx.measureText(farmName).width + 24;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.50)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(14, 14, nameW, 34, 6);
  } else {
    ctx.rect(14, 14, nameW, 34);
  }
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(farmName, 26, 36);
}

/**
 * Export the time machine animation as an MP4.
 * Steps through years minYear→maxYear, captures each frame, encodes with VideoEncoder + mp4-muxer.
 * Returns an MP4 Blob.
 */
export async function exportTimeMachineVideo(options: VideoExportOptions): Promise<Blob> {
  const { map, farmName, minYear, maxYear, durationSeconds, setYear, onProgress, plantings = [] } = options;

  if (!isVideoEncoderSupported()) {
    throw new Error('Video export requires Chrome 94+, Edge 94+, or Safari 16+');
  }

  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );
  const totalYears = years.length;

  // Frame timing: evenly distribute total duration across all years
  // VideoEncoder timestamps are in microseconds
  const frameDurationMicros = Math.round((durationSeconds / totalYears) * 1_000_000);

  // Set up muxer
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    },
    fastStart: 'in-memory',
  });

  // Collect encoded chunks
  const encodedChunks: EncodedVideoChunk[] = [];
  const encodedMetas: EncodedVideoChunkMetadata[] = [];

  let encoderError: Error | DOMException | null = null;

  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      encodedChunks.push(chunk);
      encodedMetas.push(meta ?? {});
    },
    error: (e) => { encoderError = e; },
  });

  encoder.configure({
    codec: 'avc1.42001f', // H.264 Baseline profile, level 3.1
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    bitrate: 3_000_000,
    framerate: Math.max(1, totalYears / durationSeconds),
  });

  try {
    // Capture each year
    for (let i = 0; i < years.length; i++) {
      const year = years[i];
      onProgress?.(year, totalYears, 'capturing');

      // Set year, wait for React + map to update
      setYear(year);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await captureFrame(map, year, farmName, plantings);
      const bitmap = await createImageBitmap(canvas);
      const timestampMicros = i * frameDurationMicros;
      const frame = new VideoFrame(bitmap, { timestamp: timestampMicros, duration: frameDurationMicros });

      try {
        encoder.encode(frame, { keyFrame: i === 0 || i % 10 === 0 });
      } finally {
        frame.close();
        bitmap.close();
      }
    }

    onProgress?.(maxYear, totalYears, 'encoding');
    await encoder.flush();
    if (encoderError) throw encoderError;
  } finally {
    encoder.close();
  }

  // Feed chunks to muxer in order
  for (let i = 0; i < encodedChunks.length; i++) {
    muxer.addVideoChunk(encodedChunks[i], encodedMetas[i]);
  }

  muxer.finalize();

  return new Blob([target.buffer], { type: 'video/mp4' });
}

/** Trigger a browser download of an MP4 blob. */
export function downloadVideo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

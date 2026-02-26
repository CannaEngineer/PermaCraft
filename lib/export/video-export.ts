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
  farmName: string
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
  const { map, farmName, minYear, maxYear, durationSeconds, setYear, onProgress } = options;

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

      const canvas = await captureFrame(map, year, farmName);
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

# Time Machine MP4 Export — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "Export MP4" button that renders the farm's 20-year growth simulation as a downloadable video — satellite map with growing plant markers + year/season overlay.

**Architecture:** Entirely client-side. `lib/export/video-export.ts` steps through years, captures each year's map frame via `map.triggerRepaint()` + `canvas.toDataURL()`, composites a year/season overlay using Canvas 2D, then encodes all frames into MP4 using the browser-native `VideoEncoder` (WebCodecs API) and `mp4-muxer`. Button appears in two places: the time machine panel header and the export panel.

**Tech Stack:** `mp4-muxer`, `VideoEncoder` (WebCodecs, browser-native), MapLibre GL JS canvas capture, Canvas 2D overlay drawing

---

## Codebase Context

Before starting, understand these key files:

- **`lib/export/snapshot.ts`** — existing `captureMapSnapshot()`. Reuse the `triggerRepaint → once('render') → requestAnimationFrame → toDataURL` pattern for per-frame capture.
- **`lib/time-machine/seasonal-context.ts`** — `getSeason(month)` and `getSeasonalInfo(season)` return season label + emoji. Import these for the overlay.
- **`components/time-machine/redesigned-time-machine.tsx`** — time machine UI. Add export button to header area.
- **`components/export/export-panel.tsx`** — existing PNG/PDF export UI. Add video export card here too.
- **`components/map/farm-map.tsx:106-125`** — `FarmMapProps` interface. Add `externalCurrentYear` and `externalOnYearChange` props so `unified-canvas.tsx` can control the year state.
- **`components/map/farm-map.tsx:221-222`** — `projectionYear` state lives here. Will be lifted to `unified-canvas.tsx`.
- **`components/canvas/unified-canvas.tsx:570-585`** — `<FarmMap>` usage. Add external year props.
- **`components/canvas/unified-canvas.tsx:725-726`** — `<ExportPanel>` usage. Add video export props.

---

## Task 1: Install mp4-muxer

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

```bash
npm install mp4-muxer
```

**Step 2: Verify install**

```bash
node -e "require('mp4-muxer'); console.log('ok')"
```

Expected: `ok`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(video-export): install mp4-muxer"
```

---

## Task 2: Core video export utility

**Files:**
- Create: `lib/export/video-export.ts`

**Step 1: Create the file with all types and helpers**

```typescript
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

  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      encodedChunks.push(chunk);
      encodedMetas.push(meta ?? {});
    },
    error: (e) => { throw e; },
  });

  encoder.configure({
    codec: 'avc1.42001f', // H.264 Baseline profile, level 3.1
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    bitrate: 3_000_000,
    framerate: Math.max(1, totalYears / durationSeconds),
  });

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

    encoder.encode(frame, { keyFrame: i === 0 || i % 10 === 0 });
    frame.close();
    bitmap.close();
  }

  onProgress?.(maxYear, totalYears, 'encoding');
  await encoder.flush();
  encoder.close();

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
```

**Step 2: Verify TypeScript compiles (no test needed for pure orchestration logic)**

```bash
npx tsc --noEmit 2>&1 | grep "video-export"
```

Expected: no errors (or only `Cannot find name 'VideoEncoder'` — that's fine, it's a browser global not in the Node types)

If you see `Cannot find name 'VideoEncoder'`, add to `tsconfig.json` `"lib"` array: `"dom"` (it should already be there). If still failing, add `/// <reference lib="dom" />` at the top of the file.

**Step 3: Commit**

```bash
git add lib/export/video-export.ts
git commit -m "feat(video-export): add core time machine video export utility"
```

---

## Task 3: Shared video export UI component

**Files:**
- Create: `components/export/time-machine-video-export.tsx`

This component is rendered in two places (time machine header and export panel), so it encapsulates all UI and state.

**Step 1: Create the component**

```tsx
// components/export/time-machine-video-export.tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Video, Loader2 } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import {
  exportTimeMachineVideo,
  downloadVideo,
  isVideoEncoderSupported,
} from '@/lib/export/video-export';

interface TimeMachineVideoExportProps {
  map: maplibregl.Map | null;
  farmName: string;
  minYear: number;
  maxYear: number;
  currentYear: number;
  setCurrentYear: (year: number) => void;
  hasPlantings: boolean;
}

const DURATION_OPTIONS = [
  { label: '15s', seconds: 15 },
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
] as const;

export function TimeMachineVideoExport({
  map,
  farmName,
  minYear,
  maxYear,
  currentYear,
  setCurrentYear,
  hasPlantings,
}: TimeMachineVideoExportProps) {
  const [duration, setDuration] = useState<15 | 30 | 60>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ year: number; total: number; phase: string } | null>(null);
  const { toast } = useToast();

  const originalYear = currentYear; // Remember so we can restore after export

  const handleExport = useCallback(async () => {
    if (!map) {
      toast({ title: 'Map not ready', variant: 'destructive' });
      return;
    }
    if (!isVideoEncoderSupported()) {
      toast({
        title: 'Video export requires Chrome 94+, Edge 94+, or Safari 16+',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setProgress({ year: minYear, total: maxYear - minYear + 1, phase: 'capturing' });

    try {
      const blob = await exportTimeMachineVideo({
        map,
        farmName,
        minYear,
        maxYear,
        durationSeconds: duration,
        setYear: setCurrentYear,
        onProgress: (year, total, phase) => setProgress({ year, total, phase }),
      });

      const filename = `${farmName.replace(/\s+/g, '-')}-growth-${duration}s.mp4`;
      downloadVideo(blob, filename);
      toast({ title: 'Time lapse exported!' });
    } catch (error: any) {
      console.error('Video export failed:', error);
      toast({
        title: error?.message ?? 'Video export failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Restore original year
      setCurrentYear(originalYear);
      setIsExporting(false);
      setProgress(null);
    }
  }, [map, farmName, minYear, maxYear, duration, setCurrentYear, originalYear, toast]);

  const disabled = !map || !hasPlantings || isExporting;

  return (
    <div className="space-y-3">
      {/* Duration selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Duration:</span>
        <div className="flex gap-1">
          {DURATION_OPTIONS.map(({ label, seconds }) => (
            <Button
              key={seconds}
              size="sm"
              variant={duration === seconds ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() => setDuration(seconds)}
              disabled={isExporting}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Export button */}
      <Button
        onClick={handleExport}
        disabled={disabled}
        className="w-full"
        variant="outline"
        title={!hasPlantings ? 'Add plantings to export a growth timeline' : undefined}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Video className="h-4 w-4 mr-2" />
        )}
        {isExporting
          ? progress?.phase === 'capturing'
            ? `Capturing year ${progress.year} of ${progress.total}…`
            : 'Encoding video…'
          : 'Export Time Lapse MP4'}
      </Button>

      {!hasPlantings && (
        <p className="text-xs text-muted-foreground text-center">
          Add plantings to the map to export a growth timeline.
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "time-machine-video"
```

Expected: no errors

**Step 3: Commit**

```bash
git add components/export/time-machine-video-export.tsx
git commit -m "feat(video-export): add TimeMachineVideoExport UI component"
```

---

## Task 4: Lift projection year state to unified-canvas.tsx

The `projectionYear` state currently lives inside `farm-map.tsx` (line 221). We need to lift it to `unified-canvas.tsx` so both `FarmMap` and `ExportPanel` can share it.

**Files:**
- Modify: `components/map/farm-map.tsx` (add optional external year props, ~lines 106-125 and 221-222)
- Modify: `components/canvas/unified-canvas.tsx` (add year state, pass to FarmMap)

**Step 1: Add optional external year props to `FarmMapProps` in `farm-map.tsx`**

In `components/map/farm-map.tsx`, find the `FarmMapProps` interface (line 106) and add two optional props after `hideStatusBar`:

```typescript
/** Optional external year control — if provided, overrides internal projectionYear state. */
externalCurrentYear?: number;
externalOnYearChange?: (year: number) => void;
```

The full updated interface lines 123-125:
```typescript
  /** When true, hides the bottom status bar / drawer (use on non-farm sections to avoid context confusion). */
  hideStatusBar?: boolean;
  /** Optional external year control — if provided, overrides internal projectionYear state. */
  externalCurrentYear?: number;
  externalOnYearChange?: (year: number) => void;
}
```

**Step 2: Use external props when provided in `farm-map.tsx`**

In `FarmMap` function destructuring (line 130), add the two new props.

Then replace line 221-222 (`const [projectionYear, setProjectionYear] = ...`) with:

```typescript
  // Time Machine state - projection year for growth simulation
  // If external control props are provided, use them; otherwise use internal state
  const [internalYear, setInternalYear] = useState<number>(
    externalCurrentYear ?? new Date().getFullYear()
  );
  const projectionYear = externalCurrentYear ?? internalYear;
  const setProjectionYear = externalOnYearChange ?? setInternalYear;
```

Everything else in `farm-map.tsx` that uses `projectionYear` or `setProjectionYear` stays the same — no other changes needed.

**Step 3: Add `projectionYear` state to `unified-canvas.tsx`**

In `components/canvas/unified-canvas.tsx`, near the other `useState` declarations (around line 210), add:

```typescript
const [projectionYear, setProjectionYear] = useState<number>(new Date().getFullYear());
const minYear = new Date().getFullYear();
const maxYear = new Date().getFullYear() + 20;
```

**Step 4: Pass external year props to `<FarmMap>` in `unified-canvas.tsx`**

Find the `<FarmMap>` usage (line 570-585) and add these two props:

```tsx
externalCurrentYear={projectionYear}
externalOnYearChange={setProjectionYear}
```

**Step 5: Verify the app still runs**

```bash
npm run dev
```

Open a farm page. Check the time machine still works (play, pause, year stepping).

**Step 6: Commit**

```bash
git add components/map/farm-map.tsx components/canvas/unified-canvas.tsx
git commit -m "feat(video-export): lift projection year state to unified-canvas"
```

---

## Task 5: Add video export card to ExportPanel

**Files:**
- Modify: `components/export/export-panel.tsx`
- Modify: `components/canvas/unified-canvas.tsx` (pass new props to ExportPanel)

**Step 1: Update `ExportPanelProps` in `export-panel.tsx`**

Add three new optional props to the interface:

```typescript
interface ExportPanelProps {
  farmId: string;
  farmName: string;
  mapInstance: maplibregl.Map | null;
  // Video export props (optional — only present when time machine is available)
  plantings?: any[];
  currentYear?: number;
  setCurrentYear?: (year: number) => void;
  minYear?: number;
  maxYear?: number;
}
```

**Step 2: Add the import and video export card to `export-panel.tsx`**

At the top, add:
```typescript
import { TimeMachineVideoExport } from './time-machine-video-export';
import { Clapperboard } from 'lucide-react';
```

After the existing PDF `<Button>` block and before the export tips `<div>`, add a new card:

```tsx
        {/* Time Machine Video Export */}
        {setCurrentYear && currentYear !== undefined && minYear !== undefined && maxYear !== undefined && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Time Lapse Video</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Export the 20-year growth simulation as an MP4 time lapse.
            </p>
            <TimeMachineVideoExport
              map={mapInstance}
              farmName={farmName}
              minYear={minYear}
              maxYear={maxYear}
              currentYear={currentYear}
              setCurrentYear={setCurrentYear}
              hasPlantings={(plantings?.length ?? 0) > 0}
            />
          </div>
        )}
```

**Step 3: Pass the new props from `unified-canvas.tsx` to `<ExportPanel>`**

Find the `<ExportPanel>` usage in `unified-canvas.tsx` (line 726) and update it:

```tsx
<ExportPanel
  farmId={farm.id}
  farmName={farm.name}
  mapInstance={mapRef.current}
  plantings={plantings}
  currentYear={projectionYear}
  setCurrentYear={setProjectionYear}
  minYear={minYear}
  maxYear={maxYear}
/>
```

**Step 4: Verify in browser**

```bash
npm run dev
```

1. Open a farm with plantings
2. Open the export drawer
3. Confirm the "Time Lapse Video" section appears with duration picker and Export button

**Step 5: Commit**

```bash
git add components/export/export-panel.tsx components/canvas/unified-canvas.tsx
git commit -m "feat(video-export): add time lapse video card to export panel"
```

---

## Task 6: Add export button to time machine header

**Files:**
- Modify: `components/time-machine/redesigned-time-machine.tsx`

**Step 1: Add new props to the interface**

In `RedesignedTimeMachineProps` (line 23), add:

```typescript
  map?: maplibregl.Map | null;
  farmName?: string;
  plantings?: any[]; // the full plantings array for hasPlantings check
```

Import at the top:
```typescript
import maplibregl from 'maplibre-gl';
import { TimeMachineVideoExport } from '@/components/export/time-machine-video-export';
```

**Step 2: Add the export button area to the header**

Find the header section (lines 113-126):

```tsx
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground">Time Machine</h2>
          <p className="text-xs text-muted-foreground">
            Simulate plant growth over {maxYear - minYear} years
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
```

Add a collapsible export section below the header (before the `{/* Timeline */}` div):

```tsx
      {/* Video Export (collapsible) */}
      {map && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <TimeMachineVideoExport
            map={map}
            farmName={farmName ?? 'Farm'}
            minYear={minYear}
            maxYear={maxYear}
            currentYear={currentYear}
            setCurrentYear={onYearChange}
            hasPlantings={(plantings?.length ?? 0) > 0}
          />
        </div>
      )}
```

**Step 3: Pass the new props from `farm-map.tsx` to `<RedesignedTimeMachine>`**

In `farm-map.tsx`, find where `RedesignedTimeMachine` is rendered (around line 508-514 inside `MapBottomDrawer`). It's inside a large JSX block in `map-bottom-drawer.tsx`.

Actually, `RedesignedTimeMachine` is rendered inside `components/map/map-bottom-drawer.tsx` (line 508). We need to pass `map` and `farmName` through `MapBottomDrawer` props.

Find `MapBottomDrawer` props interface in `map-bottom-drawer.tsx` and add:
```typescript
  map?: maplibregl.Map | null;
  farmName?: string;
```

Then pass them through to `RedesignedTimeMachine` inside `map-bottom-drawer.tsx`:
```tsx
<RedesignedTimeMachine
  plantings={plantings}
  currentYear={currentYear}
  onYearChange={onYearChange}
  minYear={minYear}
  maxYear={maxYear}
  map={map}
  farmName={farmName}
/>
```

Then in `farm-map.tsx`, where `MapBottomDrawer` is used (around line 3590), add:
```tsx
map={map.current}
farmName={farm.name}
```

**Step 4: Test in browser**

```bash
npm run dev
```

1. Open a farm map with plantings
2. Open the time machine tab in the bottom drawer
3. Confirm "Export Time Lapse MP4" section appears below the header with duration picker

**Step 5: Commit**

```bash
git add components/time-machine/redesigned-time-machine.tsx components/map/map-bottom-drawer.tsx components/map/farm-map.tsx
git commit -m "feat(video-export): add export button to time machine header"
```

---

## Task 7: End-to-end test and polish

**Step 1: Manual test — export panel path**

1. Open farm with several plantings at different layers
2. Navigate to export section (drawer → export)
3. Select "30s" duration
4. Click "Export Time Lapse MP4"
5. Watch progress: "Capturing year 2026 of 21…" → "Encoding video…"
6. Confirm download triggers automatically (`.mp4` file)
7. Open the `.mp4` file and verify: growing plant dots, year badge visible, farm name visible

**Step 2: Manual test — time machine path**

1. Open farm map → time machine tab
2. Confirm "Export Time Lapse MP4" section is visible
3. Export with 15s duration
4. Confirm video shows same content as above

**Step 3: Test edge cases**

- No plantings: confirm button is disabled and message shows
- Small screen: confirm UI doesn't overflow
- During export: confirm time machine year indicator updates visually (stepping through years)
- After export: confirm year resets to where it was before export started

**Step 4: Fix any issues found during testing, then commit**

```bash
git add -p  # stage only the relevant fixes
git commit -m "fix(video-export): polish and edge case fixes"
```

---

## Success Criteria

- [ ] MP4 downloads successfully with a 20-year farm that has plantings
- [ ] Year/season badge visible and readable on the video
- [ ] Farm name visible in top-left corner
- [ ] Progress updates visible during capture
- [ ] Year resets to original position after export
- [ ] Button disabled (with message) when no plantings
- [ ] Button appears in both the time machine header and the export panel
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Works in Chrome 94+, Edge 94+, Safari 16+

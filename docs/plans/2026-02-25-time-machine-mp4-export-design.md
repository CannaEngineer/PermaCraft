# Time Machine MP4 Export — Design

## Goal

Add an "Export MP4" option that renders the farm's 20-year growth timeline as a downloadable video. The video shows the satellite map with plant markers growing over time, plus a year/season overlay.

## Architecture

Entirely client-side. No server involvement, no WASM, no special HTTP headers needed.

**Encoding stack:** `mp4-muxer` (50KB) + browser-native `VideoEncoder` (WebCodecs API — Chrome 94+, Edge 94+, Safari 16+).

**Frame source:** Composite of two layers on a 1280×720 canvas:
1. MapLibre WebGL canvas — captured per-frame using the existing repaint-and-capture pattern from `lib/export/snapshot.ts`
2. Canvas 2D overlay — year number, season emoji, farm name — drawn programmatically

**Duration:** User picks 15s / 30s / 60s before exporting. Frame rate = `numYears / totalSeconds` (e.g., 20 years / 30s ≈ 0.67 fps → each year frame displays ~1.5 seconds).

## Frame Capture Flow (per year)

```
setCurrentYear(year)
  → requestAnimationFrame (React re-renders map markers)
  → map.triggerRepaint()
  → map.once('render')
  → requestAnimationFrame
  → map.getCanvas().toDataURL('image/jpeg', 0.85)   ← reliable WebGL capture
  → draw map onto compositing canvas (1280×720)
  → draw overlay: "🌸 Spring · 2031", farm name corner badge
  → canvas.toBlob('image/jpeg') → VideoFrame → VideoEncoder.encode()
```

## Encoding Flow

```
VideoEncoder({ codec: 'avc1.42001f', width: 1280, height: 720 })
  → for each encoded chunk → mp4-muxer.addVideoChunk()
  → after all years → muxer.finalize()
  → Uint8Array → Blob('video/mp4') → URL.createObjectURL() → <a>.click()
```

## UI — Two Entry Points

### 1. Time Machine Header (primary)
A "Export MP4" button in the `RedesignedTimeMachine` header bar, next to the close button. Opens a small popover/sheet with duration options + progress display.

### 2. Export Panel (secondary)
A new card in `components/export/export-panel.tsx` below the PDF card, labelled "Time Machine Video". Same duration picker + button. Requires `mapInstance` prop (already available).

## Progress UX

Four phases shown as a progress indicator:
- **Capturing frames** (year X of Y) — bulk of the time
- **Encoding video** — fast, <1s
- **Done — downloading** — auto-triggers download

On error (VideoEncoder not supported): toast "Video export requires Chrome 94+, Edge 94+, or Safari 16+".

## Files

| File | Action |
|------|--------|
| `lib/export/video-export.ts` | New — orchestration: frame capture, canvas composite, encode, download |
| `components/export/time-machine-video-export.tsx` | New — shared UI: duration picker, progress display, export trigger |
| `components/export/export-panel.tsx` | Modify — add "Time Machine Video" card |
| `components/time-machine/redesigned-time-machine.tsx` | Modify — add export button to header |
| `package.json` | Add `mp4-muxer` dependency |

## Dependencies

- `mp4-muxer` — MP4 container muxing, ~50KB, zero deps
- `VideoEncoder` — native browser WebCodecs API (no install)
- No WASM, no COOP/COEP headers, no server changes

## Constraints & Edge Cases

- **No plantings**: Button disabled with tooltip "Add plantings to export a growth timeline"
- **Map not ready**: Disable button if `mapInstance` is null
- **VideoEncoder unsupported**: Show toast, no fallback (too complex to add WebM fallback for MVP)
- **Very long recording**: 60s export of a 20-year span still only = 20 captured frames (fast)
- **Map tiles not loaded**: Reuse existing `map.once('idle')` wait from snapshot.ts before starting capture loop

## Testing

- [ ] 20-year span exports with correct number of frames
- [ ] Year overlay text is legible on both light/dark satellite tiles
- [ ] Duration picker correctly sets frame timing
- [ ] Progress updates each year step
- [ ] Download triggers automatically on completion
- [ ] Disabled state when no mapInstance or no plantings
- [ ] Error toast on unsupported browser
- [ ] Button present in both time machine header and export panel

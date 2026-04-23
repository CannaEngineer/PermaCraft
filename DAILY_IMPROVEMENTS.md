# PermaCraft — 2026-04-23
## Focus: Map Core (Thursday)

### 1. Fix maxZoom capped at 18 after base map layer change
File: `components/map/farm-map.tsx` (line 2596)
What changed: `setMaxZoom(18)` → `setMaxZoom(21)` after `setStyle()` in `changeMapLayer`
Map/dashboard impact: Designers can now zoom to z19-21 after switching base map layers. Previously, switching from satellite to topo and back permanently locked the user out of precision mode — snap-to-grid, fine grid subdivision, and dimension labels all became inaccessible.

### 2. Restore lines after base map layer change
File: `components/map/farm-map.tsx` (lines 2643-2697)
What changed: `changeMapLayer` now re-creates `lines-source`, `design-lines`, and `line-arrows` layers after `setStyle()` destroys them, then calls `loadLines()` to repopulate the data. Also reloads the arrow icon for directional flow lines.
Map/dashboard impact: Lines (swales, fences, hedges, contours, flow paths) no longer disappear when switching base maps. Previously, all drawn lines vanished permanently after any layer switch with no way to recover except reloading the page.

### 3. Extract shared MapboxDraw styles constant
File: `components/map/farm-map.tsx` (lines 105-274)
What changed: Extracted the 12-element MapboxDraw styles array and draw options into `MAPBOX_DRAW_STYLES` and `MAPBOX_DRAW_OPTIONS` constants shared between initial map setup and post-layer-change re-initialization. Removed ~180 lines of duplicate code.
Map/dashboard impact: No visual change. Eliminates the risk of drawing style divergence — previously a style fix in one copy wouldn't reach the other, causing inconsistent vertex/boundary/polygon rendering after layer switches.

### 4. Extract addColoredZoneLayers via ref for reuse
File: `components/map/farm-map.tsx`
What changed: The `addColoredZoneLayers` function (adds draw-zones source, farm boundary layers, colored zone fill/stroke, colored lines, and colored points) is now stored in `addColoredZoneLayersRef` and called from both initial load and `changeMapLayer`, replacing a second ~120-line duplicate block.
Map/dashboard impact: No visual change. Same deduplication benefit as #3 — zone coloring logic is now single-source-of-truth.

## Watch for
- After layer change, the 200ms setTimeout for `addColoredZoneLayersRef` still exists. If a future change makes draw initialization slower, zone colors could flash briefly. Consider replacing with an event-based approach.
- The arrow icon (`/icons/arrow.svg`) load is async — if the icon fails to load after layer change, directional flow arrows won't render. This is the same graceful degradation as the initial load, but worth monitoring.
- Lines source uses `{ type: 'FeatureCollection', features: [] }` as initial empty data, then `loadLines()` fetches from API. Brief flash of no lines is possible during the fetch.

# PermaCraft — 2026-06-12
## Focus: Map Core (Thursday)

### 1. Fix stale drawing mode transition detection
File: `components/map/farm-map.tsx` (line 506)
What changed: `prevExternalDrawingModeRef` was initialized to the current prop value instead of `false`, so when the component mounted with `externalDrawingMode=true` (e.g. immersive editor starting in drawing mode), the first idle-to-drawing transition was never detected and the draw tool wouldn't activate.
Map/dashboard impact: Drawing tools now activate reliably on first use in the immersive editor, regardless of the initial prop state.

### 2. Prevent data loss during rapid layer switching
File: `components/map/farm-map.tsx` (lines 487, 2579-2836)
What changed: Added a `layerSwitchInProgressRef` guard that blocks concurrent `changeMapLayer()` calls. Previously, clicking a new map layer while a previous `setStyle()` was still waiting for its "idle" event would overwrite `savedFeaturesRef` with an empty draw store (since the old draw instance was already destroyed), silently losing all drawn zones and lines. A 10-second safety timeout ensures the lock can't permanently block the user.
Map/dashboard impact: Users who rapidly switch between satellite/topo/street layers no longer risk losing their drawn features.

### 3. Resilient GeoJSON parsing for line features
File: `components/map/farm-map.tsx` (lines 755-777, 1137-1159)
What changed: Replaced `.map()` with a `for...of` loop and per-line `try/catch` in both `loadLines()` and the line filter `useEffect`. Previously, a single corrupt line (malformed JSON in geometry or style) would throw inside `.map()` and prevent ALL lines from rendering. Now corrupt lines are skipped with a console warning, and all valid lines still render.
Map/dashboard impact: A single corrupt line record in the database no longer blanks out the entire lines layer. Designers see all their valid work even if one feature has bad data.

### 4. Defensive layer ordering with error handling
File: `components/map/farm-map.tsx` (lines 706-735)
What changed: Wrapped each `moveLayer()` call in `ensureCustomLayersOnTop()` with a try/catch. During concurrent style changes, a layer can be removed between the `getLayer()` check and the `moveLayer()` call, causing an uncaught exception that breaks the ordering of all subsequent layers in the array. The try/catch ensures a single missing layer doesn't prevent the rest from being stacked correctly.
Map/dashboard impact: Custom design layers (zones, lines, grid) maintain correct visual stacking order even during rapid map interactions.

## Watch for
- The layer switch guard timeout (10s) is generous. If a user reports being unable to switch layers, check if the "idle" event is firing reliably after `setStyle()`. Hidden browser tabs can delay idle events significantly.
- Corrupt line data should be investigated at the source. The console warnings added here help identify which line IDs have bad geometry/style JSON in the database.
- The `prevExternalDrawingModeRef` fix assumes the component never needs to start in drawing mode on mount. If a future feature requires mounting directly into drawing mode, the initial `false` value would cause an unnecessary mode transition, but this is safe since MapboxDraw handles redundant mode changes gracefully.

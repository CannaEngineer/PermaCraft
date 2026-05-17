# PermaCraft — 2026-05-17
## Focus: Performance + Reliability (Saturday)

### 1. Debounce zoom state updates to prevent 60fps re-renders
File: `components/map/farm-map.tsx`
What changed: The `handleZoomChange` callback previously called `setCurrentZoom(zoom)` on every zoom event frame (~60 per second during smooth zoom), triggering a full React re-render that cascaded to every `PlantingMarker`, the zoom label, and the measurement overlay. Now the ref is updated immediately (for threshold checks and MapLibre paint property updates) while the React state update is debounced to 100ms. The debounce timer is cleaned up on unmount.
Map/dashboard impact: Zooming feels smoother, especially on farms with many plantings. PlantingMarker components no longer re-render 60x/sec during zoom — only 10x/sec at most. MapLibre paint property changes (satellite opacity, grid thickness, zone borders) still update every frame for visual smoothness since they're GPU-side operations.

### 2. Replace O(n) feature type lookup with pre-built Map
File: `components/map/feature-list-panel.tsx`
What changed: `getFeatureType()` previously scanned through all zones, plantings, lines, guilds, and phases arrays (5 sequential `.some()` calls) on every feature click to determine its type. Replaced with a memoized `Map<string, FeatureType>` built once when feature arrays change, giving O(1) lookup per click.
Map/dashboard impact: Clicking a feature in the feature list panel is now instant regardless of how many features exist on the farm. Previously, a farm with 100+ plantings and 20+ zones could have noticeable delay on each click.

### 3. Cache parsed permaculture_functions JSON with WeakMap
Files: `lib/map/feature-search.ts`, `components/map/map-bottom-drawer.tsx`
What changed: Both the feature search and the vital count calculation were calling `JSON.parse(planting.permaculture_functions)` for every planting on every invocation — search fires on every keystroke (debounced to 300ms), and vital count recalculates when plantings change. Added a `WeakMap`-based cache in `feature-search.ts` so each planting's functions are parsed once and reused. The map-bottom-drawer now imports and uses the same cached parser.
Map/dashboard impact: Feature search typing feels more responsive on farms with many plantings. The WeakMap ensures parsed results are garbage-collected when planting objects are replaced (e.g., after a save), so there's no stale data risk.

### 4. Remove dead event listeners from measurement overlay
File: `components/map/measurement-overlay.tsx`
What changed: The component registered `move` and `zoom` event listeners on the MapLibre map instance that called an empty `updateOverlay` function — pure overhead with no rendering output. Removed the unused `useEffect`, `useState`, distance calculation functions, and the dead listeners. The SVG container and props interface remain intact for when measurement rendering is implemented.
Map/dashboard impact: Two fewer event listeners firing on every map move and zoom event. Minor but cumulative — these listeners were in the hot path alongside the zoom handler and grid updates.

## Watch for
- The 100ms zoom state debounce means the zoom label and PlantingMarker sizes lag slightly behind the actual zoom level during fast zooming — acceptable tradeoff since the visual map rendering (satellite fade, grid thickness) updates in real-time
- The WeakMap cache for permaculture_functions assumes planting objects maintain referential identity between renders — if plantings are re-created as new objects on every render, the cache won't help. Current code passes stable arrays, so this works correctly
- The measurement overlay is now a thin placeholder — when distance/area display is implemented, event listeners and the calculation logic will need to be re-added

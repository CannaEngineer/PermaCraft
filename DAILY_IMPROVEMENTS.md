# PermaCraft — 2026-06-14
## Focus: Performance + Reliability (Saturday)

### 1. Throttle map zoom event handler
File: `components/map/farm-map.tsx`
What changed: Wrapped the `handleZoomChange` listener in a `requestAnimationFrame` throttle so paint property updates (satellite opacity, grid thickness, zone boundary width) batch to once per frame instead of firing on every sub-pixel zoom tick during pinch/scroll animations.
Map/dashboard impact: Smooth zoom animations no longer trigger 8+ `setPaintProperty` calls per tick — reduces jank during rapid zoom on both desktop scroll-wheel and mobile pinch gestures.

### 2. Handle silent data loading failures
File: `components/map/farm-map.tsx`
What changed: Replaced unhandled `Promise.all()` for loading plantings/lines/guilds/phases/imagery with `Promise.allSettled()` plus per-result error logging. Failed loads are now reported to console with the specific resource name instead of silently swallowed.
Map/dashboard impact: When a network request fails during map initialization, the error is logged with context (e.g. "Failed to load plantings: ...") rather than producing silent data gaps that leave the map looking empty with no explanation.

### 3. Memoize context provider values
Files: `contexts/layer-context.tsx`, `contexts/immersive-map-ui-context.tsx`
What changed: Wrapped both `LayerProvider` and `ImmersiveMapUIProvider` value objects in `useMemo` so that child components only re-render when actual state changes, not on every parent render. Also removed redundant `refreshLayers()` API calls from `toggleLayerVisibility` and `toggleLayerLock` — these functions already update local state optimistically, so the extra fetch was causing unnecessary network requests and a UI flash.
Map/dashboard impact: Eliminates cascading re-renders through the entire component tree when toggling layers or interacting with the UI. Layer visibility/lock toggles respond instantly without waiting for a round-trip API refetch.

### 4. Optimize zone layer filtering
File: `components/immersive-map/immersive-map-editor.tsx`
What changed: Replaced `Array.includes()` with `Set.has()` for visible layer lookups in the zone filtering `useMemo`, and wrapped `JSON.parse` of `zone.layer_ids` in a try-catch to prevent malformed data from crashing the filter. The Set is constructed once per filter cycle instead of performing O(n) array scans per zone.
Map/dashboard impact: For farms with many zones and active layer filters, filtering is now O(1) per layer lookup instead of O(n). Malformed layer_ids no longer crash the editor.

## Watch for
- The zoom throttle uses `requestAnimationFrame` which may behave differently in background tabs (RAF is paused). This is fine since zoom events don't fire in background tabs either.
- The `toggleLayerVisibility` and `toggleLayerLock` functions now update local state only (no `refreshLayers()` call). If the PATCH request fails, the local state will be out of sync with the server. A follow-up could add optimistic rollback on error.
- Pre-existing TypeScript strict mode errors (15K+) are from missing module type declarations, not from these changes.

# PermaCraft — 2026-05-31
## Focus: Performance + Reliability (Saturday)

### 1. Move debounce and isTouchDevice to module scope
File: `components/map/farm-map.tsx`
What changed: The `debounce` utility and `isTouchDevice` helper were defined inside the component body, causing them to be recreated on every render. Moved to module-level functions that are allocated once. The debounced grid update function now references a stable `debounce` implementation.
Map/dashboard impact: Eliminates unnecessary function allocations on every render cycle of the 3600-line FarmMap component, reducing GC pressure during map interactions.

### 2. Remove plantings from click handler dependency array
File: `components/map/farm-map.tsx`
What changed: The `handleMapClick` useEffect had `plantings` in its dependency array, causing the entire click handler to be torn down and re-registered every time a planting was added/removed. Added `plantingsRef` (mirrors the existing `zonesRef` pattern) so the handler reads `plantingsRef.current` instead of closing over the `plantings` state. Removed `plantings` from the dependency array.
Map/dashboard impact: Adding plants no longer causes a flicker/interruption in map click handling. On farms with frequent planting changes (bulk guild placement, GPS marking), this prevented dozens of unnecessary event listener teardown/re-registration cycles.

### 3. Batch parallel API calls on map load
File: `components/map/farm-map.tsx`
What changed: The five independent data fetches on map load (plantings, lines, guilds, phases, custom imagery) were called sequentially. Wrapped in `Promise.all()` so all five network requests fire simultaneously.
Map/dashboard impact: Map load time reduced by up to the sum of the 4 slowest sequential requests minus the single slowest parallel request. On typical Turso latency (~50-100ms per query), this saves 200-400ms of serial waiting.

### 4. Remove redundant ensureCustomLayersOnTop from updateColoredZones
File: `components/map/farm-map.tsx`
What changed: `updateColoredZones()` called `ensureCustomLayersOnTop()` (which calls `moveLayer` on 10+ layers) on every data update — including during vertex dragging which fires many times per second. Layer ordering only changes when layers are added/removed, not when source data is updated. Removed the redundant call; ordering is still enforced at layer creation time and after imagery loads.
Map/dashboard impact: Eliminates ~10 `moveLayer` DOM operations per draw update event during vertex dragging, making polygon editing noticeably smoother on complex farms.

### 5. Optimize lowVitalCount early-exit in MapBottomDrawer
File: `components/map/map-bottom-drawer.tsx`
What changed: The vital count computation used `Record` + `Array.filter` with no early exit. Replaced with a `Set`-based approach that short-circuits as soon as all high-importance functions are found in the plantings data.
Map/dashboard impact: On farms with many plantings (50+), the bottom drawer's vital count calculation exits early instead of iterating all plantings and parsing every JSON functions field.

## Watch for
- The `plantingsRef` pattern means the click handler always sees the latest plantings. If planting detection breaks on click after future changes, verify `plantingsRef.current` is being kept in sync.
- `ensureCustomLayersOnTop` is now only called during layer initialization and after imagery loads. If a future change adds layers dynamically outside those paths, ordering may need explicit fixup.
- The `Promise.all` for data loading means if one endpoint fails, the others still complete (each has its own try/catch). No behavioral change from the user's perspective.

# PermaCraft — 2026-06-09
## Focus: Map Core (Monday)

### 1. Fix grid line generation cap skipping visible lines on large farms
File: `lib/map/measurement-grid.ts`
What changed: The grid generation loops used a `count` variable that incremented for every grid interval (including those outside the viewport), prematurely hitting the 250 cap on large farms. Changed to cap on actual output count (`lines.length < 500`, `labels.length < 400`) so the limit only applies to generated features, not skipped intervals.
Map/dashboard impact: Large farms at fine grid subdivision (zoom 20+) now show complete grid coverage instead of missing lines on the east/south edges.

### 2. Fix handleMapClick re-registering on every planting change
File: `components/map/farm-map.tsx`
What changed: The map click handler (for feature selection, circle drawing, planting placement) had `plantings` in its useEffect dependency array, causing it to detach and reattach every time a plant was added or removed. Moved planting data access to a ref (`plantingsRef`) so the handler stays stable.
Map/dashboard impact: Eliminates brief click-registration gaps when placing multiple plants in succession. Reduces unnecessary event listener churn on farms with many plantings.

### 3. Fix zone layer ordering race after map layer switch
File: `components/map/farm-map.tsx`
What changed: After switching map layers (satellite to topo, etc.), colored zone layers were added via `setTimeout(..., 200)` while line layers and custom imagery loaded immediately. This caused custom imagery's `ensureCustomLayersOnTop()` to fire before zone layers existed, resulting in imagery overlapping zones until the next interaction. Changed zone layer restoration to be synchronous. Also removed the `setTimeout(..., 100)` on initial load for the same reason.
Map/dashboard impact: Switching map layers no longer causes a brief flash where zones disappear behind imagery overlays. Initial load shows zones ~200ms sooner.

### 4. Hoist debounce utility and isTouchDevice out of component body
File: `components/map/farm-map.tsx`
What changed: Moved `debounce()` and `isTouchDevice()` from inside the FarmMap component to module scope. These were being redefined on every render, creating unnecessary closures.
Map/dashboard impact: Minor memory/GC improvement on every FarmMap re-render. No behavioral change.

## Watch for
- The synchronous zone layer addition (removing setTimeout) assumes MapboxDraw's internal store is ready by the time MapLibre's `load` event fires. This is guaranteed by the current init order (addControl before on("load")), but if the init sequence changes, zone layers could fail to render.
- The grid line cap increase (250 to 500) may need monitoring on very large farms with fine subdivision. If performance regresses, consider viewport-clipping the line coordinates themselves (not just which lines to include).

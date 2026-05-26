# PermaCraft — 2026-05-26
## Focus: Map Core (Monday)

### 1. Fix line dash pattern rendering — 7 of 11 line types were solid
File: `components/map/farm-map.tsx`
What changed: MapLibre doesn't support data-driven `line-dasharray` expressions, so the single `design-lines` layer rendered ALL lines as solid regardless of their configured dash pattern. Added separate layers per dash pattern group (irrigation/fence, flow paths, access paths, wildlife corridors, terraces, drainage), each with the correct static `line-dasharray` and a `line_type` filter. Extracted `setupLineLayersOnMap()` helper to avoid duplicating the 6-layer setup between initial load and map style changes. Updated `ensureCustomLayersOnTop()` to include the new layers.
Map/dashboard impact: Designers now see distinct dash patterns for fences ([2,4]), water flow ([6,3]), irrigation ([2,4]), drainage ([4,2,1,2]), access paths ([6,4]), terraces ([8,2]), and wildlife corridors ([8,4]). Line types that were visually identical are now distinguishable at a glance.

### 2. Fix draw debounce timer leak on unmount
File: `components/map/farm-map.tsx`
What changed: The `drawUpdateTimer` used for debouncing vertex-drag zone updates was a local `let` variable inside the mount effect's `try` block, making it inaccessible in the cleanup function (outside `try`). Moved it to a `drawUpdateTimerRef` and clear it on unmount.
Map/dashboard impact: Prevents a stale callback from firing after the map component is destroyed, which could cause React state-update-on-unmounted-component warnings or call `onZonesChange` at the wrong time.

### 3. Deduplicate line layer setup between initial load and style change
File: `components/map/farm-map.tsx`
What changed: Line source, solid layer, 6 dashed layers, and arrow layer setup was duplicated between `map.on("load")` and `changeMapLayer`'s idle handler. Extracted into `setupLineLayersOnMap()` called from both paths.
Map/dashboard impact: Switching map layers (satellite, topo, street, etc.) now correctly restores dash patterns instead of recreating the old broken single-layer setup.

## Watch for
- If a new line type is added to `lib/map/line-types.ts` with a dash pattern, a corresponding entry must be added to `DASHED_LINE_CONFIGS` in `farm-map.tsx` or it will render solid.
- The `['in', ...]` expression used for layer filters requires MapLibre GL JS v3+. If the project pins an older version, these filters may not work.
- The `line-arrows` layer for water flow direction depends on an async arrow icon load. If the icon fails to load, directional lines still render but without arrows (graceful degradation, unchanged).

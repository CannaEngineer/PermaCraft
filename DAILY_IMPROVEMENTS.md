# PermaCraft — 2026-05-22
## Focus: Map Core (Thursday)

### 1. Satellite opacity stuck after zooming back below z18
File: `components/map/farm-map.tsx`
What changed: Removed the `zoom > 18` guard around satellite opacity updates so `getSatelliteOpacity()` is always called — it already returns 1.0 for zoom <= 18, which now correctly resets the raster layer.
Map/dashboard impact: Previously, zooming into precision mode (z19+) dimmed the satellite to ~85-90% opacity, then zooming back out left it permanently dimmed. Designers now see full-brightness satellite imagery at normal zoom levels.

### 2. Rapid layer switching could lose all drawn features
File: `components/map/farm-map.tsx`
What changed: Stored pre-switch features in a ref (`savedFeaturesRef`) instead of a local variable inside `changeMapLayer`. The `idle` callback now reads from the ref, so rapid successive layer switches always restore the latest feature snapshot.
Map/dashboard impact: If a designer quickly toggled between Satellite → Topo → Street before the map finished loading, drawn zones and the farm boundary could vanish. Features now survive any switching speed.

### 3. Dimension label generation unbounded at high zoom
File: `lib/map/measurement-grid.ts`
What changed: Added a `MAX_DIMENSION_LABELS = 100` cap to `generateDimensionLabels()`. Both loop axes now check `features.length < MAX_DIMENSION_LABELS` before adding more Point features.
Map/dashboard impact: On large farms at zoom 20+ with fine subdivision, the dimension label layer could generate hundreds of GeoJSON Point features per viewport update, causing stuttery pan/zoom. Now capped at 100 labels — still dense enough for readability.

### 4. Draw event handlers used stale `onZonesChange` callback
File: `components/map/farm-map.tsx`
What changed: Added `onZonesChangeRef` (mirroring the existing ref pattern for `zoneType`, `snapToGridEnabled`, etc.) and updated both `handleDrawChange` and `handleDrawChangeDragging` to call `onZonesChangeRef.current()` instead of the mount-time closure capture.
Map/dashboard impact: In the Canvas flow where the parent component re-renders with a new `onZonesChange` callback, draw events (create, update, delete) now always propagate to the latest parent handler. Prevents silent save failures where zones appear drawn but never reach the save logic.

## Watch for
- Satellite opacity is now set on every zoom event including below z18. The `getSatelliteOpacity` function returns 1.0 for those levels, so there's no visual change — but it does call `setPaintProperty` more frequently. If profiling shows zoom jank on very low-end devices, consider adding a "was in precision mode" flag to skip the reset once done.
- The 100-label cap on dimension labels is generous for typical viewports at zoom 20+. If a user reports missing dimension labels on an extremely zoomed-out view with fine subdivision, the cap may need bumping — but that scenario is unlikely since dimension labels are only useful close up.
- The `savedFeaturesRef` approach means the ref always holds the last valid feature collection. It's never cleared after restore, which is fine — the ref is only read during `changeMapLayer` which immediately overwrites it.

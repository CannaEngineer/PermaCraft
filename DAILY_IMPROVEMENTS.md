# PermaCraft — 2026-05-02
## Focus: Performance + Reliability

### 1. Eliminate per-marker zoom listeners in PlantingMarker
File: `components/map/planting-marker.tsx`, `components/map/farm-map.tsx`
What changed: Removed per-instance `map.on('zoom', ...)` listener from PlantingMarker. Zoom is now passed as a prop from the parent component which already tracks `currentZoom`.
Map/dashboard impact: With 100 plantings, this eliminates 100 redundant event listeners and 100 independent React state updates on every zoom tick. Zoom/pan feels smoother on farms with many plantings.

### 2. Viewport-clip dimension labels in generateDimensionLabels
File: `lib/map/measurement-grid.ts`, `components/map/farm-map.tsx`
What changed: Added optional `viewport` parameter to `generateDimensionLabels()`. When provided, labels are only generated within the visible viewport instead of across the entire farm bounds.
Map/dashboard impact: At zoom 20+ on large farms, dimension label generation now processes only the visible area instead of the full property. Reduces wasted Feature objects and GeoJSON source updates.

### 3. Cache farm bounds computation across pan/zoom events
File: `components/map/farm-map.tsx`
What changed: Added `cachedFarmBoundsRef` that stores computed farm bounds and an `invalidateFarmBoundsCache()` function called only on draw.create/update/delete events. `getFarmBounds()` returns the cached value on moveend/zoomend instead of calling `draw.getAll()` and iterating every coordinate of every feature.
Map/dashboard impact: Pan and zoom no longer trigger full feature iteration to compute bounds. On farms with complex polygons (hundreds of vertices), this eliminates redundant coordinate scanning on every map movement.

### 4. Cache raster layer IDs for zoom-based opacity updates
File: `components/map/farm-map.tsx`
What changed: Added `rasterLayerIdsRef` populated on map load and style change. `handleZoomChange` now iterates the cached ID list directly instead of calling `map.getStyle()` (which deep-copies the entire style object) and scanning all sources/layers on every continuous zoom tick.
Map/dashboard impact: Zoom gestures no longer trigger a full style deep-copy and source/layer iteration. The zoom handler is now O(k) where k = number of raster layers (typically 1) instead of O(n) where n = total layers + sources.

## Watch for
- PlantingMarker zoom prop: if any other consumer of PlantingMarker is added in the future, it should pass the zoom prop for consistency. Without it, the component falls back to `map.getZoom()` on mount but won't update on zoom changes.
- Farm bounds cache: the cache is invalidated on draw events but not on external zone prop changes. If zones are modified outside of MapboxDraw (e.g., via API), the cache could become stale. Monitor for cases where grid lines don't update after zone changes from external sources.
- Raster layer cache: rebuilt on initial load and `changeMapLayer()`. If a raster layer is added by any other code path, `rebuildRasterLayerCache()` should be called there too.

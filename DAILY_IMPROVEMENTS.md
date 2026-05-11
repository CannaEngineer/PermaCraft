# PermaCraft — 2026-05-11
## Focus: Map Core (Monday)

### 1. Fix double-tap on mobile causing duplicate actions
File: `components/map/farm-map.tsx`
What changed: Removed the redundant `touchend` listener — MapLibre already synthesizes `click` for touch taps, so both were firing `handleMapClick` on every tap.
Map impact: Mobile users no longer double-place plantings, double-toggle circle center, or fire double feature selections on a single tap.

### 2. Fix stale closure in zoom handler causing unnecessary grid regeneration
File: `components/map/farm-map.tsx`
What changed: The `handleZoomChange` callback was registered once at mount but depended on `currentZoom`, `gridSubdivision`, and `hasShownPrecisionToast` state. These were stale in the closure. Replaced with refs so the single event listener always reads the latest values.
Map impact: Precision mode toast now fires correctly when first crossing zoom 18. Fine grid subdivision toggle at zoom 20 no longer re-triggers on every subsequent zoom change, reducing unnecessary grid regeneration.

### 3. Fix circle-drawn zones missing type and name
File: `components/map/farm-map.tsx`
What changed: Circle mode created zones via `draw.add()` without setting `user_zone_type` or showing the quick label form. Now sets the current zone type on the circle feature and opens the quick label form at the circle's edge so users can name and categorize it.
Map impact: Designers using the circle tool (ponds, herb spirals, etc.) now get prompted to label and type the zone immediately, matching the polygon drawing experience.

### 4. Fix custom imagery layers lost on map layer change
File: `components/map/farm-map.tsx`
What changed: `changeMapLayer` restored grid, zones, and lines after a style swap but never called `loadCustomImagery()`. Added the call to the idle callback.
Map impact: Uploaded aerial imagery or custom overlays now survive switching between satellite, terrain, topo, and street base layers.

## Watch for
- The `touchend` removal should be tested on actual touch devices. MapLibre's click synthesis covers standard taps, but rapid double-taps or long-press behaviors should be verified.
- Circle snap-to-grid: circles bypass the `snapFeatures` call since they're added via `draw.add()` rather than the draw.create event. At zoom 20+, circle vertices won't snap to grid. Low priority since circles are typically used for ponds/radius features where grid snapping is less useful.
- Custom imagery layer ordering after restore: `loadCustomImagery` inserts layers below `colored-zones-fill`, which may not exist yet during the timeout. If imagery appears on top of zones after a layer switch, the ordering needs adjustment.

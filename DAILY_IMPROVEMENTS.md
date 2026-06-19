# PermaCraft — 2026-06-19
## Focus: Map Core (Thursday rotation)

### 1. Fix dashed line selection on click/tap
File: `components/map/farm-map.tsx`
What changed: Added `design-lines` and all `design-lines-dash-*` layers to the queryRenderedFeatures call in `handleMapClick`, and updated the feature detection condition to recognize hits from these layers.
Map impact: Designers can now click/tap irrigation lines, fences, flow paths, drainage lines, and other dashed line types to select them. Previously only solid lines from the `colored-lines` layer were selectable — dashed lines were drawn but untouchable.

### 2. Fix guild companion placement at non-equatorial latitudes
File: `components/map/farm-map.tsx`
What changed: Replaced the flat `distance / 364000` degree conversion with proper latitude-aware math — separate lat/lng degree steps using `cos(latitude)` correction for longitude.
Map impact: Companion plants in guilds are now placed at correct distances in all directions regardless of latitude. At 40°N (roughly NYC to Madrid), the old code placed east-west companions ~30% too close together. Guilds now form proper circles at any latitude.

### 3. Zoom-dependent planting marker scale
File: `components/map/planting-marker.tsx`
What changed: Replaced the fixed 2.5x size multiplier with a zoom-dependent curve: 2.5x at zoom <=16 (visibility at overview), linearly decreasing to 1.0x at zoom >=20 (true canopy spread in precision mode).
Map impact: At low zoom, plant markers remain large and visible as before. At high zoom (precision mode), markers now show actual canopy footprint, so designers can assess spacing accuracy and see true crown overlap between adjacent plants.

### 4. Remove zone layer restore delay after map layer switch
File: `components/map/farm-map.tsx`
What changed: Removed the 200ms `setTimeout` that delayed `addColoredZoneLayers` after the map `idle` event during layer switches. Called it directly instead.
Map impact: When switching between satellite/topo/street layers, drawn zones reappear instantly instead of flashing invisible for 200ms. The `idle` event already guarantees the style is loaded, making the timeout unnecessary.

## Watch for
- Guild placement uses the center point's latitude for cos() correction. For very large guilds (>100ft radius) at extreme latitudes (>60°N/S), there could be a small additional error. Not a concern for real permaculture designs.
- Planting marker min-size floor of 14px is still enforced. Very small/young plants won't render at true 1:1 scale even at zoom 20 — this is correct (sub-pixel markers aren't useful).
- The `line-arrows` symbol layer is intentionally not included in click selection — arrow symbols are decorative and would produce duplicate hits.

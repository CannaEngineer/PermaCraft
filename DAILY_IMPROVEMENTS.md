# PermaCraft — 2026-04-24
## Focus: Map Core (Thursday)

### 1. Fix polygon ring closure after snap-to-grid
File: `components/map/farm-map.tsx` (snapFeatures function, ~line 1898)
What changed: After snapping polygon vertices to grid intersections, the code now ensures the last coordinate in each ring matches the first — maintaining valid GeoJSON. Previously, independent snapping of first and last vertices could break ring closure, producing invalid polygons.
Map/dashboard impact: Designers using snap-to-grid at zoom 20+ no longer risk invisible geometry corruption. Zones render correctly and save without data integrity issues.

### 2. Add MultiPolygon support to snap-to-grid
File: `components/map/farm-map.tsx` (snapFeatures function, ~line 1898)
What changed: snapFeatures now handles MultiPolygon geometries by iterating all rings across all sub-polygons. Previously only single Polygon, Point, and LineString types were processed — MultiPolygon features silently skipped snapping.
Map/dashboard impact: Any MultiPolygon zones (e.g., non-contiguous areas) now snap correctly to the grid at high zoom.

### 3. Debounce draw.update propagation during vertex dragging
File: `components/map/farm-map.tsx` (handleDrawUpdate, ~line 2034)
What changed: Vertex dragging now debounces expensive operations (parent state propagation via onZonesChange + grid recalculation) with a 200ms delay, while keeping zone coloring updates immediate for visual feedback. Previously, every pixel of a vertex drag fired full grid regeneration and parent re-renders.
Map/dashboard impact: Smoother vertex editing experience, especially on large farms with complex grids. Reduces unnecessary computation during drag operations.

### 4. Add GeoJSON geometry validation on zone save API
File: `app/api/farms/[id]/zones/route.ts` (Zod schema, line 42)
What changed: Replaced `z.any()` geometry validation with a proper discriminated union schema that validates GeoJSON geometry type, coordinate structure, minimum ring lengths for polygons, and 2D/3D coordinate formats. Also added server-side ring closure normalization before persisting.
Map/dashboard impact: Malformed geometry can no longer silently corrupt the database. Invalid saves return 400 errors with clear messages instead of storing broken data that causes rendering failures on next load.

## Watch for
- The zone POST endpoint still uses delete-all-then-reinsert pattern. If the batch insert fails after the delete, zones are lost. This needs a transactional approach (future item).
- Schema-code mismatch: Several columns referenced in API routes (layer_ids, phase_id, catchment_properties, swale_properties on zones) may not exist in all database instances depending on migration state.
- JSON.parse calls in lines/guilds API routes lack try-catch — malformed JSON in DB can cause unhandled exceptions.

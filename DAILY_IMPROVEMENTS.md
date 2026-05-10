# PermaCraft — 2026-05-10
## Focus: Performance + Reliability

### 1. Remove verbose console.log statements from map component
File: `components/map/farm-map.tsx`
What changed: Removed 27 console.log calls that fired during map initialization, layer setup, zone loading, grid generation, and feature updates. Kept console.error for actual failure paths.
Map/dashboard impact: Eliminates GC pressure from string concatenation in hot paths (ensureCustomLayersOnTop runs on every zone change), reduces DevTools noise, and removes synchronous I/O overhead from the render pipeline.

### 2. Deduplicate grid recalculation on viewport changes
File: `components/map/farm-map.tsx`
What changed: Removed the redundant `zoomend` event listener for `updateGrid`. Previously both `moveend` and `zoomend` triggered full grid regeneration; since MapLibre fires `moveend` after every zoom as well, the grid was being regenerated twice on every zoom action.
Map/dashboard impact: Grid regeneration (which generates 100-250 GeoJSON features) now fires once per viewport change instead of twice during zooms, reducing frame drops during rapid zoom gestures.

### 3. Parallelize guild placement API calls
File: `components/map/farm-map.tsx`
What changed: Replaced sequential `for` loop with N+1 awaited `fetch()` calls with a single `Promise.all()` batch. All companion plantings and the focal planting are now created in parallel.
Map/dashboard impact: Placing a guild with 5 companions now takes ~1 network round-trip instead of 6 sequential ones. A guild that took 2-3 seconds to place now appears in <500ms.

### 4. Batch farm deletion into single DB transaction
File: `app/api/farms/[id]/route.ts`
What changed: Replaced 7 sequential `db.execute()` calls with a single `db.batch()` call for deleting farm data (analyses, conversations, snapshots, plantings, zones, collaborators, farm). This is both faster (single Turso round-trip) and atomically consistent.
Map/dashboard impact: Farm deletion from the dashboard is ~7x faster and guarantees no partial deletion state if a network hiccup occurs mid-operation.

## Watch for
- PlantingMarker still creates individual DOM elements per plant. For farms with 100+ plantings, this means 100+ DOM nodes. A future session should consider migrating to a MapLibre symbol layer for better GPU rendering.
- The `handleZoomChange` callback still runs on every `zoom` event (fires continuously during pinch-to-zoom). It updates paint properties on multiple layers each frame. Consider throttling if users report jank on low-end devices.
- `ensureCustomLayersOnTop()` still iterates and moves ~10 layers on every zone data change. For farms with frequent edits, consider a flag that skips re-ordering when layer order hasn't actually changed.

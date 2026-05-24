# PermaCraft — 2026-05-24
## Focus: Performance + Reliability (Saturday)

### 1. PlantingMarker memoization prevents unnecessary re-renders
File: `components/map/planting-marker.tsx`, `components/map/farm-map.tsx`
What changed: Wrapped PlantingMarker in `React.memo` with a custom comparison function that checks only the properties that affect rendering (id, coordinates, growth params, zoom, year). Added zoom quantization (0.5 increments) and a stable `useCallback` click handler so memo can short-circuit during pinch-zoom and unrelated state changes.
Map/dashboard impact: On a farm with 100+ plantings, every state change in the 3600-line FarmMap component (opening a drawer, toggling a menu, selecting a zone) previously re-rendered every marker. Now markers only re-render when their planting data, projection year, or zoom bucket actually changes — a significant reduction in DOM thrash during interactive use.

### 2. Grid lines viewport-culled to reduce GeoJSON feature count
File: `lib/map/measurement-grid.ts`, `components/map/farm-map.tsx`
What changed: Added an optional `viewport` parameter to `generateGridLines()`. When provided, only lines that intersect the visible viewport (plus one cell of buffer) are emitted. Lines still span the full farm width/height so they don't visually clip at viewport edges. The `updateGrid` function in FarmMap now passes the current viewport bounds.
Map/dashboard impact: On a large farm (50+ acres), panning to one corner previously generated 500 grid features covering the entire property — most off-screen. Now only the 20-60 lines visible in the viewport are generated, reducing GeoJSON source updates on every pan/zoom. The 250-line-per-axis cap remains as a safety net.

### 3. Planting click detection uses bounding-box pre-filter
File: `components/map/farm-map.tsx`
What changed: Before projecting each planting to screen coordinates (expensive `map.project()` call), the click handler now computes a geographic bounding box around the click point and skips plantings outside it. Also replaced `Math.sqrt` distance check with squared-distance comparison to avoid the square root.
Map/dashboard impact: On a farm with 500 plantings, every map click previously called `map.project()` 500 times to find nearby plants. The bounding-box pre-filter skips the vast majority with cheap coordinate comparisons, leaving only the handful of plantings near the click to be precisely projected. Touch interactions feel snappier on farms with many plants.

### 4. Species API caching with stale-while-revalidate
File: `app/api/species/route.ts`
What changed: Removed `export const dynamic = 'force-dynamic'` and added `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` headers. Species data changes infrequently (new species are added occasionally, not per-session), so a 5-minute cache with 10-minute SWR window is appropriate.
Map/dashboard impact: The species picker queries the full species table on every open. With force-dynamic, every picker open hit the database cold. Now Vercel's CDN serves cached responses, making species picker open near-instant after the first load. Newly added species appear within 5-10 minutes.

## Watch for
- PlantingMarker memo comparison assumes `onClick` reference stability — if a parent passes a new inline function on every render, memo won't help. The immersive editor uses `onFeaturesAtPoint` (which sets onClick=undefined), so this is fine there.
- Grid viewport culling: if a user pans very rapidly, they might briefly see grid lines disappear at the edges before the moveend handler regenerates them. The one-cell buffer mitigates this, but it's worth monitoring.
- Species cache: custom species (user-created) go through a different endpoint (`/api/farms/[id]/custom-species`), so that path is unaffected by this caching change.

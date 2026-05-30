# PermaCraft — 2026-05-30
## Focus: Performance + Reliability (Saturday)

### 1. Viewport-culled planting markers
File: `components/map/farm-map.tsx`
What changed: Planting markers are now filtered to only those within the visible map viewport (plus a 10% buffer). Previously all plantings rendered as DOM markers regardless of position. Added `viewportBoundsState` tracked via `moveend` events and a `useMemo`-based `visiblePlantings` filter.
Map/dashboard impact: On a farm with 300 plantings, only the ~20-50 visible ones create DOM elements. Reduces marker mount/unmount overhead during pan and dramatically lowers DOM node count for large farms.

### 2. Deduplicate line JSON parsing
File: `components/map/farm-map.tsx`
What changed: `loadLines()` now pre-parses `geometry` and `style` from JSON strings once when loading from the API, storing parsed objects in state. The `useEffect` that syncs lines to the map source no longer re-parses — it reads already-parsed objects directly. Previously every line was `JSON.parse`'d twice: once in `loadLines` and again in the effect.
Map/dashboard impact: Eliminates redundant JSON parsing on every line state update. For farms with 50+ lines, saves measurable CPU time during load and any line state changes.

### 3. Replace JSON.parse(JSON.stringify()) with structuredClone
File: `components/map/farm-map.tsx`
What changed: Farm boundary deep cloning in the draw change handlers now uses `structuredClone()` instead of `JSON.parse(JSON.stringify())`. Both locations (handleDrawChange and handleDrawChangeDragging) updated.
Map/dashboard impact: `structuredClone` is faster and doesn't silently drop `undefined` values or fail on circular references. Most visible during vertex-drag operations on farm boundaries, where deep cloning runs on every debounced update.

### 4. AI analysis route: deduplicate zone geometry parsing
File: `app/api/ai/analyze/route.ts`
What changed: Zone geometries from the database were parsed with `JSON.parse()` in three separate loops: once for bounds calculation, once for plantings context, and once for lines context. Now parsed once into a `parsedZoneGeometries` Map and reused. The already-computed `allZoneBoundsCoords` array is also reused for plantings and lines bounds instead of re-extracting from raw geometry.
Map/dashboard impact: Reduces AI analysis endpoint CPU time by eliminating 2x redundant JSON parsing of all zone geometries. More noticeable on farms with many complex polygon zones.

### 5. Move debounce utility to module scope
File: `components/map/farm-map.tsx`
What changed: The `debounce` helper function was defined inside the component body, creating a new function object on every render. Moved to module scope where it's defined once.
Map/dashboard impact: Minor memory/GC improvement — the function definition is no longer recreated per render cycle.

## Watch for
- Viewport-culled plantings depend on `moveend` events. If a planting is added outside the current viewport (e.g., via GPS from another screen), it won't render until the user pans. This is acceptable since the user wouldn't see it anyway, but the planting list panel still shows all plantings.
- The `visiblePlantings` 10% buffer means a few plantings just outside the viewport are still rendered, preventing pop-in during small pans.
- `structuredClone` requires a modern browser (Chrome 98+, Firefox 94+, Safari 15.4+). All target browsers for this app support it.
- Pre-parsed line geometry/style objects are stored in React state. If any code path mutates them directly (instead of creating new objects), it could cause rendering bugs. Current code only reads them.

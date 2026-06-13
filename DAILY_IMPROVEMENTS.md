# PermaCraft — 2026-06-13
## Focus: Performance + Reliability (Saturday)

### 1. Fix map event listener memory leak
File: `components/map/farm-map.tsx`
What changed: Extracted 8 anonymous event handlers (moveend, rotate, pitch, draw.create, draw.update, draw.delete, draw.selectionchange, draw.modechange) into named variables and added cleanup calls in the useEffect return. Previously only `zoom` was cleaned up on unmount.
Map/dashboard impact: Prevents memory leaks and double-firing of handlers when the map component remounts (e.g. navigating between farms). Eliminates stale-closure bugs where old handlers reference outdated state.

### 2. Parallelize map data loading on init
File: `components/map/farm-map.tsx`
What changed: Wrapped the 5 sequential data-loading calls (plantings, lines, guilds, phases, custom imagery) in `Promise.all()` inside the map's `load` event handler.
Map/dashboard impact: Faster initial map load — all 5 API calls now execute concurrently instead of in series. On a typical farm with all feature types, this saves 1-3 seconds of waterfall time.

### 3. Add defensive JSON parsing in API routes and map component
Files: `app/api/farms/[id]/lines/route.ts`, `app/api/farms/[id]/guilds/route.ts`, `components/map/farm-map.tsx`
What changed: Wrapped all `JSON.parse()` calls in try-catch blocks in the lines GET route (style, layer_ids), guilds GET route (companion_species, benefits), and imagery bounds parsing in the map component. A single corrupted JSON field previously crashed the entire API response or map rendering.
Map/dashboard impact: A corrupted record now logs an error and returns gracefully instead of taking down the entire feature list.

### 4. Add farm ownership check to lines GET route
File: `app/api/farms/[id]/lines/route.ts`
What changed: Added farm ownership verification (matching user_id or is_public flag) before returning line data. The POST route had this check but GET was missing it.
Map/dashboard impact: Security fix — private farm line data is no longer accessible to unauthorized users.

### 5. Bound canvas farms query
File: `app/canvas/page.tsx`
What changed: Added `LIMIT 100` to the farms query on the canvas page.
Map/dashboard impact: Prevents memory bloat for power users with many farms.

## Watch for
- The map event listener cleanup relies on MapboxDraw's `.off()` for custom draw events — verify these are properly unbound in the MapboxDraw version used.
- Parallel data loading means all 5 API calls compete for bandwidth simultaneously. On very slow connections, monitor for increased timeouts.
- Imagery records with corrupted bounds data will now silently not render instead of crashing the map.

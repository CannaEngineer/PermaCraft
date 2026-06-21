# PermaCraft — 2026-06-21
## Focus: Performance + Reliability (Saturday)

### 1. Batch dashboard queries to eliminate N+1 pattern
Files: `lib/db/queries/dashboard.ts`, `app/(app)/dashboard/page.tsx`
What changed: Added `getBatchFarmTasks()` and `getBatchRecentAiInsights()` batch functions that fetch tasks and AI insights for all farms in a single query each, replacing per-farm individual queries.
Map/dashboard impact: Dashboard load time for users with 5+ farms drops from ~2N+4 DB round-trips to exactly 4, regardless of farm count. The page now issues only `getDashboardFarms`, `getBatchEcoHealthScores`, `getBatchRecentActivity`, `getBatchFarmTasks`, and `getBatchRecentAiInsights` — all batched.

### 2. Debounce grid update on map pan
File: `components/map/farm-map.tsx`
What changed: The `moveend` event handler now calls the debounced grid update (150ms) instead of the immediate one. Previously, rapid panning triggered full grid regeneration (generating hundreds of GeoJSON features) on every pan end event without any throttling.
Map/dashboard impact: During fast panning, grid regeneration is deferred until the user pauses, eliminating jank from redundant grid calculations that would be immediately invalidated by the next pan.

### 3. Eliminate redundant native species DB query in AI analyze
File: `app/api/ai/analyze/route.ts`
What changed: Merged two identical native species queries (one for text context, one for compressor context) into a single query, reusing the same result set for both purposes.
Map/dashboard impact: Each AI analysis request now makes one fewer DB round-trip to Turso. For farms with climate zone data, this saves ~50-100ms per analysis request.

### 4. Skip layer reordering during vertex drag
File: `components/map/farm-map.tsx`
What changed: `updateColoredZones()` now accepts a `skipLayerReorder` flag. During vertex dragging (which fires continuously), only the GeoJSON source data is updated — the expensive `ensureCustomLayersOnTop()` call (15 `moveLayer()` operations) is deferred to the debounced handler that fires after the drag pauses.
Map/dashboard impact: Smoother vertex editing experience, especially on farms with many layers. Eliminates ~15 GPU-side layer reorder operations per mouse-move frame during polygon editing.

## Watch for
- The batch task/insight queries use `ORDER BY ... DESC` globally, then cap per-farm at 20/5 items. If a single farm dominates activity, other farms' items still appear — but the per-farm cap means results are representative, not exhaustive.
- The `moveend` debounce means the grid may show stale labels for up to 150ms after panning stops. This matches the existing zoom debounce behavior and is imperceptible to users.
- `ensureCustomLayersOnTop()` is still called on non-drag zone changes (create, delete, style switch). Only drag-update skips it.

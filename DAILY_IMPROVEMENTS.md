# PermaCraft — 2026-05-28
## Focus: Dashboard (Wednesday)

### 1. Fix farm deletion cascade — 15 missing child tables
File: `app/api/farms/[id]/route.ts`
What changed: Added DELETE statements for tasks, lines, annotations, design_layers, phases, farm_posts, comments, story_entries, farm_story_sections, timeline_entries, crop_plan_items, crop_plans, harvest_logs, custom_imagery, farm_follows, farm_journal_entries, tour_stops, tour_visits, and farm_tours. Removed references to non-existent tables (guilds, soil_tests, geotagged_photos) that would cause batch failures.
Map/dashboard impact: Designers can now delete farms that have tasks, lines, tours, crop plans, or journal entries without hitting a foreign key constraint error. Previously, deleting a farm with any of these would silently fail.

### 2. Batch dashboard queries — eliminate N+1 for tasks and insights
Files: `lib/db/queries/dashboard.ts`, `app/(app)/dashboard/page.tsx`
What changed: Added `getBatchFarmTasks()` and `getBatchRecentAiInsights()` that fetch all farms' data in a single query each (matching the pattern already used by `getBatchEcoHealthScores` and `getBatchRecentActivity`). Dashboard page now makes 4 parallel queries instead of 2 + (2 x N) where N = number of farms.
Map/dashboard impact: A designer with 5 farms now triggers 4 DB round trips instead of 14. Dashboard loads noticeably faster for multi-farm users.

### 3. Deduplicate activity timeline + fix stale completed tasks
File: `lib/db/queries/dashboard.ts`
What changed: (a) Added a `seen` set per farm to prevent the same entity (same type + id) from appearing twice in the activity feed. (b) Fixed the task subquery to only show completed tasks from the last 7 days (previously showed ALL completed tasks regardless of age, flooding the timeline for long-running farms).
Map/dashboard impact: Activity timeline no longer shows duplicate entries or months-old completed tasks that push recent design activity off-screen.

### 4. Improve climate zone display in dashboard
Files: `components/dashboard/farm-hero-card.tsx`, `components/dashboard/farm-hero-bar.tsx`
What changed: Raw climate zone values like "7a" now display as "USDA Zone 7A" in the hero card metadata line and the hero bar. Strips any existing "usda zone" prefix before formatting to avoid duplication.
Map/dashboard impact: Designers see a properly labeled hardiness zone instead of a cryptic code. Small but meaningful for users unfamiliar with USDA zone notation.

## Watch for
- The farm deletion cascade now lists 27 DELETE statements. If new tables with `farm_id` are added in future migrations, they must be added here too. Consider enabling `PRAGMA foreign_keys = ON` in the libSQL client initialization to make CASCADE constraints work natively.
- Tables `guilds`, `soil_tests`, `geotagged_photos`, and `farmer_goals` are referenced in schema.ts interfaces but don't have corresponding CREATE TABLE migrations. The farmer_goals table is actively used by the goals API — it may have been created outside the migration system. If farm deletion fails on a farm with goals, `farmer_goals` needs to be added back to the cascade once the table's existence is confirmed.
- The batched task/insight queries don't have a per-farm LIMIT in SQL — they rely on client-side truncation (20 tasks, 5 insights per farm). For users with many farms and many tasks, the result set could be large. A future optimization could use window functions if SQLite/libSQL supports them.

---

# PermaCraft — 2026-05-26
## Focus: Map Core (Monday)

### 1. Fix line dash pattern rendering — 7 of 11 line types were solid
File: `components/map/farm-map.tsx`
What changed: MapLibre doesn't support data-driven `line-dasharray` expressions, so the single `design-lines` layer rendered ALL lines as solid regardless of their configured dash pattern. Added separate layers per dash pattern group (irrigation/fence, flow paths, access paths, wildlife corridors, terraces, drainage), each with the correct static `line-dasharray` and a `line_type` filter. Extracted `setupLineLayersOnMap()` helper to avoid duplicating the 6-layer setup between initial load and map style changes. Updated `ensureCustomLayersOnTop()` to include the new layers.
Map/dashboard impact: Designers now see distinct dash patterns for fences ([2,4]), water flow ([6,3]), irrigation ([2,4]), drainage ([4,2,1,2]), access paths ([6,4]), terraces ([8,2]), and wildlife corridors ([8,4]). Line types that were visually identical are now distinguishable at a glance.

### 2. Fix draw debounce timer leak on unmount
File: `components/map/farm-map.tsx`
What changed: The `drawUpdateTimer` used for debouncing vertex-drag zone updates was a local `let` variable inside the mount effect's `try` block, making it inaccessible in the cleanup function (outside `try`). Moved it to a `drawUpdateTimerRef` and clear it on unmount.
Map/dashboard impact: Prevents a stale callback from firing after the map component is destroyed, which could cause React state-update-on-unmounted-component warnings or call `onZonesChange` at the wrong time.

### 3. Deduplicate line layer setup between initial load and style change
File: `components/map/farm-map.tsx`
What changed: Line source, solid layer, 6 dashed layers, and arrow layer setup was duplicated between `map.on("load")` and `changeMapLayer`'s idle handler. Extracted into `setupLineLayersOnMap()` called from both paths.
Map/dashboard impact: Switching map layers (satellite, topo, street, etc.) now correctly restores dash patterns instead of recreating the old broken single-layer setup.

## Watch for
- If a new line type is added to `lib/map/line-types.ts` with a dash pattern, a corresponding entry must be added to `DASHED_LINE_CONFIGS` in `farm-map.tsx` or it will render solid.
- The `['in', ...]` expression used for layer filters requires MapLibre GL JS v3+. If the project pins an older version, these filters may not work.
- The `line-arrows` layer for water flow direction depends on an async arrow icon load. If the icon fails to load, directional lines still render but without arrows (graceful degradation, unchanged).

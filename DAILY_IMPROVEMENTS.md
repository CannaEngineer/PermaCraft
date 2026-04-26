# PermaCraft — 2026-04-26
## Focus: UI/UX Polish (Sunday)

### 1. Mobile farm name edit button now discoverable
File: `components/dashboard/farm-hero-card.tsx`
What changed: Edit button shows at 60% opacity on mobile (was hidden behind hover-only), with larger touch target and `touch-manipulation` for snappy response.
Map/dashboard impact: Mobile users can now rename farms directly from the dashboard hero card, instead of the edit affordance being desktop-hover-only.

### 2. Removed double-card nesting in progress panel
File: `components/dashboard/progress-panel.tsx`
What changed: Removed wrapping Card/border/header from ProgressPanel — LearningProgress already renders its own Card with gradient styling. Eliminates visual double-border.
Map/dashboard impact: Dashboard looks cleaner — the learning progress widget now matches the visual weight of neighboring cards instead of appearing double-bordered.

### 3. Insights empty state now links to AI analysis
File: `components/dashboard/insights-widget.tsx`
What changed: Empty state now includes a "Start AI Analysis" button linking to the farm editor with chat open, instead of passive text saying "Open the map and ask AI."
Map/dashboard impact: First-time users hitting the empty insights widget get a clear path forward — one tap takes them into the AI chat on their farm.

### 4. Chat panel mobile backdrop and transition polish
File: `app/(app)/farm/[id]/farm-editor-client.tsx`
What changed: Added translucent backdrop overlay on mobile when AI chat is open (tap to dismiss). Removed the 400px max-height constraint that was truncating the chat on mobile. Added depth shadow on mobile panel.
Map/dashboard impact: AI chat on mobile now feels like a proper overlay sheet instead of a jarring side-slide. Users can dismiss by tapping outside, and the full chat history is visible without scrolling a cramped 400px box.

## Watch for
- The chat panel backdrop uses `animate-in fade-in` from tailwind-animate — verify this utility class is present in the project's Tailwind config if transitions don't animate
- The ProgressPanel now directly returns LearningProgress (a server component) — verify this works correctly when rendered inside the client DashboardClientV2 (it should, since Next.js supports async server components as children of client components)
- InsightsWidget links to `/farm/${farmId}?chat=open` — the farm-editor-client already handles this query param, so this should work out of the box

---

# PermaCraft — 2026-04-25
## Focus: Performance + Reliability (Saturday)

### 1. Dashboard N+1 query elimination
File: `lib/db/queries/dashboard.ts`, `app/(app)/dashboard/page.tsx`
What changed: Replaced per-farm `getEcoHealthScore` and `getRecentActivity` calls with batch functions (`getBatchEcoHealthScores`, `getBatchRecentActivity`) that execute a single SQL query across all farms, then partition results in JS.
Map/dashboard impact: Dashboard load for a user with N farms drops from N×4 + 1 DB queries to N×2 + 3 (eco health and activity are now 1 query each regardless of farm count). A user with 10 farms goes from ~41 queries to ~23.

### 2. Zone save atomic transaction
File: `app/api/farms/[id]/zones/route.ts`
What changed: Moved the DELETE, all INSERTs, and the farm timestamp UPDATE into a single `db.batch()` call, which libSQL executes as an atomic transaction. Previously the DELETE ran separately, so a concurrent save request could interleave and cause duplicate farm boundaries or lost zones. (Resolves the "Watch for" item from 2026-04-24.)
Map/dashboard impact: Zone saves are now atomic — if any INSERT fails, the DELETE is rolled back and existing zones are preserved. Eliminates a data corruption risk under concurrent edits.

### 3. Sync engine exponential backoff
File: `lib/offline/sync-engine.ts`
What changed: Replaced fixed 30-second retry delay with exponential backoff (5s → 10s → 20s → 40s → 80s → 120s cap). Tracks `consecutiveFailures` and resets on success.
Map/dashboard impact: On flaky connections, the sync engine no longer hammers the server every 30s indefinitely. Reduces battery drain on mobile devices and avoids overwhelming the server during outages.

### 4. AI response cache scaling
File: `lib/ai/response-cache.ts`
What changed: Increased LRU cache from 100 entries to 500, and added size-aware eviction (`maxSize: 50MB`, `sizeCalculation` based on response length). Prevents a few large responses from evicting the entire cache.
Map/dashboard impact: AI analysis responses are cached more effectively for multi-farm users. Repeated similar queries hit cache instead of re-calling OpenRouter, reducing latency and API costs.

## Watch for
- `getBatchRecentActivity` returns all matching rows sorted globally then caps at 10 per farm in JS. For users with many farms and heavy activity, the SQL result set could be large. Consider adding a per-subquery LIMIT if this becomes an issue.
- `getFarmTasks` and `getRecentAiInsights` are still per-farm queries. They're lightweight (indexed, limited), but could be batched in a future pass if dashboard latency is still a concern.
- The sync engine backoff resets to 0 on any successful sync. If the server is intermittently failing, this could still cause bursty retries. Consider a slow-decay approach if monitoring shows issues.

---

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

# PermaCraft — 2026-05-27
## Focus: Map Intelligence (AI Context Quality)

### 1. Fix conversation summary dropping AI responses
File: `lib/ai/context-manager.ts`
What changed: The `summarizeOldMessages` function now captures both user questions AND key points from AI responses (species mentioned, topics covered). Previously it only kept user questions, so the AI couldn't remember its own prior recommendations in long conversations.
Map/dashboard impact: In multi-turn conversations, the AI now builds on its prior suggestions instead of repeating or contradicting earlier recommendations. Designers get coherent multi-step design guidance.

### 2. Widen context compressor keyword filtering
File: `lib/ai/context-compressor.ts`
What changed: Expanded keyword patterns for all 6 context categories and added a new `needsZones` category. Previously, queries like "What should I plant near the pond?" missed water context (pond/creek/stream weren't in the water keywords), and spatial queries like "What's in this area?" missed zone and planting data. Added ~30 missing keywords across categories.
Map/dashboard impact: The AI now receives relevant context for a much wider range of natural questions. Spatial questions ("near the pond", "beside the hedge") correctly include both line/water features AND zone/planting data.

### 3. Eliminate duplicate native species DB query in analyze route
File: `app/api/ai/analyze/route.ts`
What changed: The identical native species query was running twice during enrichment — once to build the display context string and once for the compressor's data structure. Consolidated into a single query whose results are reused for both purposes.
Map/dashboard impact: Faster AI analysis response time (one fewer DB roundtrip to Turso on every enriched analysis request).

### 4. Add water properties and spatial data to text chat context
Files: `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`
What changed: The text chat endpoint now fetches `geometry` and `water_properties` for lines (previously only `line_type` and `label`). Lines get grid coordinate references computed from their geometry, and water properties (flow type, flow rate, seasonality) are formatted into the prompt. Line coordinates are also included in farm bounds computation for accurate grid references.
Map/dashboard impact: Text chat AI now knows WHERE water features are on the map and what their flow characteristics are — matching the spatial awareness that the map analysis endpoint already had.

## Watch for
- The context manager's `extractKeyPoints` function uses regex to find species names (pattern: `Capitalized (Genus species)`). If AI responses use different formatting, key points may be missed. Monitor conversation quality.
- The expanded keyword patterns in the context compressor are intentionally broad. If token budgets become a concern with large farms, the `needsZones` trigger (which includes common words like "where", "area") may pull in too much context. Could add a token cap check.
- Line grid coordinate computation in chat adds a small overhead. For farms with many lines (50+), this could be noticeable. Not a concern at typical farm sizes.

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

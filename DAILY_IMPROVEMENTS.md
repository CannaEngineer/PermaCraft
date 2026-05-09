# PermaCraft — 2026-05-09
## Focus: Map Intelligence (AI context quality)

### 1. Always compute zone grid coordinates from DB geometry
File: `app/api/ai/analyze/route.ts`
What changed: Zone geometry is now always fetched from the database and grid coordinates are computed server-side, regardless of whether the client sends zone data. Previously, when the immersive editor sent zones with names/types but no geometry, the server skipped enrichment and the AI received zones without spatial references.
Map/dashboard impact: AI now consistently references zones by their exact grid positions (e.g., "at B3-D5") in all analysis responses, whether triggered from the immersive editor or the canvas view.

### 2. Add zone area to AI context
Files: `app/api/ai/analyze/route.ts`, `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`
What changed: Zone area in acres is now computed from GeoJSON geometry (via `@turf/area`) and included in both the map analysis and text chat AI prompts. The system prompt instructs the AI to scale recommendations to actual zone sizes. Falls back to `properties.area_acres` for farm boundaries.
Map/dashboard impact: AI recommendations are now proportional to actual space — a 0.1 acre herb garden gets different plant spacing and quantity suggestions than a 2 acre food forest zone. Previously, the AI had no concept of zone size.

### 3. Improve AI spatial awareness in text chat
Files: `lib/ai/prompts.ts`, `app/api/ai/chat/route.ts`
What changed: The general chat system prompt now instructs the AI to reference grid coordinates and zone sizes when making design recommendations. The chat route fetches `properties` alongside `geometry` to extract pre-computed area data.
Map/dashboard impact: Text-only chat responses now include spatially-grounded advice ("your 0.5 acre zone 2 at C4-E6") instead of generic recommendations without spatial context.

### 4. Deduplicate grid calculator imports in analyze route
File: `app/api/ai/analyze/route.ts`
What changed: Removed three redundant `await import('@/lib/map/zone-grid-calculator')` calls inside the enrichment block, reusing the single import at the top of the zone processing section.
Map/dashboard impact: Slightly faster AI analysis requests due to fewer dynamic imports.

## Watch for
- Zone area computation uses `@turf/area` which expects valid GeoJSON Polygons — malformed geometry will return 0 acres (handled gracefully, but watch for zones showing no area)
- The `properties.area_acres` fallback only exists on `farm_boundary` zone types — other zones rely solely on computed area
- The canvas AI panel (`components/canvas/panels/ai-panel.tsx`) still sends empty farmContext arrays — this works because the server enrichment path handles it, but it means an extra DB round-trip on every canvas AI request

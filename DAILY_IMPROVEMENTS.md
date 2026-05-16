# PermaCraft — 2026-05-16
## Focus: Map Intelligence (Friday)

### 1. Add implementation phases to AI context
Files: `lib/ai/prompts.ts`, `app/api/ai/analyze/route.ts`, `app/api/ai/chat/route.ts`
What changed: The AI now receives the farmer's implementation phases (name, description, date range) in both map analysis and text chat. Phases are fetched server-side alongside zones, plantings, and guilds.
Map/dashboard impact: When a farmer asks "what should I plant next?" or "help me plan my spring work", the AI can now reference their existing phases and align recommendations with their timeline rather than giving generic advice.

### 2. Pass map layer type to AI analysis
Files: `lib/ai/optimized-analyze.ts`, `components/immersive-map/immersive-map-editor.tsx`
What changed: The `mapLayer` field (satellite, terrain, topo, etc.) is now sent from the client to the analyze endpoint, so the AI prompt correctly states what type of imagery the user is viewing.
Map/dashboard impact: Previously the AI always assumed "satellite imagery" even when the user was viewing terrain/topo. Now the AI correctly interprets the screenshot type, improving terrain-aware recommendations when users are on topographic views.

### 3. Expand permaculture function gap detection
File: `lib/ai/context-compressor.ts`
What changed: Added 5 more critical permaculture functions to gap detection: `dynamic_accumulator`, `ground_cover`, `windbreak`, `pest_confuser`, `wildlife_habitat`. Also added dedicated keyword matching for guild/companion queries and phase/timeline queries.
Map/dashboard impact: The AI now proactively flags more ecosystem gaps (e.g., "no ground cover", "no windbreak") in its context, prompting richer recommendations. Guild and phase queries now reliably include relevant context rather than being filtered out by the compressor.

### 4. Fix context compressor keyword matching for guilds and phases
File: `lib/ai/context-compressor.ts`
What changed: Split guild keywords out of the plantings pattern into their own `needsGuilds` flag, added a `needsPhases` flag for timeline queries, and added `phasesList` to the compressed context output. Guild queries now always include both plantings and guild data; phase queries include phase timeline data.
Map/dashboard impact: Questions like "what companions should I plant with my apple tree?" or "what should I do in phase 2?" now include the full guild and phase context in the AI prompt instead of being treated as generic queries.

## Watch for
- Farms with many phases (10+) could add significant token count to prompts — monitor if this causes payload-too-large errors on free models
- The `phasesRes` variable in analyze route assumes the `phases` table always exists — if a farm was created before the phases migration, the query will return empty (safe) but worth noting
- Context compressor `phasesList` is additive to token count — no upper bound on phases text length for verbose mode

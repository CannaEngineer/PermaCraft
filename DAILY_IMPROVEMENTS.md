# PermaCraft -- 2026-06-02
## Focus: Map Intelligence (Tuesday)

### 1. Include sun/water requirements in native species AI context
Files: `app/api/ai/analyze/route.ts`, `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`
What changed: Native species listed in AI prompts now include sun requirements (e.g., "Full sun", "Part shade") and water requirements (e.g., "Medium water", "Wet to medium water") alongside the existing layer and height data. The chat endpoint now also queries these columns from the database.
Map/dashboard impact: When the AI recommends species placement, it can now match plants to site conditions — recommending shade-tolerant understory species for north-facing slopes and drought-tolerant species for exposed ridgelines instead of generic suggestions.

### 2. Widen context compressor keyword matching
File: `lib/ai/context-compressor.ts`
What changed: Expanded regex patterns in `buildOptimizedContext()` to catch more natural query phrasings. Added terms like "garden", "forest", "orchard", "succession", "mulch" for plantings; "pond", "creek", "ditch", "path" for water/lines; "local", "indigenous" for natives; "aim", "want", "hope" for goals; "first", "next", "step", "begin" for phases. Also added "together", "pair", "combine" for guilds.
Map/dashboard impact: When optimizations are enabled, queries like "What should I plant in my garden?" or "Where should I put a pond?" now correctly include all relevant farm context instead of dropping sections due to narrow keyword matching.

### 3. Stop sending filler text when farm has no goals
File: `lib/ai/goals-context.ts`
What changed: When a farm has no goals defined, `getGoalsForAIContext()` now returns an empty string instead of "No specific goals defined yet. The farmer has not set any specific objectives." The error handler also returns empty instead of "Error retrieving farmer goals."
Map/dashboard impact: Removes ~15 tokens of noise from every AI prompt for farms without goals. Cleaner context means the AI focuses on the actual farm data rather than acknowledging missing data.

### 4. Enhance text-chat system prompt with farm data interpretation guide
File: `lib/ai/prompts.ts`
What changed: Added a new "UNDERSTANDING FARM DATA" section to `GENERAL_PERMACULTURE_SYSTEM_PROMPT` that teaches the AI how to interpret zone types (zone_0 through zone_5, food_forest, etc.), read permaculture functions, use guild data to avoid duplicates, align with implementation phases, and match species to sun/water conditions. Also added instruction to use grid references when available.
Map/dashboard impact: Text-only AI chat now gives site-specific advice that acknowledges the actual zones, plantings, and guilds on the farm rather than generic permaculture guidance. For example, the AI will check existing guilds before recommending redundant companions.

## Watch for
- Farms where `climate_zone` is null may still get no native species recommendations (the query requires a hardiness zone). A future improvement could derive region from lat/lng coordinates and use the `broad_regions` field for better regional matching.
- The context compressor's expanded keywords could theoretically include more sections than needed for very specific queries, but the "include all for general queries" fallback already did this, so the token impact is minimal.
- Species in the database that only have `broad_regions` but not `min_hardiness_zone`/`max_hardiness_zone` may still be missed by the native species query.

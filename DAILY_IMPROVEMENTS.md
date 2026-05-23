# PermaCraft — 2026-05-23
## Focus: Map Intelligence (AI Context Quality)

### 1. Context compressor preserves critical planting attributes
File: `lib/ai/context-compressor.ts`
What changed: Standard and detailed verbosity modes now include native status ([NATIVE]/[NON-NATIVE]), scientific names, and permaculture functions for every planting. Minimal mode shows native status per species.
Map/dashboard impact: AI can now accurately assess functional gaps (e.g., "you have no nitrogen fixers"), avoid recommending duplicate species, and suggest proper companion plants — even when context compression is active.

### 2. Compressed context includes plantings when recommending new species
File: `lib/ai/context-compressor.ts`
What changed: `buildOptimizedContext` now includes existing plantings whenever native species recommendations are relevant (needsNatives), not just when the query explicitly mentions "plant" or "tree". Previously, "What should I add to improve biodiversity?" would show species suggestions without listing what's already planted.
Map/dashboard impact: AI stops suggesting species the farmer already has, and can recommend companions that complement existing plantings rather than conflict with them.

### 3. Current date and season added to AI prompts
File: `lib/ai/prompts.ts`
What changed: Both the vision analysis prompt (`createAnalysisPrompt`) and text chat prompt (`createGeneralChatPrompt`) now include the current month, year, and season. Season is hemisphere-aware (flipped for southern hemisphere farms based on latitude).
Map/dashboard impact: AI can give season-appropriate advice ("It's late spring — ideal time to transplant your tomato seedlings") and calculate plant maturity from planting year ("Your apple tree planted in 2022 is now 4 years old, approaching first fruit").

### 4. Zone descriptions and notes visible to AI
Files: `lib/ai/prompts.ts`, `app/api/ai/analyze/route.ts`, `app/api/ai/chat/route.ts`, `lib/ai/context-compressor.ts`
What changed: Zone properties (description, notes) are now extracted from the JSON properties field and included in AI context for both vision analysis and text chat. Zone entries now show: `"North Garden" (zone_1, Polygon) - Located at grid A4-C6, ~0.25 acres — "Future food forest site, south-facing slope"`.
Map/dashboard impact: When a designer annotates a zone with "planned rain garden" or "needs wind protection", the AI now sees and responds to those notes instead of only knowing the zone name and type.

## Watch for
- Guild templates are queried by `created_by` (user_id), not `farm_id` — if a user has multiple farms, ALL guilds appear in every farm's AI context. Fixing this requires adding `farm_id` to `guild_templates` table (schema migration).
- Client-sent `plantingsContext` prevents server from building a richer version that includes `sun_requirements` and `water_requirements`. Consider deprecating client-side context building in favor of server-side enrichment.
- The context compressor's keyword-based section filtering could be replaced with a lightweight classification model for better relevance matching.

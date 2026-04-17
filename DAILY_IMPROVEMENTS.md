# PermaCraft — 2026-04-17
## Focus: Map Intelligence (AI context quality)

### 1. Server-side farm data enrichment for AI analysis
File: `app/api/ai/analyze/route.ts`
What changed: When the client sends empty farmContext arrays (which is the current default), the server now independently fetches zones, plantings+species, lines, and native species from the database before building the AI prompt.
Map/dashboard impact: The AI now receives structured data about every drawn zone (name, type), every planting (species, layer, native status, year planted), and available native species for the region. Previously it only had the screenshot image with zero structured data about what was drawn.

### 2. Broadened keyword matching in context compressor
File: `lib/ai/context-compressor.ts`
What changed: The `buildOptimizedContext` function now matches far more common query patterns — "grow", "harvest", "food", "crop", "improve", "best", "suitable", "what should", "good for", "phase", "year", "budget", etc. Previously queries like "What should I grow here?" would skip plantings and native species context entirely because "grow" didn't match `plant|tree|species|guild`.
Map/dashboard impact: AI responses are now informed by the farm's actual composition for a much wider range of natural-language questions, not just ones that happen to use the word "plant" or "species".

### 3. Real farm composition data in text chat endpoint
File: `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`
What changed: The text-only chat endpoint now queries actual zone types and planting species (with layer and native status) instead of just sending "ZONES: 5, PLANTINGS: 12". The `createGeneralChatPrompt` function accepts and formats this composition data grouped by layer.
Map/dashboard impact: Text-only chat conversations about a farm now have full awareness of what's actually planted and zoned. The AI can reference specific species, identify missing layers, and give contextual recommendations without requiring a screenshot.

## Watch for
- The native species query uses `LIKE %climate_zone%` against `hardiness_zones` — if climate_zone values don't match the format stored in the species table, this query may return empty results. Monitor and adjust the matching logic if needed.
- The enrichment adds 3 parallel DB queries per analysis request. For farms with hundreds of plantings, the plantings context string could get long. The context compressor handles this when optimizations are enabled, but the non-optimized path sends the full string. May want to cap at ~50 plantings in the enriched context.
- Conversation history compression (`context-manager.ts`) still only captures the first sentence of user messages when summarizing. A future improvement would capture key AI recommendations too.

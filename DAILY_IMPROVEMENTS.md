# PermaCraft — 2026-05-08
## Focus: Map Intelligence

### 1. Fix latitude display for Southern hemisphere farms
File: `lib/ai/prompts.ts`
What changed: Latitude was always shown as `°N` in the AI prompt. Now correctly displays `°S` for negative latitudes.
Map/dashboard impact: Farms in South America, Australia, sub-Saharan Africa, etc. now get accurate location context in AI analysis, leading to correct climate-appropriate species recommendations.

### 2. Add grid coordinates to zones in server-side enrichment
File: `app/api/ai/analyze/route.ts`
What changed: When the server re-fetches zone data from the DB, it now calculates alphanumeric grid coordinates (e.g., `B3-D5`) for each zone using their actual geometry. Previously enriched zones only had name and type with no spatial references.
Map/dashboard impact: AI can now reference precise map locations when discussing zones — "your food forest at grid C4-E7 sits on a south-facing slope" instead of just "your food forest".

### 3. Add spatial awareness to text chat endpoint
Files: `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`
What changed: The chat endpoint now fetches zone geometry and computes grid coordinates, passing them to the AI prompt. The `createGeneralChatPrompt` function displays grid references next to each zone. Previously text chat mode had zero spatial context.
Map/dashboard impact: Users chatting about their farm design (without triggering screenshot analysis) now get spatially-aware responses. The AI can reference zone positions even in text-only conversations.

### 4. Smarter server-side enrichment detection
File: `app/api/ai/analyze/route.ts`
What changed: The `needsEnrichment` check now validates that client-provided farm data has usable fields (`zone_type`, `name`, `scientific_name`) instead of just checking array length. This prevents the server from skipping enrichment when the client sends arrays of objects with missing critical fields.
Map/dashboard impact: AI analysis reliably includes full farm context even when client state is incomplete (e.g., during initial page load or after partial data fetches).

## Watch for
- Farms with very large numbers of zones (50+) may generate large grid coordinate strings — monitor prompt token usage
- The grid coordinate calculation uses `imperial` units by default in both analyze and chat routes — farms with metric preference still get 50ft grid labels in chat mode (this matches the existing analyze behavior but should be unified in a future pass)
- The `createGeneralChatPrompt` now accepts an optional `gridCoordinates` field on zones — existing callers that don't pass it will work unchanged (graceful degradation)

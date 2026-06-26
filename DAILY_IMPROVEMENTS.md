# PermaCraft — 2026-06-26
## Focus: Map Intelligence (AI Context Quality)

### 1. Planting context now includes mature size, growth timeline, and growing requirements
File: `app/api/ai/analyze/route.ts`
What changed: Added `mature_height_ft`, `mature_width_ft`, `years_to_maturity`, `sun_requirements`, and `water_requirements` to the planting context string sent to the AI. These fields were being queried from the DB but silently dropped when building the prompt text.
Map/dashboard impact: The AI can now give spacing advice ("plant 20ft apart given the 50ft mature spread"), estimate canopy coverage timelines ("your oaks will shade this area in ~15 years"), and match plantings to site conditions ("this area gets full sun — your shade-loving ferns at B3 may struggle").

### 2. Compressed context preserves native status and scientific names
File: `lib/ai/context-compressor.ts`
What changed: Standard verbosity now includes scientific names and native/non-native markers (`[N]`/`[NN]`). Detailed verbosity adds permaculture functions. Previously, compressed mode stripped all of this — the AI couldn't distinguish native from non-native plants.
Map/dashboard impact: When context compression is active (for faster/cheaper queries), the AI still respects the "native species first" core principle and can reference species by scientific name for accuracy.

### 3. Zone water properties (catchment/swale data) now reach the AI
File: `app/api/ai/analyze/route.ts`, `lib/ai/prompts.ts`
What changed: Zones with configured catchment or swale properties now include that data in the AI context (e.g., `[catchment, 45in rain/yr, ~12,000gal capture]`). Previously, users who carefully configured water capture data got zero AI awareness of it — the zone context only sent name, type, grid location, and area.
Map/dashboard impact: When a user asks "how should I manage water on my farm?", the AI now sees existing swale capacity and catchment volumes, avoiding duplicate recommendations and enabling integrated water management advice.

### 4. Native species recommendations include sun/water requirements
File: `app/api/ai/analyze/route.ts`, `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`
What changed: Native species context sent to the AI now includes sun and water requirements alongside layer and height. Applied to both the vision analysis route and text chat route. The `createGeneralChatPrompt` type signature was also updated to accept these fields.
Map/dashboard impact: The AI can now match native species to actual site conditions visible in screenshots — recommending shade-tolerant natives for north-facing slopes and drought-tolerant species for exposed ridgelines, rather than generic region-appropriate lists.

## Watch for
- Farms with many zones that all have water properties: the zone context section could get long. If users report slower responses, the water property text may need compression similar to what the context-compressor does for plantings.
- The `years_to_maturity` and `mature_width_ft` columns may be null for older species entries — the formatting handles this gracefully (omits when null), but species database completeness affects AI recommendation quality.
- The chat route (`/api/ai/chat`) still doesn't fetch `mature_width_ft` or `years_to_maturity` for existing plantings — this is a lower priority since chat doesn't have visual context, but could be a follow-up improvement.

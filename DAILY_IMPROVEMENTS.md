# PermaCraft — 2026-05-19
## Focus: Map Intelligence (Tuesday)

### 1. Goals and native species restored in optimized AI context
File: `app/api/ai/analyze/route.ts`
What changed: The optimized analysis path was passing empty arrays for `goals` and `nativeSpecies` to the context compressor, so the AI never saw farmer objectives or region-appropriate native plants when optimizations were enabled (which is always from the client). Now fetches goals from `farmer_goals` table and native species from `species` table before building the compressor input.
Map/dashboard impact: AI recommendations now align with what the farmer actually wants to achieve and suggest region-appropriate native species, instead of giving generic advice that ignores their stated priorities and local ecology.

### 2. Zone spatial data included in compressed context
Files: `lib/ai/context-compressor.ts`, `app/api/ai/analyze/route.ts`
What changed: Added `zonesWithGrid` to `FarmContext` interface and updated the compressor to emit zone grid coordinates and area in the summary. The analyze route now attaches `enrichedZones` (with computed grid refs and acreage) to the farm context before compression.
Map/dashboard impact: When the AI receives compressed context, it still knows where each zone is on the grid and how large it is. Previously, compression stripped spatial data, causing the AI to give recommendations without knowing zone locations or sizes.

### 3. Planting spatial and temporal data added to text chat
Files: `app/api/ai/chat/route.ts`, `lib/ai/prompts.ts`
What changed: The chat endpoint now fetches `lat`, `lng`, and `planted_year` for each planting, computes grid references from coordinates, and passes `planted_year` and `gridRef` to the prompt builder. The `createGeneralChatPrompt` function now renders these fields (e.g., "Apple (Malus domestica) [NATIVE], planted 2022 at grid C4").
Map/dashboard impact: Text-only chat can now give spatially aware recommendations ("your apple tree at C4 could benefit from a comfrey companion at C5") and age-aware advice ("your 4-year-old apple is approaching its first significant fruit year").

### 4. Planning query detection expanded
File: `lib/ai/planning-detection.ts`
What changed: Added 6 new regex patterns to catch natural-language planning queries: "where do I start", "what should I do first", "prioritize", "multi-year plan", "crop rotation plan", "labor estimate", "what order", and "which comes first".
Map/dashboard impact: More planning-style questions now route to the structured planning model (MiniMax M2.5) instead of the general vision model, producing phased timelines and cost estimates when the farmer asks common planning questions in natural language.

## Watch for
- The additional DB queries (goals + native species) in the analyze route add ~2 round-trips when enrichment is needed — monitor latency on farms with many goals
- Grid ref computation for plantings in the chat route uses the same bounds calculation as zones — if a farm has plantings far outside zone boundaries, the grid refs may be at extreme edges (A1 or Z99)
- The expanded planning patterns could over-match conversational questions containing "prioritize" — watch for cases where simple questions get unnecessarily routed through the planning model
- Test fixture in `context-compressor.test.ts` was updated to include `phasesList` to match the `CompressedContext` interface

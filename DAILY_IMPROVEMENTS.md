# PermaCraft — 2026-06-27
## Focus: Map Intelligence (AI Context Quality)

### 1. Native status preserved in compressed AI context
File: `lib/ai/context-compressor.ts`
What changed: Added `[N]`/`[NN]` native status markers to all verbosity levels of the plantings list, plus a native vs non-native balance count in key facts.
Map/dashboard impact: When optimizations are enabled and the context compressor is used, the AI now always knows which plants are native — it can give accurate "Native Species First" recommendations instead of losing that critical data during compression.

### 2. Function coverage balance reported to AI (not just gaps)
File: `lib/ai/context-compressor.ts`
What changed: Key facts now include counts of present permaculture functions (e.g., "Functions present: 3 nitrogen fixer, 8 pollinator support") alongside the existing gap warnings. Also fixed permaculture_functions parsing to handle both string and array types.
Map/dashboard impact: The AI can now assess ecological balance — it knows the farm has 8 pollinator plants but only 1 nitrogen fixer, enabling targeted recommendations for what's underrepresented rather than just what's missing.

### 3. Query-aware context matching expanded for common permaculture terms
File: `lib/ai/context-compressor.ts`
What changed: Extended keyword patterns in `buildOptimizedContext()` to include common terms that were being missed: "garden", "orchard", "forest", "mulch", "diversity" for plantings; "path", "corridor", "slope" for lines; "climate", "hardiness" for natives; "season", "spring/summer/fall/winter" for phases; "purpose", "focus" for goals; "together", "pair", "combination" for guilds.
Map/dashboard impact: Users asking "What should I plant in my garden?" or "How do I manage the slope?" now receive relevant plantings/lines context instead of the AI answering without farm-specific data.

### 4. Water infrastructure data now included in AI context
Files: `lib/ai/context-compressor.ts`, `app/api/ai/analyze/route.ts`
What changed: The context compressor now extracts swale properties (length, volume capacity) and catchment properties (estimated annual capture) from zone data and appends them as a "Water infrastructure" section. The analyze route now fetches `swale_properties` and `catchment_properties` columns and passes them through to the compressor. Line water_properties (flow type, flow rate) are also included in the compressed lines context.
Map/dashboard impact: When a designer asks about water management, the AI now knows their swale holds ~500 gallons and their catchment captures ~12,000 gal/year — enabling specific, quantitative water management advice.

## Watch for
- Test file `lib/ai/context-compressor.test.ts` assertions updated to match new format — run tests to confirm all pass
- The chat route (`app/api/ai/chat/route.ts`) zones query still doesn't fetch water properties — the chat endpoint constructs its prompt directly via `createGeneralChatPrompt()` rather than through the compressor, so water data only flows through the map analysis path for now
- If farms have zones with JSON-encoded `swale_properties` or `catchment_properties` that don't match the expected structure, the try/catch blocks will silently skip them — no data corruption risk but the AI won't see malformed data

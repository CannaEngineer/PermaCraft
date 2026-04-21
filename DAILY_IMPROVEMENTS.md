# PermaCraft — 2026-04-21
## Focus: Map Intelligence (AI Context Quality)

### 1. Lines & Water Features Now Included in AI Context
Files: `app/api/ai/analyze/route.ts`, `lib/ai/prompts.ts`, `app/api/ai/chat/route.ts`
What changed: The AI previously had zero awareness of drawn lines (swales, water flow paths, fences, hedgerows, contour lines). Now all line features with their types, labels, and water properties (flow type, flow rate) are included in both the vision analysis and text chat prompts.
Map/dashboard impact: When a designer asks "where should I put a swale?" or "how should I manage water on this site?", the AI now sees existing swales, drainage paths, and fences — preventing contradictory suggestions and enabling recommendations that build on the existing water management infrastructure.

### 2. Permaculture Functions Added to Plantings Context
Files: `app/api/ai/analyze/route.ts`, `app/(app)/farm/[id]/farm-editor-client.tsx`
What changed: The plantings context sent to the AI now includes each species' permaculture functions (nitrogen fixer, pollinator support, edible fruit, etc.). Previously only name, layer, and planting year were sent.
Map/dashboard impact: The AI can now identify functional gaps in a design ("you have no nitrogen fixers in this guild") and recommend companion plants based on actual ecological roles rather than just species names. This is foundational for guild design recommendations.

### 3. Native Species Query Fixed to Use Correct Schema Fields
File: `app/api/ai/analyze/route.ts`
What changed: Server-side native species lookup was querying the deprecated `hardiness_zones` text field. Now queries `min_hardiness_zone`/`max_hardiness_zone` numeric range fields (with fallback to the old field for backwards compatibility).
Map/dashboard impact: Native species recommendations should now return correct matches for the farm's hardiness zone instead of potentially empty or incorrect results from pattern-matching a deprecated text field.

### 4. Context Compressor Now Preserves Line Feature Details
Files: `lib/ai/context-compressor.ts`, `lib/ai/context-compressor.test.ts`
What changed: The optimization pipeline's context compressor previously reduced all lines to a count ("X water features"). Now it categorizes by type ("2 swales, 1 fence") in summaries and includes individual labels at standard/detailed verbosity. Also added water-related query detection to conditionally include line details in compressed context.
Map/dashboard impact: Even when context optimizations are enabled (immersive editor), the AI retains meaningful awareness of the farm's water management and boundary features.

## Watch for
- The native species query now does integer comparison on hardiness zone strings (e.g., "9b" -> 9). Sub-zones (a/b) are stripped for comparison, which means zone 9a and 9b are treated equivalently. This is acceptable for species recommendations but worth noting.
- Lines context is built server-side during enrichment (when farmContext arrays are empty). The classic editor doesn't send lines in the client request, so it always goes through server enrichment. The immersive editor sends lines in farmContext but those only feed the compressor — the enrichedLinesContext is only built during server enrichment. If the immersive editor sends non-empty farmContext, lines won't appear in the standard (non-compressed) prompt path. This is acceptable because the immersive editor always uses enableOptimizations=true.
- The test file was updated to match new summary format and CompressedContext interface.

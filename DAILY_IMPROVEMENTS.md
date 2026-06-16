# PermaCraft — 2026-06-16
## Focus: Map Intelligence (AI context quality)

### 1. Context compressor now preserves critical planting data
File: `lib/ai/context-compressor.ts`
What changed: When optimizations are enabled, the compressed plantings list now includes scientific names, native status ([NATIVE]/[NON-NATIVE]), and permaculture functions at standard and detailed verbosity. Native species list now includes scientific names. Previously, compressed context stripped all of this — the AI was receiving just "Oak: canopy, year 2024" with no species name, no native status, and no ecological function data.
Map/dashboard impact: AI recommendations are now species-aware even when context compression is active. The AI can avoid recommending species already planted, correctly identify non-natives, and understand each plant's ecological role.

### 2. Context compressor keyword matching includes plantings when recommending natives or guilds
File: `lib/ai/context-compressor.ts`
What changed: Added `plantingsAlsoNeeded` flag so that queries triggering native species or guild context also include existing plantings. Previously, "what native tree should I plant near the water" matched natives + water but excluded plantings — the AI couldn't see what was already growing when recommending new additions.
Map/dashboard impact: AI recommendations no longer suggest planting species that already exist on the farm when the query is about adding new species or companions.

### 3. Planning enhancement now receives full farm context
File: `app/api/ai/analyze/route.ts`
What changed: The MiniMax M2.5 planning enhancer now receives zones with grid coordinates and area, existing plantings with functions, lines/water features, implementation phases, goals, and native species. Previously it only received farm name, acres, climate zone, and soil type — it had no idea what was already planted or what the farmer's goals were.
Map/dashboard impact: Implementation plans, budgets, and timelines now account for existing infrastructure, align with the farmer's phases and goals, and don't recommend duplicating work that's already done.

### 4. Conversation history summary preserves AI recommendations
File: `lib/ai/context-manager.ts`
What changed: `summarizeOldMessages()` now extracts the first substantive sentence from each AI response and pairs it with the user's question. Previously, only user questions were captured — the AI's actual recommendations were entirely dropped. The summary also now instructs the model not to repeat earlier suggestions.
Map/dashboard impact: In multi-turn conversations, the AI remembers what it previously recommended and builds on those suggestions rather than repeating itself or contradicting earlier advice.

## Watch for
- The compressed plantings list is now longer (scientific names + functions). For farms with 200+ plantings and optimizations enabled, monitor whether token estimates stay within the 2000-token target.
- The planning enhancer prompt is now larger with full farm context. Watch for 413 (payload too large) errors on MiniMax M2.5 for farms with very detailed data — the existing fallback to vision-only response handles this gracefully.
- Conversation summary extraction uses a heuristic (first line >30 chars, not a heading). If AI responses start with markdown headers followed by lists, the summary may pick a less-than-ideal sentence. Could be improved with an AI-powered summarizer in the future (the hook already exists in `summarizeWithAI()`).

# PermaCraft — 2026-05-05
## Focus: Map Intelligence (AI Context Quality)

### 1. Fix broken conversation threading in optimized analysis flow
Files: `lib/ai/optimized-analyze.ts`, `components/immersive-map/immersive-map-editor.tsx`
What changed: `analyzeWithOptimization` now passes `conversationId` to the API and returns the server-assigned `conversationId`, `analysisId`, and `generatedImageUrl` back to the caller.
Map/dashboard impact: Multi-turn design conversations now actually work — the AI remembers previous questions/answers in the same session instead of starting fresh on every message. Designers can iteratively refine recommendations.

### 2. Fix context compression dropping all farm data for general queries
File: `lib/ai/context-compressor.ts`
What changed: When a user's query doesn't match any specific keyword pattern (plantings, water, natives, goals), it's now classified as a "general query" and ALL compressed context is included. Previously, queries like "How does my farm look?", "Any suggestions?", or "Analyze my design" would only receive a one-line summary.
Map/dashboard impact: The AI now gives site-specific answers to broad questions instead of generic permaculture advice. A farmer asking "what do you think?" gets responses that reference their actual plantings, water features, and goals.

### 3. Include guild (companion planting) data in compression pipeline
Files: `lib/ai/context-compressor.ts`, `app/api/ai/analyze/route.ts`, `lib/ai/context-compressor.test.ts`
What changed: Added `guilds` to `FarmContext` interface and `guildsList` to `CompressedContext`. The compression function now extracts focal species and companions from guild data. The analyze endpoint passes guild rows into the enriched farm context used by the compressor. `buildOptimizedContext` always includes guild data when present.
Map/dashboard impact: When optimizations are enabled (the default path in the immersive editor), the AI now knows about designed companion planting guilds and can recommend species that complement existing designs rather than duplicating or conflicting with them.

## Watch for
- The `handleAnalyze` function in the immersive editor previously returned hardcoded `conversationId: 'new'` — verify that `use-ai-chat` properly updates its `currentConversationId` with the real value from the API response (it should via the existing logic in `submitMessage`).
- General queries now include all context sections, which uses more tokens. Monitor whether this causes token budget issues on large farms with many plantings. The compressed format already keeps plantings concise, so this should be safe.
- The test file previously tested that "irrelevant" queries excluded sections — changed this to test that general queries include everything, which better matches the desired behavior.

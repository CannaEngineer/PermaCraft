# PermaCraft -- 2026-06-06
## Focus: Performance + Reliability (Saturday)

### 1. Viewport-based planting marker culling
File: `components/map/farm-map.tsx`
What changed: Planting markers are now only rendered for plantings within the current viewport (plus a 20% margin). Viewport bounds are tracked via `moveend` events and the visible subset is computed with `useMemo`. Previously, ALL plantings were rendered as DOM elements regardless of visibility.
Map/dashboard impact: A farm with 500 plantings now renders ~50-100 DOM marker nodes instead of 500. Panning and zooming feel snappier, especially on mobile devices and large farms. Markers appear seamlessly as users pan into new areas thanks to the margin buffer.

### 2. Fix N+1 conversations query
File: `app/api/farms/[id]/conversations/route.ts`
What changed: Replaced N+1 query pattern (1 query for conversations + 1 query per conversation for preview) with a single JOIN query using `ROW_NUMBER()` window function. A farm with 50 conversations now makes 2 DB queries (auth + data) instead of 52.
Map/dashboard impact: Conversation list loads significantly faster, especially for active farms with many AI analysis sessions. Reduces Turso round-trip overhead.

### 3. Memoize UnifiedCanvasContext value
File: `contexts/unified-canvas-context.tsx`
What changed: Wrapped the context provider value object in `useMemo` with explicit dependencies. Previously, a new value object was created on every render, causing all context consumers (the entire app tree under the provider) to re-render even when no relevant state changed.
Map/dashboard impact: Reduces unnecessary re-renders across the canvas — map, sidebar, panels, and toolbar no longer re-render when unrelated context state remains stable. Noticeable improvement on lower-powered devices.

### 4. Layer toggle optimistic updates
File: `contexts/layer-context.tsx`
What changed: Layer visibility/lock toggles now apply optimistic local state updates immediately instead of waiting for API response + full re-fetch. On API failure, state reverts automatically. Also fixed `refreshLayers` dependency on `activeLayer` which could cause re-fetch loops — now uses a ref instead.
Map/dashboard impact: Toggling layer visibility/lock feels instant instead of waiting for a network round-trip. The UI responds immediately and rolls back gracefully if the server rejects the change.

## Watch for
- Viewport culling uses geographic bounds, not pixel bounds — at extreme zoom levels with very wide margins, most plantings will pass the filter. This is intentional to avoid missing markers at edges.
- The conversations JOIN uses `ROW_NUMBER()` which requires SQLite 3.25+ (Turso supports this). If the codebase ever targets an older SQLite version, this query would need to be rewritten.
- The `refreshLayers` dependency change means it no longer re-creates when `activeLayer` changes. The initial active layer is still set correctly on first load; subsequent changes to active layer are tracked via ref.
- Pre-existing TypeScript errors in `lib/ai/context-compressor.test.ts` and `lib/species/native-matcher.test.ts` are unrelated to these changes (missing test runner types and stale Species type).

# P0 & P1 Gap Fixes — Design Document

**Date:** 2026-02-22
**Branch:** feature/unified-canvas
**Scope:** All P0 critical bugs + P1 canvas completeness gaps

---

## Overview

This document covers the design for fixing all P0 bugs and P1 UX gaps identified in the Feb 22 gap analysis. The work falls into two tracks:

- **Track A (P0):** Broken functionality that blocks core user flows
- **Track B (P1):** Canvas navigation and UI completeness

All changes are additive. No DB schema changes. No breaking API changes.

---

## Track A — P0 Critical Bug Fixes

### A1: DrawingToolbar Stubs in Unified Canvas

**Problem:** In `unified-canvas.tsx`, the `DrawingToolbar` receives stub handlers:
```tsx
onToolSelect={(tool) => console.log('Tool:', tool)}
onZoneTypeClick={() => console.log('Zone type')}
```
Drawing tools appear but do nothing when clicked.

**Fix:** Wire real handlers that update `drawingMode`, `activeDrawTool`, and `currentZoneType` state — the same state that is already passed to `FarmMap` via `externalDrawingMode` and `externalDrawTool` props. These state variables exist in `UnifiedCanvasContent`; the handlers just need to be written and passed.

**Files:** `components/canvas/unified-canvas.tsx`

---

### A2: FAB Plant Selection Flow (FE-01, FE-02, FE-03)

**Problem:** Three linked bugs break the "Add a Plant" flow:
- FE-01: Click handler on species picker items not firing
- FE-02: FAB "Add a Plant" button does nothing
- FE-03: Species picker modal renders behind the collapsible header

**Approach:** Trace the flow end-to-end:
1. `MapFAB` → `onAddPlant` prop → `handleAddPlant` in unified canvas
2. `handleAddPlant` → triggers species picker via `triggerSpeciesPicker` state
3. Species picker item click → `onSpeciesSelect` callback → `pendingPlantSpecies` state
4. `FarmMap` receives `externalSelectedSpecies` and places the plant

Read each file in this chain and fix whatever link is broken. The z-index issue (FE-03) needs the species picker to render in a portal above all map overlays.

**Files:**
- `components/canvas/unified-canvas.tsx` — `handleAddPlant`, `handleSpeciesPickerOpened`
- `components/map/species-picker-panel.tsx` — click handler and portal
- `components/immersive-map/map-fab.tsx` — `onAddPlant` prop wiring

---

### A3: Slide-Up Drawers Not Expanding Fully (FE-04)

**Problem:** The bottom drawer in the immersive/canvas editor doesn't expand fully — content is cut off or not scrollable.

**Fix:** In `components/immersive-map/bottom-drawer.tsx`, audit the height calculations. The drawer likely needs `max-h-[calc(100dvh-...)]` with `overflow-y-auto` on the content container. The header height must be subtracted from the available height.

**Files:** `components/immersive-map/bottom-drawer.tsx`

---

### A4: Farm Vitals AI Not Working (AI-01)

**Problem:** The Farm Vitals LLM suggestion engine returns nothing or errors silently.

**Approach:**
1. Read `components/canvas/unified-canvas.tsx` — find `handleVitalRecommendations`
2. Read `lib/ai/optimized-analyze.ts` — find `analyzeWithOptimization`
3. Check `app/api/ai/analyze/route.ts` — validate the request shape
4. Add error logging to surface the actual failure mode before fixing

**Files:**
- `components/canvas/unified-canvas.tsx` — `handleVitalRecommendations`, `vitalPrompt`
- `lib/ai/optimized-analyze.ts`
- `app/api/ai/analyze/route.ts`

---

### A5: Shared AI Insights Not in Community (SC-01)

**Problem:** When a user shares AI analysis to the community, the post doesn't appear in the feed.

**Approach:** Trace the share flow from the chat panel → post creation API → feed query. The likely issue is either a missing `is_published = 1` flag or the feed query filtering out AI-generated posts.

**Files:**
- `components/immersive-map/chat-overlay.tsx` — share action
- `app/api/farms/[id]/posts/route.ts` — post creation
- `app/api/feed/route.ts` — feed query

---

## Track B — P1 Canvas Completeness

### B1: AI Nav Item Doesn't Open Chat

**Problem:** Clicking the AI nav item (NavRail or MobileNav) calls `setActiveSection('ai')` which closes the context panel but never calls `setChatOpen(true)`. The ChatOverlay stays hidden.

**Fix:** In `contexts/unified-canvas-context.tsx`, when `section === 'ai'`, also call `setChatOpen(true)`. Since `setChatOpen` lives in `ImmersiveMapUIContext`, we have two options:

**Option 1 (preferred):** In `unified-canvas.tsx`, add a `useEffect` that watches `activeSection` — when it becomes `'ai'`, call `setChatOpen(true)`.

**Option 2:** Move `chatOpen` state into `UnifiedCanvasContext` so it's accessible everywhere.

Option 1 is simpler and less disruptive.

**Files:**
- `components/canvas/unified-canvas.tsx` — add useEffect watching activeSection
- `components/canvas/canvas-mobile-nav.tsx` — ensure AI item appears (it does, verified)

---

### B2: Plants Nav Item Missing from Mobile Nav

**Problem:** Desktop `NavRail` has 6 items (home, farm, explore, plants, learn, ai). Mobile `CanvasMobileNav` only has 5 — `plants` is absent.

**Fix:** Add `{ id: 'plants', icon: Leaf, label: 'Plants' }` to `mobileNavItems` in `canvas-mobile-nav.tsx`.

**Files:** `components/canvas/canvas-mobile-nav.tsx`

---

### B3: Password Reset Email

**Problem:** `app/api/admin/users/[id]/reset-password/route.ts` has a TODO — no email is sent.

**Design:** Since Better Auth is the auth provider, use its built-in password reset flow if available, or generate a reset token and send via a transactional email. Given no email service is configured in the env vars, the pragmatic fix is to:
1. Generate a secure random token
2. Store it in the DB with an expiry (add to `sessions` or a new `password_reset_tokens` table — additive only)
3. Return the reset link in the API response for now (admin can copy it)
4. Add a TODO comment noting email integration is needed

**Note:** No new DB table needed — store token + expiry as a JSON blob in a new `password_reset_tokens` table (additive).

**Files:**
- `app/api/admin/users/[id]/reset-password/route.ts`
- DB migration: add `password_reset_tokens` table

---

## Implementation Order

```
P0 first, in dependency order:
  1. A1 — DrawingToolbar stubs (isolated, fast)
  2. A2 — Plant selection flow (FE-01/02/03, end-to-end)
  3. A3 — Bottom drawer height (isolated CSS)
  4. A4 — Farm Vitals AI (requires investigation first)
  5. A5 — Shared AI insights (requires investigation first)

P1 after all P0s verified:
  6. B1 — AI nav opens chat
  7. B2 — Plants in mobile nav (2-line fix)
  8. B3 — Password reset token
```

---

## Success Criteria

| Fix | Verified When |
|-----|--------------|
| A1 | Drawing tool buttons change zone type on map |
| A2 | Tap "Add a Plant" → picker opens above header → tap species → marker placed on map |
| A3 | Bottom drawer expands to full height with scrollable content |
| A4 | Farm Vitals panel returns AI recommendations without errors |
| A5 | Sharing AI analysis creates a post visible in community feed |
| B1 | Clicking AI nav item opens the chat overlay |
| B2 | Plants nav item visible and functional on mobile |
| B3 | Admin reset-password returns a valid token/link |

---

## Out of Scope (P2, separate plan)

- Journal routing
- Annotation media uploads
- Shop checkout/payment
- Shop panel in canvas nav
- Community/profile in canvas
- Sentry integration
- Test coverage

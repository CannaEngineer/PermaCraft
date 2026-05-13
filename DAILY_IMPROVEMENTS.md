# PermaCraft — 2026-05-13
## Focus: Dashboard (Wednesday)

### 1. Fix stale "Updated X ago" timestamp on farm cards
File: `lib/db/queries/dashboard.ts`
What changed: The dashboard query only used `farms.updated_at` for the "Updated X ago" display, which doesn't reflect activity on child tables. Now computes `last_activity_at` as the MAX of `farms.updated_at`, the latest zone `updated_at`, latest planting `updated_at`, and latest line `updated_at`. Sort order also uses this derived timestamp so the most recently worked-on farm appears first.
Map/dashboard impact: A designer who just added plantings or drew zones now sees "Updated 2 minutes ago" instead of a stale date from when the farm record itself was last modified. Farm ordering in the selector also reflects actual work recency.

### 2. Wire up farm deletion from the dashboard
Files: `components/dashboard/farm-hero-card.tsx`, `components/dashboard/dashboard-client-v2.tsx`
What changed: Added a delete button (trash icon) in the FarmHeroCard's inline edit mode. Clicking it opens the existing `DeleteFarmDialog` with full confirmation flow (type "DELETE FARM"). On successful deletion, the farm is removed from local state, the active farm switches to the next available one, and the page refreshes server data via `router.refresh()`.
Map/dashboard impact: Designers with stale test farms or abandoned designs can now delete them directly from the dashboard without navigating elsewhere. The two-step confirmation prevents accidental deletions.

### 3. Make activity timeline items clickable
File: `components/dashboard/activity-timeline.tsx`
What changed: Activity items (zones, plantings, lines, tasks, AI analyses) now render as `<Link>` elements pointing to the farm editor. AI-type items link to `/farm/[id]?tab=ai`; all others link to `/farm/[id]`. Previously, items were non-interactive `<div>` elements.
Map/dashboard impact: Designers can click any activity item to jump straight to the relevant farm editor. The timeline now functions as navigation, not just a log.

### 4. Clarify farm selector abbreviations
Files: `components/dashboard/dashboard-client-v2.tsx`, `components/dashboard/farm-tab-strip.tsx`
What changed: Replaced cryptic one-letter abbreviations ("3z · 12p · 2l") with readable labels ("3 zones · 12 plants · 2 lines") in both the horizontal farm selector cards and the tab strip variant. Added proper pluralization.
Map/dashboard impact: First-time users and returning designers can immediately read farm stats without memorizing abbreviations.

## Watch for
- The `MAX()` function in SQLite accepts multiple arguments (multi-arg MAX), which is supported in SQLite 3.9+ and libSQL. If the Turso instance runs an older SQLite, this would need to be rewritten as nested CASE/COALESCE expressions.
- Farm deletion removes the farm from client state immediately. If the DELETE API call fails, the farm disappears from the UI but still exists in the DB. A page refresh would restore it. Could add error handling with rollback in a future pass.
- Activity timeline links go to the farm editor root, not to a specific feature. Deep-linking to a specific zone/planting would require the map editor to accept a `?featureId=` param and pan to it — a future enhancement.

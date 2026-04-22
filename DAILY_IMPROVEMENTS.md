# PermaCraft — 2026-04-22
## Focus: Dashboard (Design Management & Data Clarity)

### 1. Farm Edit API — Rename, Update Acres, Description from Dashboard
File: `app/api/farms/[id]/route.ts`
What changed: The PATCH endpoint previously only supported toggling `is_public`. Now accepts `name`, `description`, `acres`, `climate_zone`, and `soil_type` with full Zod validation. Builds dynamic UPDATE query from provided fields only.
Map/dashboard impact: Designers can now rename farms and correct acreage directly from the dashboard hero card via an inline edit UI (pencil icon on hover → editable name + acres fields → save/cancel). Previously required deleting and recreating a farm to fix a typo in the name.

### 2. Inline Farm Edit UI on Hero Card
File: `components/dashboard/farm-hero-card.tsx`
What changed: Added hover-reveal pencil icon next to farm name that opens inline edit mode with name input and acres input. Save persists via the expanded PATCH API and propagates changes to the dashboard client state via `onFarmUpdate` callback. Escape/Cancel reverts.
Map/dashboard impact: Zero-friction farm metadata editing. A designer with 5+ farms can quickly correct names or acreage without leaving the dashboard.

### 3. Task Delete Button in Dashboard Widget
File: `components/dashboard/tasks-widget.tsx`
What changed: Each task row now shows a trash icon on hover (via `group-hover/row` pattern). Clicking it optimistically removes the task from local state and fires a DELETE request to the existing `/api/farms/[id]/tasks/[taskId]` endpoint.
Map/dashboard impact: Designers can remove accidental or stale tasks directly from the dashboard. Previously tasks could only be marked complete or toggled — never deleted from the UI despite the API supporting it.

### 4. Eco Health Score in Farm Selector Cards
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: The multi-farm selector strip now shows each farm's ecosystem health percentage with color coding (green ≥75%, amber ≥50%, red <50%) alongside the existing plant count and acreage.
Map/dashboard impact: When a designer has multiple farms, they can instantly see which needs ecological attention without clicking through each one. The score was already computed server-side but wasn't surfaced in the selector.

### 5. Task Events in Activity Timeline
Files: `lib/db/queries/dashboard.ts`, `components/dashboard/activity-timeline.tsx`
What changed: The `getRecentActivity` UNION query now includes a fourth branch for tasks — showing completed tasks (with "Completed: " prefix) and recently created tasks (within 7 days). Added `task` type to the timeline component's icon/color mapping (amber CheckSquare icon).
Map/dashboard impact: Task completions are now visible in the activity feed alongside AI analyses, new plantings, and zone changes. This gives a complete picture of farm design activity, not just feature additions.

## Watch for
- The inline farm edit uses optimistic local state updates via `onFarmUpdate` callback. If the PATCH request fails silently (network issue), the dashboard will show the new name until page refresh. A toast notification on failure would improve this.
- Task delete is also optimistic — if the DELETE fails, the task disappears from UI but persists in DB. Same toast improvement applies.
- The activity timeline task query uses `unixepoch() - 604800` (7 days) for recent tasks. This is computed server-side at render time. If the dashboard is cached aggressively, the cutoff could drift.
- Farm selector eco scores are from server-side initial render. If a user adds plantings in another tab and returns to dashboard, scores won't update until full page reload.

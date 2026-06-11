# PermaCraft — 2026-06-11
## Focus: Dashboard (Wednesday)

### 1. Persist alert dismissals across page loads
File: `components/dashboard/alert-banner.tsx`
What changed: Alert dismissals (frost risk, urgent tasks) now persist to localStorage with a date-based expiry — dismissed alerts stay hidden for the rest of the day but reappear the next morning when conditions may have changed.
Map/dashboard impact: Designers who check the dashboard multiple times per day no longer see the same frost or urgent-task banners after dismissing them.

### 2. Show completed task count in empty states
Files: `lib/db/queries/dashboard.ts`, `app/(app)/dashboard/page.tsx`, `components/dashboard/tasks-widget.tsx`, `components/dashboard/dashboard-client-v2.tsx`
What changed: Added `getCompletedTaskCount` query (tasks completed in the past 7 days) and plumbed it through to the TasksWidget. Empty states now show "All caught up! — X tasks completed this week" instead of a generic message.
Map/dashboard impact: Designers who complete all their tasks now see concrete progress feedback instead of a message that could mean "nothing was ever here."

### 3. Fix loading skeleton layout shift
File: `app/(app)/dashboard/loading.tsx`
What changed: Added skeleton placeholders for the farm selector strip (for multi-farm users) and the bottom section (activity timeline + progress panel). Corrected the hero card stats skeleton to show 4 metric placeholders instead of 3.
Map/dashboard impact: Page load no longer causes visible layout jumps as content streams in.

### 4. Fix eco functions denominator fragility
File: `components/dashboard/farm-hero-card.tsx`
What changed: Changed `totalFunctions` from `Object.keys(ecoFunctions).length` (dynamic) to the constant `8`, matching the canonical `ECO_FUNCTIONS` list in the query layer.
Map/dashboard impact: New farms or farms with no species always show "0/8 Functions" instead of a confusing "0/0".

## Watch for
- The `getCompletedTaskCount` query uses `unixepoch() - 604800` for a 7-day window. If task volume grows, consider adding an index on `(farm_id, status, completed_at)`.
- Alert dismissals use local timezone date for expiry. A designer crossing midnight while working might see alerts re-appear mid-session.

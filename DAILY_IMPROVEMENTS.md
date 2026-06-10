# PermaCraft — 2026-06-10
## Focus: Dashboard

### 1. Tasks widget: overdue-first sorting + overflow indicator + completed count
File: `components/dashboard/tasks-widget.tsx`
What changed: Tasks now sort overdue items to the top within each tab view (before priority). When more than 6 tasks match the active filter, a "+N more tasks" link appears at the bottom. A completed count shows alongside. Empty states are clearer.
Map/dashboard impact: Designers with many tasks immediately see what's overdue and know their full workload at a glance instead of seeing a silent 6-item truncation.

### 2. Activity timeline: type filter pills
File: `components/dashboard/activity-timeline.tsx`
What changed: When the activity feed contains multiple event types (AI, Plants, Zones, Lines, Tasks), compact filter pills appear above the timeline. Click to toggle a type; counts shown on each pill. A filtered-empty state with "show all" link handles the case where a filter produces no results.
Map/dashboard impact: Active designers who've been adding zones, plantings, and running AI analyses can now quickly filter to just the activity type they care about instead of scrolling through a mixed feed.

### 3. Multi-farm aggregate summary strip
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: For users with 2+ farms, a compact summary line appears above the farm selector cards showing total zones, total plants, total lines, average eco health percentage, and urgent task count across all farms.
Map/dashboard impact: Designers managing multiple properties get an instant cross-farm overview without clicking through each one.

## Watch for
- Tasks widget `completedCount` relies on optimistic local state — if a task is toggled to "completed" and the API call fails silently, the count may drift. The existing optimistic toggle pattern doesn't handle API errors, which is a pre-existing issue.
- Activity timeline filter state resets when switching farms (since the component re-renders with new items). This is correct behavior but worth noting.
- Aggregate summary recalculates on every render. For <20 farms this is negligible; if farm counts grow significantly, memoize it.

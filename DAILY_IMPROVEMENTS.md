# PermaCraft — 2026-05-20
## Focus: Dashboard (Wednesday)

### 1. Fix tasks widget "week" filter including all undated tasks
File: `components/dashboard/tasks-widget.tsx`
What changed: Removed `due_date === null` from the "week" tab filter and the smart-default-tab computation. Tasks without a due date now only appear in the "all" tab, as intended.
Map/dashboard impact: The "week" tab previously showed every task that lacked a due date, making it functionally identical to "all". Designers now see only tasks actually due within 7 days (plus urgent tasks), making the tab useful for weekly planning.

### 2. Activity timeline type labels for scanability
File: `components/dashboard/activity-timeline.tsx`
What changed: Added a `label` field to each activity type metadata ("AI", "Plant", "Zone", "Line", "Task") and rendered it as a small prefix before the item title.
Map/dashboard impact: When scanning recent activity, designers can now instantly distinguish "Zone: Oak Savanna" from "Plant: Oak" without relying on small color-coded icons alone. Especially useful on mobile where icons are harder to differentiate.

### 3. Farm selector shows task count and frost alerts
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: Replaced the minimal 2.5px urgent dot with a numbered badge showing the urgent task count, added pending task count to the farm stats line, and separated frost-risk indication into its own visual (blue dot) when there are no urgent tasks.
Map/dashboard impact: Designers managing multiple farms can now see at a glance which farm has 3 urgent tasks vs. which just has a frost warning, without clicking through each one. The pending task count in the stats line ("5 tasks") provides triage context alongside zone/plant counts.

## Watch for
- The "week" filter fix means users who relied on undated tasks showing in "week" will now need to switch to "all" — this is correct behavior but may feel like tasks "disappeared" if they never set due dates
- The `pendingTaskCount` in the farm selector iterates `data.tasks` which is pre-filtered to exclude completed/skipped tasks (from the DB query), so the count is accurate
- Farm selector pills are slightly wider now with the task count text — monitor horizontal scroll behavior on mobile with 5+ farms

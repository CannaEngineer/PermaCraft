# PermaCraft — 2026-06-24
## Focus: Dashboard (Wednesday)

### 1. Tasks widget: completed tasks visibility
Files: `lib/db/queries/dashboard.ts`, `components/dashboard/tasks-widget.tsx`, `app/(app)/dashboard/page.tsx`, `components/dashboard/dashboard-client-v2.tsx`
What changed: `getFarmTasks` now returns both active tasks and recently completed tasks (last 7 days) in parallel queries. Added a "Done" tab to the tasks widget showing completed tasks with completion timestamps. Toggling a task to completed moves it to the done list optimistically; re-opening moves it back.
Map/dashboard impact: Designers can now see their accomplishment history on the dashboard. Previously, completing a task caused it to vanish on refresh — no progress tracking was possible.

### 2. Tasks widget: priority picker on inline creation
File: `components/dashboard/tasks-widget.tsx`
What changed: The inline "add task" form now includes a priority selector with 4 levels (Low, Normal, High, Urgent). Previously all tasks created from the dashboard were hardcoded to priority 2 (Normal).
Map/dashboard impact: Designers can create properly prioritized tasks without leaving the dashboard. Urgent field tasks show up in the "today" tab immediately after creation.

### 3. Learning progress: parallelize DB queries
File: `components/dashboard/learning-progress.tsx`
What changed: The 4 independent database queries (next lessons, completed count, total lessons, recent badges) now run via `Promise.all` instead of sequentially. The first query (user progress) still runs first since its result determines which queries to run.
Map/dashboard impact: Reduces dashboard load time by ~200-600ms depending on DB latency, since 4 round-trips become 1.

## Watch for
- The `getFarmTasks` return type changed from `Task[]` to `{ active: Task[]; recentlyCompleted: Task[] }`. The intel/tasks-card.tsx component (used in IntelligenceRow) still accepts flat `Task[]` — it's currently unused but would need updating if re-enabled.
- Recently completed tasks query filters on `completed_at > unixepoch() - 604800` (7 days). Tasks completed without `completed_at` being set won't appear in the done tab.
- The optimistic toggle moves tasks between active/completed lists client-side. If the PATCH request fails silently, the UI will be out of sync until refresh.

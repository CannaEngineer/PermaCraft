# PermaCraft — 2026-05-06
## Focus: Dashboard

### 1. Show due dates on task rows with overdue highlighting
Files: `components/dashboard/tasks-widget.tsx`
What changed: Each task row now displays its due date relative to today (overdue, due today, due tomorrow, or "due in X days"). Overdue tasks show in red with a clock icon and a red-tinted checkbox circle. The layout shifts from single-line to a two-line format (title + due date) so dates don't compete with priority badges.
Map/dashboard impact: Designers can now prioritize at a glance — a task due tomorrow looks different from one due in 6 days. Overdue items are immediately visible without expanding or switching tabs.

### 2. Fix TypeScript type safety across dashboard components
Files: `components/dashboard/tasks-widget.tsx`, `components/dashboard/dashboard-client-v2.tsx`, `components/dashboard/farm-hero-card.tsx`, `components/dashboard/activity-timeline.tsx`, `components/dashboard/alert-banner.tsx`, `components/dashboard/season-widget.tsx`, `components/dashboard/intel/tasks-card.tsx`, `lib/db/queries/dashboard.ts`
What changed: Added explicit type annotations to all callback parameters that were implicit `any` (filter predicates, setState callbacks, event handlers, map row accessors). Fixed `React.ReactNode` / `JSX.Element` namespace errors by importing `ReactNode` directly from React. Over 30 implicit-any errors resolved.
Map/dashboard impact: No visible change for users, but prevents silent runtime bugs in data flowing through dashboard callbacks and improves IDE autocomplete for developers working on these components.

### 3. Add line count to farm stats
Files: `lib/db/queries/dashboard.ts`, `components/dashboard/farm-hero-card.tsx`, `components/dashboard/dashboard-client-v2.tsx`
What changed: The dashboard query now JOINs the `lines` table and counts distinct lines per farm. The `DashboardFarm` interface includes `line_count`. The hero card shows line count as a metric when > 0. The farm selector pills show the abbreviated count.
Map/dashboard impact: Designers who draw paths, swales, fences, hedges, and contour lines now see those features represented in their farm stats — previously only zones and plantings were counted.

### 4. Extract shared DashboardFarmData interface
Files: `lib/db/queries/dashboard.ts`, `app/(app)/dashboard/page.tsx`, `components/dashboard/dashboard-client-v2.tsx`
What changed: The `FarmData` interface (farm + eco score + tasks + insights + activity + seasonal context) was defined identically in both `page.tsx` and `dashboard-client-v2.tsx`. Extracted to `DashboardFarmData` in `lib/db/queries/dashboard.ts` and imported in both consumers.
Map/dashboard impact: No visible change, but eliminates a maintenance hazard where the two copies could silently drift apart.

## Watch for
- The `lines` LEFT JOIN in `getDashboardFarms` adds a fourth table to the GROUP BY query. For users with many farms, monitor query performance — if it degrades, consider moving line counts to a subquery like the screenshot lookup.
- The `formatDueDate` helper compares against `isPast(d) && !isToday(d)` for overdue detection. If tasks store due dates as end-of-day timestamps, this is correct. If they store midnight timestamps, a task due "today" could briefly appear overdue before midnight.
- The `DashboardFarmData` export from `lib/db/queries/dashboard.ts` now imports `SeasonalContext` — this creates a dependency from the DB query module to the seasonal utility. This is fine architecturally (both are server-only) but worth noting.

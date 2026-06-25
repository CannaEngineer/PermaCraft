# PermaCraft — 2026-06-25
## Focus: Dashboard (Wednesday)

### 1. Parallelize LearningProgress DB queries
File: `components/dashboard/learning-progress.tsx`
What changed: Wrapped the 3 sequential database queries (completed count, total lessons, recent badges) into a single `Promise.all()` call. Previously these ran one after another on every dashboard page load.
Map/dashboard impact: Faster dashboard rendering — eliminates 2 round-trips of query waterfall. For users with an active learning path, this saves ~100-300ms of sequential DB latency on every dashboard visit.

### 2. Fix handleFarmDelete stale closure bug
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: Moved the active-farm-selection logic inside the `setLocalFarms` functional updater so it reads from the post-deletion list rather than the stale closure value. Removed `localFarms` from the `useCallback` dependency array since it's no longer read from the closure.
Map/dashboard impact: Previously, deleting the active farm and rapidly interacting could select the wrong (deleted) farm as active, because the closure-captured `localFarms` hadn't updated yet. Now the remaining-farm selection always uses the correct filtered list.

### 3. Cap activity timeline query row count
File: `lib/db/queries/dashboard.ts`
What changed: Capped `perSubqueryLimit` to `Math.min(farmIds.length * 15, 100)` in `getBatchRecentActivity`. Previously the limit scaled linearly with farm count (e.g., 20 farms = 300 rows per subquery = 1500 total rows fetched, with only 200 actually used).
Map/dashboard impact: For power users with many farms, the activity timeline query now fetches at most 500 rows (5 subqueries x 100) instead of scaling unboundedly. Reduces DB read time and memory allocation on the dashboard.

### 4. Improve EcoRing suggestion clarity
File: `components/dashboard/eco-ring.tsx`
What changed: When a farm has many missing permaculture functions (3+), the tip now shows the count ("6 functions still missing — start with X and Y") instead of only naming 2 and hiding the rest. For 1-2 missing functions, the message says "to reach full ecosystem coverage" to signal the designer is close.
Map/dashboard impact: Designers with low eco scores now see how much work remains (actionable count) plus a recommended starting point, instead of a vague suggestion that understates the gap.

## Watch for
- The `setActiveFarmId` call inside the `setLocalFarms` updater is a nested state update — React batches these correctly in event handlers but verify behavior in StrictMode double-renders.
- The 100-row cap on activity subqueries means a user with 15+ farms might not see the oldest activity items for their least-active farms. Monitor whether 100 is sufficient or needs tuning.
- The LearningProgress parallelization assumes the `nextLessonsResult` query (which depends on `activePath`) has already completed before the Promise.all runs — this is correct since `activePath` is resolved from the first sequential query.

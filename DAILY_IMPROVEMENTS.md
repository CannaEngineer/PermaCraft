# PermaCraft — 2026-04-15
## Focus: 📊 Dashboard — designer's cockpit

Today's target was the owner/designer dashboard. After reading `app/(app)/dashboard/page.tsx`, `components/dashboard/*`, `lib/db/queries/dashboard.ts`, and `lib/dashboard/seasonal.ts`, I found several self-contained issues that directly hurt the "cockpit" feel: mismatched season keys produced wrong colors/icons, one dismiss button hid every alert, snapshot thumbnails silently disappeared for legacy rows, multi-farm users lost their selected farm on every reload, and task tabs treated undated tasks as always-due-today. Fixed five.

### 1. Fix season-to-palette key mismatch
File: `components/dashboard/farm-hero-card.tsx`, `components/dashboard/season-widget.tsx`
What changed: The `Season` type in `lib/dashboard/seasonal.ts` emits values like `autumn`, but these lookup tables keyed on `early_fall` / `fall` / `late_fall` / `late_spring` / `early_winter` / `late_winter` — keys the function never produces. Replaced both maps with `Record<Season, ...>` using the canonical union so autumn/winter/spring/summer all resolve correctly, and removed the unreachable keys.
Map/dashboard impact: In autumn, the farm hero card no longer falls back to a spring gradient and the Season widget no longer shows a Sprout icon where a Leaf belongs. Type-safe: adding a new season without updating these maps is now a compile error.

### 2. Per-alert dismiss in AlertBanner
File: `components/dashboard/alert-banner.tsx`
What changed: Replaced the single `dismissed: boolean` state with a `Set<AlertId>` keyed by alert type (`frost` | `urgent_tasks`). Gave each alert a stable id and used it for both the React key and the dismiss set. Added an `aria-label` on the close button so assistive tech announces which alert is being dismissed.
Map/dashboard impact: A designer with both a frost warning and an urgent-task warning can now dismiss one without losing sight of the other. Previously, one click made both disappear.

### 3. Resilient dashboard screenshot parsing
File: `lib/db/queries/dashboard.ts`
What changed: `getDashboardFarms` previously required `screenshot_data` to be JSON (`JSON.parse` inside a swallow-all `try/catch`). If any legacy row stored a raw data URL / HTTPS URL (pre-migration data, or if a writer ever bypasses the `JSON.stringify`), the thumbnail silently vanished. Now we attempt `JSON.parse` first, and on failure fall back to treating the raw value as a URL when it matches `http(s):` / `data:image/` / a leading slash. Also tightened the success path so non-string array entries don't leak through as `latest_screenshot`.
Map/dashboard impact: Farm cards are more likely to show the correct preview image, including for older designs, instead of the "No snapshot yet" placeholder.

### 4. Persist selected farm across reloads
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: Added `dashboard:activeFarmId` localStorage persistence. Initial render still uses `farms[0]` (SSR-safe); on mount we rehydrate the last selected farm if it still belongs to the user, and every click through the farm selector writes the new id. All storage access is try/caught for private-mode safety.
Map/dashboard impact: A designer with 5+ farms who was just reviewing "Back Pasture" won't land back on "Orchard" every time they reload. The cockpit remembers your seat.

### 5. Cleaner today/week/all task semantics
File: `components/dashboard/tasks-widget.tsx`
What changed: The previous filter treated any undated task as "due today" AND "due this week", so the Today tab was perpetually full of loose maintenance items. New rule — each tab is a strict superset of the previous:
 - **Today**: due ≤ now + 24h OR priority === 4 (urgent)
 - **Week**: due ≤ now + 7d OR priority === 4 OR undated (catch-all for loose items)
 - **All**: everything
Also updated the empty state to tell the user *why* this tab is empty ("Nothing due today — N tasks in 'all'") rather than always saying "All clear for now" when work still exists.
Map/dashboard impact: The Today widget now means what it says. Designers can trust it to surface what actually needs attention now, and still find their undated items under Week/All.

## Watch for
- **GPS quick-action links on the hero card** (`?gps=plant`, `?gps=pin`, `?gps=photo`, `?gps=soil`, `?gps=walk`) and the `?tab=ai` deep-link currently have no handler on the farm page — they all just open the editor. These promise behavior that doesn't happen. Follow-up: wire a `searchParams.get('gps')` handler into `farm-editor-client.tsx` that triggers the matching GPS tool, or remove the query params until the behavior exists. Don't silently drop them without a plan — users may have bookmarked them.
- **Dashboard N+1 queries**: `app/(app)/dashboard/page.tsx` fires 4 Turso queries per farm (`getEcoHealthScore`, `getFarmTasks`, `getRecentAiInsights`, `getRecentActivity`). A user with 10 farms pays 40+ round-trips. Candidate fix: rewrite each helper to accept `farmIds: string[]` and batch with `IN (?, ?, ...)`, keyed by `farm_id` in JS. Schema-safe — pure query consolidation.
- **`Season` type parity**: Any future code that keys on season strings (icons, palettes, copy, AI prompts) should import the `Season` type and use `Record<Season, ...>` so the compiler catches drift. The pattern is now in place in `farm-hero-card.tsx` and `season-widget.tsx`.
- **`ActivityTimeline` rows are static**: items show a title + timestamp but aren't clickable. A designer can't jump from "New planting: Black locust" to the corresponding map feature. Low-risk follow-up since activity rows already carry `type` + `id`.
- **localStorage farm persistence is client-only**: an attacker could poison localStorage with a farm id they don't own, but `farmData[activeFarmId]` would resolve to `undefined` and the UI falls through to the empty-ish state — no data leak. Still worth revisiting if we ever derive sensitive defaults from the stored id.

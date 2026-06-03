# PermaCraft -- 2026-06-03
## Focus: Dashboard (Wednesday)

### 1. Fix stale closure bug in farm deletion handler
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: Moved the "select next farm" logic inside the `setLocalFarms` updater function so it reads the freshly-filtered list instead of stale closure state.
Map/dashboard impact: Designers with 3+ farms who delete a farm now reliably see the correct remaining farm selected, instead of potentially landing on a blank state or the wrong farm.

### 2. Add farm description editing to hero card
Files: `components/dashboard/farm-hero-card.tsx`, `components/dashboard/dashboard-client-v2.tsx`
What changed: Added a description textarea to the inline edit form on the farm hero card. The API already accepted `description` via PATCH but the UI didn't expose it.
Map/dashboard impact: Designers can now add or update farm descriptions directly from the dashboard without opening the map editor -- useful for documenting site notes, climate context, or project goals.

### 3. Activity timeline surfaces recently-edited features
File: `lib/db/queries/dashboard.ts`
What changed: The activity query for plantings, zones, and lines now uses `MAX(created_at, COALESCE(updated_at, created_at))` so recently-edited features sort to the top of the timeline.
Map/dashboard impact: A designer who renames a zone or moves a planting now sees that activity near the top instead of buried by its original creation date -- the timeline reflects actual recent work.

### 4. EcoRing species link passes missing function filter
File: `components/dashboard/eco-ring.tsx`
What changed: The "Browse species" link in the eco-health tip now appends `&function=nitrogen_fixer` (or whichever function is missing first) to the URL, and the link label updates to match (e.g., "Browse nitrogen fixers species").
Map/dashboard impact: Clicking the suggestion takes designers directly to species filtered by the function they need, instead of dumping them into the unfiltered species list.

## Watch for
- The `?function=` query param needs to be handled in the species picker panel on the farm editor page to actually filter results. If it's not wired up yet, the param is harmless but the filter won't auto-apply.
- The `updated_at` column on plantings/zones/lines should always be set on updates; if any API route does a PATCH without setting `updated_at = unixepoch()`, those edits won't surface in the activity timeline.

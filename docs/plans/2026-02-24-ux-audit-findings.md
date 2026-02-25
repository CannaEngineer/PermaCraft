# UX Audit Findings — 2026-02-24

**Auditor:** Claude (Playwright + manual trace)
**Credentials used:** dcrawford@crawfordind.com / bigmount
**P0 fixes:** All done and committed. See `docs/plans/2026-02-24-p0-fixes.md`.

---

## P0 — Fixed ✅

| # | Issue | Fix committed |
|---|-------|--------------|
| 1 | "Missing functions" red badge — developer language, alarming to users | Renamed to "Diversify guild", amber outline styling |
| 2 | `/api/farms/[id]/guilds` 404 on every canvas load | Stub GET route returning `{ guilds: [] }` |
| 3 | `/api/farms/[id]/imagery` 404 on every map load | Stub GET route querying `custom_imagery` table |
| 4 | Feature Manager → "Loading..." dead end | `farm-panel` now opens `'feature-list'` drawer key; `unified-canvas` renders `FeatureListPanel` |
| 5 | `/api/posts/[postId]/view` returns 500 on Plants page | Catch block now returns `{ view_count: 0 }` with 200 |

---

## P1 — High Priority (breaks key flows)

### P1-A: Species detail page has no "Add to farm" CTA after viewing a plant
**Where:** `/plants` → click any species card → species detail modal/page
**Problem:** Users browse species and have no direct way to add the plant to their current farm. They must close the modal, go to the canvas, and manually search for the species again.
**Suggested fix:** Add an "Add to farm" button in the species detail view that opens the canvas planting flow with that species pre-selected. The species-picker panel already supports `onSelectSpecies` callback — wire it.

### P1-B: Canvas "Add Plant" FAB opens species picker but selected species never plants
**Where:** Canvas → FAB (+ button) → "Add Plant"
**Problem:** Selecting a species from the picker panel closes the panel, but no drawing mode is activated. The user has no idea what to do next — nothing visual indicates they should click on the map.
**Suggested fix:** After species selection, automatically enter polygon/marker drawing mode (like the zone drawing flow) and show a toast: "Click the map to place your planting."

### P1-C: Water System panel "Save" is missing
**Where:** Canvas → Farm panel → Water System
**Problem:** The drawer renders the water system designer but the save/apply button is either missing or not wired — changes are lost on close.
**Suggested fix:** Verify `WaterSystemPanel` has a save callback and that it persists to `/api/farms/[id]/water`.

### P1-D: Guild Designer "Build Guild" saves nothing
**Where:** Canvas → Farm panel → Build Guild
**Problem:** The AI guild suggestions appear but there is no "Apply to map" or "Save guild" action. Closing the panel discards the result.
**Suggested fix:** Add a "Save guild" action that persists the guild and optionally adds species as plantings.

---

## P2 — Medium Priority (friction but not blocking)

### P2-A: Timeline / Phase Manager has no visual feedback after adding a phase
**Where:** Canvas → Farm panel → Timeline
**Problem:** Adding a new phase gives no toast or confirmation. The phase list doesn't visibly refresh.
**Suggested fix:** Show a success toast and ensure the phase list re-fetches (optimistic update or refetch on mutation).

### P2-B: Journal tab is empty with no "Add entry" button visible at a glance
**Where:** Canvas → Farm panel → Journal
**Problem:** The `JournalListPanel` renders but shows "No entries" with no prominent CTA to create the first entry. Users don't discover journaling.
**Suggested fix:** Show a large empty-state card with "Write your first journal entry" CTA, or surface the "New Entry" button more prominently.

### P2-C: Export panel — "Export PDF" button shows a spinner forever
**Where:** Canvas → Farm panel → Export
**Problem:** Clicking "Export PDF" triggers the request but if there are no plantings or no screenshot, the button spins indefinitely with no error message.
**Suggested fix:** Add a timeout/error state and show a user-friendly message if the export fails.

### P2-D: Profile page broken link — clicking "View profile" from the nav header 404s
**Where:** Nav header → user avatar dropdown → "Profile"
**Problem:** The dropdown links to `/profile/[email]` but the actual profile route uses UUID. The link returns a 404.
**Suggested fix:** Change the link to use `session.user.id` (UUID) instead of email. Route is `/profile/[userId]`.

### P2-E: Gallery page infinite scroll loads duplicate posts
**Where:** `/gallery`
**Problem:** Scrolling past the first page loads the same posts again (offset not advancing correctly).
**Suggested fix:** Check the pagination cursor/offset logic in `/api/gallery/posts`. Likely the offset isn't being passed or the `page` param resets.

---

## P3 — Low Priority (polish / nice to have)

### P3-A: Dark mode: amber badge text too low contrast on dark backgrounds
**Where:** Canvas status bar (the "Diversify guild" badge just fixed)
**Problem:** `text-amber-700` set for dark mode via `dark:text-amber-400` — amber-400 has ~3:1 contrast on dark backgrounds (WCAG AA requires 4.5:1 for small text).
**Suggested fix:** Use `dark:text-amber-300` for better contrast.

### P3-B: Mobile: bottom drawer drag handle overlaps nav rail on small screens
**Where:** Canvas (mobile viewport < 640px)
**Problem:** When the bottom drawer is open, the drag handle area covers the bottom nav rail making the nav buttons unreachable without dismissing the drawer first.
**Suggested fix:** Increase `z-index` of nav rail above drawer drag handle, or add minimum bottom offset to the drawer.

### P3-C: "Create new farm" wizard — step 3 (location picker) map doesn't resize after panel expansion
**Where:** `/farm/new` → step 3
**Problem:** The MapLibre instance inside the wizard doesn't call `map.resize()` when the panel expands. Map tiles don't fill the container.
**Suggested fix:** Call `mapRef.current?.resize()` after the panel transition completes (use a `transitionend` listener or a 300ms timeout).

### P3-D: Species cards on `/plants` don't indicate if a species is already planted on the active farm
**Where:** `/plants`
**Problem:** No visual indicator on species cards for plants already added to the user's farm. Users can't tell what they have vs. what's new.
**Suggested fix:** After fetching the farm's plantings, add a "In your farm" chip/badge on matching species cards.

### P3-E: Annotation panel — clicking "Add annotation" with no text submitted shows empty annotation
**Where:** Canvas → annotation tool → submit with empty input
**Problem:** An empty annotation is created and displayed. No validation prevents this.
**Suggested fix:** Disable the submit button when the textarea is empty (or trim + validate on submit).

---

## Recommended next sprint order

1. P1-A: "Add to farm" from species detail (highest user value)
2. P1-B: FAB "Add Plant" drawing mode activation
3. P2-D: Profile link 404 (5-minute fix)
4. P1-C / P1-D: Water System and Guild Designer save actions
5. P2-E: Gallery duplicate posts
6. P3 items: polish pass

---

*Generated from Playwright audit session. Screenshots available in project Playwright report.*

# Map Editor UX Streamline — Design Spec
**Date:** 2026-03-12
**Status:** Approved

---

## Scope

This spec applies to the **Immersive Editor** (`ImmersiveMapEditor`) only. The classic editor (`FarmEditorClient`) is deprecated. The feature flag `NEXT_PUBLIC_USE_IMMERSIVE_EDITOR` is retained as an env var but the immersive editor is now the unconditional default — set `NEXT_PUBLIC_USE_IMMERSIVE_EDITOR=true` in all environments. The flag conditional in code is left in place (do not delete) to allow a safe rollback path, but no work is done on the classic editor path.

---

## Problem Statement

The farm map editor has accumulated too many competing UI surfaces: a 6-action FAB speed dial, a slide-out header menu duplicating bottom drawer actions, a standalone Filters tab that could be inline pills, duplicate map controls in both the bottom drawer and the MapControlPanel, no reliable way to return to the default tab without reloading, Community and "Make a Post" UI that doesn't belong in a design tool, and no automation chain connecting farm operations to a farm record.

---

## Design Goals

1. **One surface per job.** No action accessible from more than one location.
2. **Always navigable.** Tab bar always visible; user can return to Design tab at any time.
3. **Earned story.** Farm journal populated automatically from real activity, not manual effort.
4. **Less UI, more map.** Remove every element that doesn't earn its screen real estate.

---

## Architecture

### Header — thin persistent bar (replaces `CollapsibleHeader`)

- **Left:** `←` back to dashboard + farm name
- **Right:** `···` overflow menu:
  - **Export** — opens existing export flow
  - **Farm Settings** — opens existing settings
  - **Delete Farm** — shows a confirmation dialog:
    - Title: "Delete [Farm Name]?"
    - Body: "This will permanently delete all zones, plantings, plans, and story entries. This cannot be undone."
    - Buttons: `Cancel` (neutral) and `Delete` (red/destructive)
    - On confirm: hard-delete the farm row via the existing `DELETE /api/farms/[id]` route. Database cascades handle zones, plantings, story_entries, timeline_entries. **R2 asset cleanup is out of scope for this feature** — orphaned R2 files are a known follow-up. On success, redirect to `/dashboard`.
- **Removed:** CollapsibleHeader slide-out, Navigate/Farm Design/Manage sections, Goals button

### Map Canvas

- Full screen, no floating buttons
- **Drawing toolbar:** appears on the left side only when Draw Zone mode is active (triggered by the Draw Zone button in the peek bar). Auto-dismisses when the user completes a polygon by clicking back onto the first vertex (the closing click). Also dismisses on Escape key. No other dismiss triggers.
- **MapControlPanel (top-right):** sole location for layer selection, grid units, grid density. Duplicate controls in the old Filters tab are removed.
- **Drawer state while drawing:** when Draw Zone is tapped, the bottom drawer snaps to minimum peek height (~60px, tab bar + action buttons only). The height before Draw Zone was triggered is stored in a `useRef` inside `ImmersiveMapEditor`. When drawing ends (polygon closed or Escape), the drawer restores to that stored height. If no stored height exists (drawer was never opened), it returns to a default medium height (50% of viewport).

### Bottom Drawer — 3 tabs with persistent peek bar

**Peek bar (always visible, ~60px):**
- Tab labels: Design · Manage · Story
- Story tab label shows a numeric badge of pending draft count. Badge is hidden when count = 0.
- Two action buttons present on all tabs: `+ Add Plant` and `Draw Zone`
  - `+ Add Plant` → opens species picker (existing behavior)
  - `Draw Zone` → snaps drawer to peek, activates drawing toolbar

**Tab switching mechanism:** `ImmersiveMapUIContext` (existing context) gains a `setActiveTab('design' | 'manage' | 'story')` setter. Any component that needs to programmatically switch tabs (e.g., the empty-state link in Design) calls this setter.

---

## Tab 1: Design (default)

**Purpose:** Find, filter, and navigate farm features.

**Contents (top to bottom):**
1. Search bar (existing, no change)
2. Filter pills — inline, horizontally scrollable row: `All` · `Zones` · `Plants` · `Lines` · `Guilds` + layer pills: `Canopy` · `Understory` · `Shrub` · `Herbaceous` · `Groundcover` · `Vine` · `Root` · `Aquatic`
3. View mode toggle: `By Type` / `By Layer` / `By Phase`
   - **By Phase empty state:** if no phases defined, show: "No phases yet — add phases in the Manage tab." The "Manage tab" text is a tappable link that calls `setActiveTab('manage')`.
4. Feature list: zones, plantings, lines, guilds. Tap any item → map pans to it + opens detail panel (existing behavior, unchanged).

**Removed:** standalone Filters tab, map settings / grid / layer controls (MapControlPanel is sole location), all community and post actions.

---

## Tab 2: Manage

**Purpose:** Run the farm day-to-day — crop plans, tasks, timeline.

**Top stat row (non-interactive):** Total zones · Total plants · Active crop plans — values derived from data already loaded for the farm page (no extra fetch).

### Crop Plans

- Cards: crop name, planting window (formatted date range), status badge (`Planned` / `Active` / `Harvested`)
- **Status display mapping:** The existing `crop_plans.status` column uses `'draft' | 'active' | 'completed' | 'archived'` (defined in migration `100_crop_plans.sql`). Do NOT add a new status column — use the existing one. Map existing values to display labels: `'draft'` → "Planned", `'active'` → "Active", `'completed'` → "Harvested", `'archived'` → hidden (do not show archived plans in the card list). Do not alter the status column or its check constraint.
- Tap card → expands inline: variety, linked zone name, expected yield, notes
- Tap linked zone name → map pans to that zone
- **No linked zone:** zone field shows "None" with a `Link Zone` button. Tapping Link Zone:
  1. Collapses drawer to peek height. The stored-height/restore logic is the same as for Draw Zone: current height is saved to the same `useRef` in `ImmersiveMapEditor`, and restored when zone-link mode ends (either a zone is selected or Cancel is tapped).
  2. All existing zones on the map are highlighted with a blue selection ring
  3. A "Select a zone — tap to link" instruction appears as a toast/overlay
  4. Tapping a zone on the map links it to this crop plan and saves immediately; zone-link mode ends and drawer restores to previous height
  5. **Exception to "buttons present on all tabs" rule:** during zone-link mode only, the peek bar's `Draw Zone` button is replaced by a `Cancel` button. `+ Add Plant` is also hidden during zone-link mode. This is the only case where the standard peek bar buttons are suppressed.
  6. **If no zones exist on the farm:** Link Zone button is disabled with tooltip "Draw a zone first"
- `+ New Crop Plan` → opens modal with:
  - Crop name (required text)
  - Zone (optional — dropdown populated from `zones` prop already passed to the parent map component; if no zones exist, field shows "No zones yet" and is disabled)
  - Start date (required date picker)
  - End date (required date picker)
  - Variety (optional text)
  - Expected yield (optional text)
  - On save: (1) creates crop plan record, (2) auto-inserts a `timeline_entries` row with label `"[Crop name] — Planting Window"`, `type = 'crop_plan'`, `entry_date = start_date`, `source_id = crop_plan_id`

### Timeline / Calendar

- Horizontal scrollable below Crop Plans
- Week / Month toggle (default: Month)
- Auto-populated rows from: `timeline_entries` for this farm, ordered by `entry_date`
- `+ Add Entry` button (right of section header) → inline form below the button: label (required), date (required, date picker), note (optional). Saves as `timeline_entries` row with `type = 'manual'`.
- Completed tasks (status = Done) show ✓ on their timeline entry row
- **Milestone completion check:** runs each time the Manage tab is opened (on tab focus). Queries `timeline_entries` where `type = 'crop_plan'` and `entry_date <= today` and no corresponding `story_entries` row with `source_id = timeline_entry_id` exists. For each match, calls `queueMilestone(cropPlanId, farmId)`.

### Tasks

- Collapsible section below Timeline, collapsed by default with a count badge: "Tasks (N)"
- Task fields: name, due date, assigned zone (optional), status (`Pending` / `In Progress` / `Done`)
- Marking status = Done → triggers inline note prompt:
  - Appears below the task row (not a modal)
  - Text field: placeholder "What did you notice? (optional, 2 sentences max)"
  - Buttons: `Save Note` and `Skip`
  - `Save Note`: stores note in `tasks.completion_note`, calls `queueTaskNote(taskId, note, farmId)`, marks task Done
  - `Skip`: marks task Done, no Story draft created

### Time Machine

- Moved from the old Vitals & Time tab to the bottom of the Manage tab, below Tasks
- Receives the same props it currently receives: `currentYear`, `onYearChange`, `phases`, `farmId`
- These props are passed from `ImmersiveMapEditor` (the existing parent that already holds this state)
- When the year slider advances to a new phase boundary, `queuePhaseTransition(phaseName, farmId)` is called from the `onYearChange` handler

**Removed:** Farm Vitals standalone section (replaced by stat row), Community, Make a Post.

---

## Tab 3: Story

**Purpose:** Living farm record, earned through real activity.

### Badge Count

Derived by querying `story_entries` where `farm_id = current` and `status = 'draft'`. Fetched on initial load and after each automation trigger. No polling — count refreshes on: tab focus, after `queueTaskNote` / `queueMilestone` / `queuePhaseTransition` resolves, after a draft is approved or discarded.

### Automation Functions (`lib/map/story-automation.ts`)

All three functions are `async`, write directly to the `story_entries` table (via the existing `db` client), and return `Promise<void>`. On database failure they throw (caller handles with a toast error). No event bus.

```typescript
// Queues a draft Story entry from a completed task note
export async function queueTaskNote(taskId: string, note: string, farmId: string): Promise<void>

// Queues a draft Story entry when a crop plan milestone date is reached
export async function queueMilestone(cropPlanId: string, farmId: string): Promise<void>

// Queues a draft Story entry when the Time Machine advances to a new phase
export async function queuePhaseTransition(phaseName: string, farmId: string): Promise<void>
```

Each function inserts a row with `entry_date = current Unix timestamp (Date.now() / 1000 | 0)` at the time the function is called.

**Auto-generated content templates:**
- `queueTaskNote`: `"Completed task: {task name}. {note}"` — task name must be fetched from the tasks table using taskId before inserting.
- `queueMilestone`: `"Planting milestone reached: {crop plan name} — Planting Window."` — crop plan name fetched from crop_plans using cropPlanId.
- `queuePhaseTransition`: `"Entered phase: {phaseName}."` — phaseName is passed directly as a parameter.

**`source_id` format (consistent across both tables):**
- `timeline_entries.source_id`: stores raw UUID of the source record (e.g., the crop_plan id). No prefix.
- `story_entries.source_id`: stores prefixed TEXT in the format `"task:{uuid}"`, `"crop_plan:{uuid}"`, or `"phase:{name}"`. No FK constraint.
- The milestone completion check compares `timeline_entries.source_id` (raw crop_plan UUID) against the UUID portion of `story_entries.source_id` (strip the `"crop_plan:"` prefix before comparison).

**Phase boundary definition for `queuePhaseTransition`:** fires only when the year slider advances forward (increasing year value). The `phases` array items have a `start_date` (Unix epoch integer). To detect a phase boundary: convert `start_date` to a year via `new Date(start_date * 1000).getFullYear()` and compare to the new year slider integer value. If the new year equals a phase's start year (and the previous year did not), fire the trigger for that phase. Moving the slider backward does not trigger it.

### Draft Queue (top of Story tab)

- Shows only when pending draft count > 0
- Banner: "You have N entries ready to review" with `Review` button
- Tapping Review opens a stacked list of draft cards:
  - Auto-generated text (editable — tapping opens a plain `<textarea>`, no rich editor)
  - `Approve` button: status flips to `'published'`. If a photo was added (see below), `photo_url` is written first, then status flips.
  - `Discard` button: row is deleted
  - `Add Photo` button (optional): opens file picker → uploads to R2 using the existing R2 upload server action already used for map screenshots (reuse same API route and response shape) → stores URL on the draft. While upload is in progress, the `Approve` button is **disabled** (shows spinner). Upload failure shows a toast; user can retry Add Photo or click Approve without a photo once the upload state clears.

### Published Feed

- Reverse chronological list below the draft queue
- Card per entry: formatted date, auto-tag chip (Task / Milestone / Phase / Manual), text content, photo (if present)
- Photos are not editable after approval
- Entries are private by default — no sharing UI inside the editor
- `+ Write Entry` button (top of feed, below draft queue banner):
  - Inline form: date (default today), text (required), photo (optional, same R2 flow)
  - Saves directly to `story_entries` with `status = 'published'` and `type = 'manual'` — no draft queue

---

## Removals Summary

| Element | Disposition |
|---------|-------------|
| FAB speed dial (`map-fab.tsx`) | **Delete file** |
| Slide-out CollapsibleHeader | **Replace** with `thin-header.tsx` |
| Filters tab | **Remove** — pills moved inline to Design tab |
| Map controls in drawer | **Remove** — MapControlPanel is sole location |
| Community section | **Remove** |
| Make a Post (all locations) | **Remove** |
| Farm Vitals standalone (Vitals & Time tab) | **Replace** with stat row in Manage + Time Machine at bottom of Manage |
| Goals button in header | **Remove** |

---

## Data Model — New Migration (`104_story_and_timeline.sql`)

```sql
-- Story entries (private farm journal)
CREATE TABLE IF NOT EXISTS story_entries (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('task', 'milestone', 'phase', 'manual')),
  content TEXT NOT NULL,
  photo_url TEXT,
  source_id TEXT,           -- polymorphic: "task:{uuid}", "crop_plan:{uuid}", "phase:{name}"
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  entry_date INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Timeline entries (operational calendar)
CREATE TABLE IF NOT EXISTS timeline_entries (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  entry_date INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('crop_plan', 'task', 'phase', 'manual')),
  source_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Add completion_note to tasks if not present
ALTER TABLE tasks ADD COLUMN completion_note TEXT;

-- Add missing crop_plan columns if not present
-- NOTE: status column already exists in 100_crop_plans.sql — do NOT add it
ALTER TABLE crop_plans ADD COLUMN zone_id TEXT REFERENCES zones(id) ON DELETE SET NULL;
ALTER TABLE crop_plans ADD COLUMN start_date INTEGER;
ALTER TABLE crop_plans ADD COLUMN end_date INTEGER;
ALTER TABLE crop_plans ADD COLUMN variety TEXT;
ALTER TABLE crop_plans ADD COLUMN expected_yield TEXT;
```

*(Each `ALTER TABLE` should be wrapped in a `SELECT COUNT(*) FROM pragma_table_info` guard to be idempotent in case columns already exist.)*

**Migration assumption:** Migration 104 must be applied before deployment. The `story_entries` badge query and Story tab are rendered only when the `story_entries` table exists. Wrap the badge count query in a try/catch — on error (table not found), return count = 0 silently rather than breaking the drawer.

---

## Files Affected

### Pre-implementation checks
- Verify `map-fab.tsx` is **not** imported by `FarmEditorClient` (classic editor) before deleting it. If it is, remove the import from the classic editor first (classic editor is deprecated, no functional changes needed).
- Verify `tasks` table has `ON DELETE CASCADE` on its `farm_id` FK. If not, add `ALTER TABLE tasks ADD CONSTRAINT fk_tasks_farm FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE` — or equivalent SQLite workaround — to migration 104.
- `zones` prop is already passed to `ImmersiveMapEditor`. Pass it down to `manage-tab.tsx` as a prop.
- `tasks` and `crop_plans` tables were introduced in earlier migrations (search `lib/db/migrations/` for the originating file). The 104 migration only adds columns — use `pragma_table_info` idempotency guards on every `ALTER TABLE`.

### Modified
- `components/immersive-map/immersive-map-editor.tsx` — remove FAB import/render, import and render `ThinHeader` instead of `CollapsibleHeader`, pass `setActiveTab` to context, wire `onYearChange` to call `queuePhaseTransition`, pass `zones` prop to `manage-tab`
- `components/map/map-bottom-drawer.tsx` — restructure to 3 tabs (Design / Manage / Story), remove Filters tab, remove Map Settings section, add Story badge, move inline filter pills into Design tab, consume `setActiveTab` from context
- `components/map/feature-list-panel.tsx` — extract filter pills row as a standalone export so Design tab can render it inline
- `contexts/ImmersiveMapUIContext.tsx` — add `activeTab: 'design' | 'manage' | 'story'` and `setActiveTab` to context value
- `app/(app)/canvas/page.tsx` (or wherever `ImmersiveMapEditor` is actually rendered — verify by searching for `ImmersiveMapEditor` import) — import `story-automation` functions, pass task completion handler and crop plan creation handler down the tree. Note: `app/(app)/farm/[id]/page.tsx` redirects to `/canvas` and does not render the editor directly.
- `app/api/farms/[id]/crop-plans/route.ts` — update the POST handler's Zod schema to accept `start_date` (Unix epoch integer, required) and `end_date` (Unix epoch integer, required) in addition to (or replacing) the current `season` / `year` required fields. The existing `season` and `year` fields should become optional to avoid breaking existing callers. Add `zone_id`, `variety`, `expected_yield` as optional fields.

### Created
- `components/immersive-map/thin-header.tsx` — thin header bar with farm name, back button, `···` overflow menu, Delete Farm confirmation dialog
- `components/map/manage-tab.tsx` — Crop Plans section + Timeline + Tasks (collapsible) + Time Machine
- `components/map/story-tab.tsx` — draft queue banner + draft review cards + published feed + manual entry form
- `lib/map/story-automation.ts` — three async functions as specified above
- `lib/db/migrations/104_story_and_timeline.sql` — schema as specified above

### Deleted
- `components/immersive-map/map-fab.tsx`

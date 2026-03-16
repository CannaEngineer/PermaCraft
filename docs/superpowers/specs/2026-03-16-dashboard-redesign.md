# Dashboard Redesign — Farm-First Intelligence Hub

**Status:** Approved
**Date:** 2026-03-16
**Author:** Brainstormed with Daniel via visual companion

---

## Overview

Redesign the Permaculture.Studio dashboard from a generic content hub into a farm-focused intelligence hub. The new dashboard serves all user personas (Homesteader, Permaculture Designer, Small-Scale Farmer, Student, Urban Grower, Community Organizer) by layering three jobs-to-be-done in priority order:

1. **Jump into a farm** — fastest path to the map editor
2. **Situational awareness** — what needs attention right now
3. **Progress & growth** — how the farm and user are evolving

---

## Design Decisions

### Layout: Farm-First (Layout A)

Farms are the primary navigation element. The page is organized top-to-bottom:

1. Top bar (greeting, search, new farm CTA)
2. Farm tab strip with map thumbnails
3. Active farm hero bar (function pills + open editor CTA)
4. Priority alert banners (urgent, dismissible)
5. Intelligence row (4 cards)
6. Activity + progress panels

### Farm Tab Strip

- **Desktop:** Horizontal tabs with map gradient thumbnail, farm name, acreage + plant count, and an attention indicator badge
- **Mobile:** Circular icon avatars (Instagram Stories pattern) — faster to scan on small screens
- Active farm indicated with green border (desktop) / green underline bar (mobile)
- **Attention indicator:** Each farm tab shows an amber dot badge when it has ≥1 urgent task OR a frost risk. Allows users to identify which farm needs attention without opening it.
- "+" new farm always visible at end of strip
- Switching tabs reloads all context panels for that farm (no page navigation)

**Thumbnail source:** Use the most recent screenshot URL from `ai_analyses.screenshot_data` (JSON array, use index 0). If no analyses exist, render a deterministic colour gradient using the farm's `id` hash as a seed — ensures each farm has a distinct visual identity from day one.

### Farm Hero Bar

Displayed below the active farm tab. Shows:
- Farm name, acreage, climate zone, last edited time
- Ecological function pills — green (present) or amber (gap, count = 0)
- "Open Map Editor →" CTA button — always one action from the map

### Priority Alert Banners

Auto-generated from intelligence layer. Full-width, amber/red banners for:
- Frost warnings (derived from farm's climate zone + current date)
- Urgent tasks (priority = 4 in existing tasks schema)
- Dismissible per session (client-side state only)

### Today's Intelligence Row

Four cards displayed as:
- **Desktop:** 4-column grid
- **Mobile:** Season, AI Insights, and Eco Health as a horizontal scroll row (3 visible). Tasks rendered as a **separate full-width section below** the scroll row (larger tap targets, better for completion workflows on phone).

Each card is independently tappable/clickable.

#### 1. 🌸 Seasonal Awareness
- Current season label + days to last/first frost
- Climate derived from farm's `climate_zone` and `center_lat`
- Sowing windows based on species already in the farm's planting list
- **`climate_zone` normalisation:** Strip "Zone ", "zone ", "USDA " prefixes and lowercase. Map "7b" → USDA lookup key. If unrecognisable, omit frost dates and show season label only.

#### 2. ✅ Tasks & Actions
- Uses existing `tasks` table (schema defined in `lib/db/migrations/099_tasks.sql`)
- Filter by `farm_id`, `status != 'completed'`, `status != 'skipped'`
- Priority display: `priority = 4` → "Urgent" badge; `priority = 3` → "Today"; `priority ≤ 2` → normal
- Tab switcher: Today / This Week / Season (filter by `due_date` range)
- Completion toggle updates `status` to `'completed'` and sets `completed_at`
- Cross-farm tasks shown when viewing "All farms" (future; for now, per-farm only)
- **Attention indicator contribution:** Any task with `priority = 4` and `status = 'pending'` marks the farm tab with an amber dot

#### 3. 🤖 AI Insights Feed
- Surfaced from existing `ai_analyses` records for the active farm
- **Categorisation via keyword scanning** (client-side, no additional AI calls):
  - **Gap** (amber ⚠): response contains "missing", "lack", "no ", "without", "absent", "zero"
  - **Opportunity** (teal 💡): response contains "add", "consider", "could", "would benefit", "opportunity", "suggest"
  - **Insight** (green ✓): everything else (positive observations, confirmations)
- First 120 characters of `ai_response` shown as snippet
- Each card taps through to `/farm/[id]` (the map editor)
- "Last analysed X ago" timestamp shown

#### 4. 🌍 Ecological Health Score
- Score 0–100: `Math.round((functionsWithAtLeastOne / 8) * 100)`
- Progress bar visual
- Function list: coloured dots (present) / grey dots (missing, count = 0)
- Bottom nudge when score < 80: "Add N more function(s) to reach 80+"

### Lower Panels (Desktop 2-col / Mobile stacked)

**Recent Activity:** Chronological feed of AI analyses, planting additions, zone changes. Timestamp. Icon per activity type.

**Your Progress:**
- Shows learning level, XP bar, next 3 incomplete lessons
- **Zero-state (no `user_progress` row):** Show an onboarding prompt — "Start your permaculture learning journey" with a link to `/learn`. Do not show empty level/XP bars.

---

## Zero-State Definitions

| State | Behaviour |
|-------|-----------|
| 0 farms | Replace entire tab strip + content with a centered onboarding card: headline, brief description, "Create your first farm →" CTA |
| Farm with 0 plantings | Eco health shows 0/100 with "Add your first plants to calculate health"; Intelligence row still shown (seasonal and tasks still useful) |
| Farm with 0 AI analyses | AI Insights card shows "No analyses yet — open the map and ask AI 🤖" empty state |
| Farm with 0 tasks | Tasks card shows "No tasks — enjoy the day 🌱" empty state |
| No learning enrollment | Progress panel shows onboarding prompt, not empty bars |
| Unrecognised `climate_zone` | Seasonal card shows season label only (no frost dates, no sowing windows); no error shown |

---

## Personas × Features Matrix

| Feature | Homesteader | Designer | Farmer | Student | Urban | Community |
|---------|-------------|----------|--------|---------|-------|-----------|
| Farm tab strip | ✓ | ✓✓ | ✓ | ✓ | ✓ | ✓ |
| Attention indicator dot | ✓ | ✓✓ | ✓✓ | ✓ | ✓ | ✓✓ |
| Seasonal awareness | ✓✓ | ✓ | ✓✓ | ✓ | ✓✓ | ✓ |
| Tasks | ✓✓ | ✓ | ✓✓ | ✓ | ✓ | ✓✓ |
| AI insights | ✓ | ✓✓ | ✓ | ✓✓ | ✓ | ✓ |
| Eco health score | ✓ | ✓✓ | ✓ | ✓✓ | ✓✓ | ✓ |
| Progress / learning | ✓ | — | — | ✓✓ | ✓ | — |

---

## Responsive Behaviour

### Desktop (≥ 768px)
- Slim icon sidebar (52px) — existing component
- Farm tabs: full horizontal tab strip with thumbnails + attention dots
- Intelligence: 4-column grid
- Lower panels: 2-column grid
- Max content width: ~1100px

### Mobile (< 768px)
- No sidebar (bottom nav bar)
- Farm switcher: icon avatars in horizontal scroll row + attention dots
- Priority alerts: full-width banners
- Intelligence scroll row: Season, AI Insights, Eco Health (3 cards, horizontal scroll)
- Tasks: **full-width vertical list below the scroll row** — larger tap targets for field use
- Lower panels: stacked single column
- Bottom nav: Home, Map, Plants, Learn, Profile

---

## Data Sources (All Existing)

| Intelligence | Source | Query |
|---|---|---|
| Farm list | `farms` table | `WHERE user_id = ?` |
| Eco health | `plantings` → `species.permaculture_functions` | Aggregate per farm |
| AI insights | `ai_analyses` table | Latest 5 per farm, keyword-categorised |
| Seasonal | `farms.climate_zone` (normalised) + current date | Computed server-side |
| Tasks | `tasks` table (existing) | `WHERE farm_id = ? AND status NOT IN ('completed','skipped')` |
| Progress | `user_progress` + `lesson_completions` | Existing queries |
| Activity | `ai_analyses` + `plantings` + `zones` sorted by `created_at` | Limit 10 |
| Farm thumbnail | `ai_analyses.screenshot_data[0]` → fallback gradient | Latest analysis |

---

## Tasks Integration (Existing Schema)

The `tasks` table already exists (migration `099_tasks.sql`). No new table needed.

Relevant columns for dashboard:
- `farm_id` — filter to active farm
- `title` — display text
- `priority` INTEGER — 4=urgent, 3=high, 2=medium, 1=low
- `status` TEXT — 'pending' | 'in_progress' | 'completed' | 'skipped'
- `due_date` INTEGER — unix epoch, nullable
- `source` TEXT — add via additive migration if absent; values: 'manual' | 'seasonal' | 'ai'

**Migration needed:** Add `source TEXT DEFAULT 'manual'` column to existing `tasks` table if not present. Check before running.

---

## Seasonal Computation

No external weather API required for MVP.

**Inputs:** `farms.climate_zone` (normalised), current date, `farms.center_lat` (hemisphere detection).

**Normalisation of `climate_zone`:**
```
strip: "Zone ", "zone ", "USDA Zone ", "usda zone ", "USDA "
lowercase, trim whitespace
valid keys: "3a"–"10b"
if result doesn't match /^\d{1,2}[ab]$/ → omit frost dates
```

**Frost date table:** USDA hardiness zone approximate average frost dates (well-known public data, hardcoded). Provides `lastFrost` (spring, northern hemisphere) and `firstFrost` (autumn) as `{ month, day }` pairs for zones 3a–10b.

**Season labels** derived from month + hemisphere. Northern hemisphere defaults if `center_lat` is null.

**Frost risk:** True when within ±2 days of either frost date.

---

## Ecological Health Score Algorithm

```
score = Math.round((functionsWithAtLeastOne / 8) * 100)
```

The 8 functions: `nitrogen_fixer`, `pollinator`, `dynamic_accumulator`, `wildlife_habitat`, `edible`, `medicinal`, `erosion_control`, `water_management`.

`functionsWithAtLeastOne` = count of these keys that have ≥1 planting with that function in `species.permaculture_functions`.

Score displayed as integer 0–100. Nudge shown when score < 80.

---

## Out of Scope (Future)

- Real-time weather API integration (live frost from weather service)
- Push notifications for frost alerts
- Task assignment to collaborators
- Harvest weight / yield tracking
- Community feed on dashboard (remains in Discover tab)
- Per-farm `source` column for task auto-generation (just manual tasks in MVP)

---

## Success Criteria

1. Any user can reach their map editor in ≤ 2 taps/clicks from the dashboard
2. A user with 3 farms can identify which farm has urgent tasks or frost risk from the tab strip alone (via attention dot badge), without opening any farm
3. The ecological health score surfaces at least 1 actionable gap for farms with < 8 functions covered
4. Mobile layout is usable one-handed on a 375px screen (all tap targets ≥ 44px)
5. Page loads without layout shift (skeleton states for all async sections)

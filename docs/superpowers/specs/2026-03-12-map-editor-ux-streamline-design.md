# Map Editor UX Streamline — Design Spec
**Date:** 2026-03-12
**Status:** Approved

---

## Problem Statement

The farm map editor has accumulated too many competing UI surfaces:
- A FAB speed dial (6 actions) competing with the bottom drawer
- A collapsible slide-out header menu with 3 sections duplicating bottom drawer actions
- A standalone Filters tab duplicating filter pills that could be inline
- Duplicate map controls in both the bottom drawer and the MapControlPanel
- No reliable way to return to the default (Features) tab without reloading
- Community and "Make a Post" UI that doesn't belong in a design tool
- No cohesive automation chain connecting farm operations to a farm record

---

## Design Goals

1. **One surface per job.** No action accessible from more than one location.
2. **Always navigable.** Tab bar always visible; user can return to Design tab at any time.
3. **Earned story.** Farm journal populated automatically from real activity, not manual effort.
4. **Less UI, more map.** Remove every element that doesn't earn its screen real estate.

---

## Architecture

### Header (thin persistent bar)
- **Left:** `←` back to dashboard + farm name
- **Right:** `···` overflow menu
  - Export
  - Farm Settings
  - Delete Farm
- **Removed:** slide-out menu, Navigate/Farm Design/Manage sections, Goals button

### Map Canvas
- Full screen, no floating buttons
- Drawing toolbar: appears contextually on left **only** when actively drawing a zone; auto-dismisses when done
- MapControlPanel (top-right): **sole location** for layer selection, grid units, grid density

### Bottom Drawer
Three tabs with a persistent peek bar at all times.

**Peek bar (always visible, ~60px):**
- Tab labels: Design · Manage · Story
- Two action buttons: `+ Add Plant` and `Draw Zone`
- These are the only two primary actions in the editor

---

## Tab 1: Design (default)

**Purpose:** Find, filter, and navigate farm features.

**Contents:**
- Search bar (existing)
- Filter pills (inline, horizontal scroll): All · Zones · Plants · Lines · Guilds + layer pills (Canopy · Shrub · Groundcover etc.)
- Feature list: zones, plantings, lines, guilds grouped by type
- View mode toggle: By Type / By Layer / By Phase
- Tap any feature → map pans to it + opens detail panel

**Removed:**
- Filters as a standalone tab
- Map settings / grid / layer controls (now exclusively in MapControlPanel)
- Any community or post actions

---

## Tab 2: Manage

**Purpose:** Run the farm day-to-day — crop plans, tasks, timeline.

**Top stat row:** Total zones · Total plants · Active crop plans (replaces Farm Vitals standalone section)

### Crop Plans
- Cards: crop name, planting window, status badge (Planned / Active / Harvested)
- Expand inline: variety, zone assignment, expected yield
- `+ New Crop Plan` → creates plan **and** auto-drops a milestone on the timeline (no manual step)
- Tap card → map pans to linked zone

### Timeline / Calendar
- Horizontal scrollable, week/month toggle
- Auto-populated from: crop plan milestones, task due dates, phase transitions
- User can add manual entries
- Completed items show ✓ and become Story candidates

### Tasks
- Collapsible section below timeline
- Fields: task name, due date, assigned zone, status
- Completing a task → **quick note prompt** (1-2 sentences, dismissable)
- Note saves silently → queues as draft journal entry in Story tab

**Removed:**
- Farm Vitals as standalone section (replaced by stat row)
- Any community or post actions

---

## Tab 3: Story

**Purpose:** Living farm record, earned through real activity.

### Automation Chain
```
Crop Plan created
  → Timeline milestone auto-added

Task completed + note written
  → Draft journal entry queued

Phase transition
  → Auto-entry: "Year 2 began. 3 new plantings added."

Crop plan milestone reached
  → Auto-entry: "Tomatoes planted in Zone 2 — Week 3"
```

### Draft Queue (top, dismissable banner)
- "You have N entries ready to review"
- Tap → approve / edit / discard each draft
- **Nothing appears in Story without user seeing it** — this is the guardrail
- Edit UI: plain text only, no rich editor

### Published Feed
- Reverse chronological
- Card per entry: date, auto-tag (Task / Milestone / Phase / Manual), text, optional photo
- Entries are **private by default**
- No sharing UI inside the editor — sharing lives in `···` overflow only

**Removed:**
- Make a Post (all instances)
- Community tab and any community-related UI

---

## Removals Summary

| Element | Current Location | Disposition |
|---------|-----------------|-------------|
| FAB speed dial (6 actions) | Fixed floating button | **Removed entirely** |
| Slide-out header menu | CollapsibleHeader | **Removed** — replaced by thin header bar |
| Filters tab | Bottom drawer tab 2 | **Removed** — pills moved inline to Design tab |
| Map controls in drawer | Filters tab → Map Settings | **Removed** — MapControlPanel is sole location |
| Community section | Bottom drawer / header | **Removed** |
| Make a Post button | Peek bar, header, FAB | **Removed** from all locations |
| Farm Vitals standalone | Vitals & Time tab | **Replaced** by stat row in Manage tab |
| Duplicate Add Plant | FAB + peek bar + header | **Consolidated** to peek bar only |
| Duplicate Draw Zone | FAB + peek bar + header | **Consolidated** to peek bar only |

---

## Automation Connections (new behavior)

| Trigger | Automatic Output | User Guardrail |
|---------|-----------------|----------------|
| Crop plan created | Timeline milestone added | None needed — additive |
| Task completed | Note prompt appears | Dismissable, 1-2 sentences |
| Note saved on task | Draft queued in Story | User approves/edits/discards |
| Phase transition | Auto-entry drafted | User approves/edits/discards |
| Crop milestone reached | Auto-entry drafted | User approves/edits/discards |

---

## Files Affected (preliminary)

- `components/map/map-bottom-drawer.tsx` — restructure tabs, remove Filters tab, add inline pills
- `components/immersive-map/immersive-map-editor.tsx` — remove FAB integration
- `components/immersive-map/collapsible-header.tsx` — replace with thin header bar
- `components/map/feature-list-panel.tsx` — inline filter pills
- `components/immersive-map/map-fab.tsx` — **delete**
- `components/map/map-bottom-drawer.tsx` — remove map settings section
- New: `components/map/manage-tab.tsx` — crop plans + timeline + tasks
- New: `components/map/story-tab.tsx` — draft queue + published feed
- New: `components/map/story-automation.ts` — draft generation logic
- `app/(app)/farm/[id]/page.tsx` — wire up automation triggers

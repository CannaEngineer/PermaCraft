# PermaCraft — 2026-05-07
## Focus: 📊 Dashboard

### 1. Farm selector shows "last edited" time
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: Added relative timestamp ("2 hours ago") to each farm pill in the multi-farm selector strip.
Map/dashboard impact: Designers with 5+ farms can instantly identify which farm they worked on most recently without guessing from zone/planting counts.

### 2. Tasks widget auto-selects the first non-empty tab
File: `components/dashboard/tasks-widget.tsx`
What changed: Added `pickDefaultTab()` that checks whether "today" has items, falls back to "week", then "all" — instead of always defaulting to "today".
Map/dashboard impact: The tasks widget no longer shows "Nothing due today" as the first thing a designer sees when their tasks have no due dates. The widget now surfaces useful content immediately.

### 3. Activity timeline items are clickable and labeled
File: `components/dashboard/activity-timeline.tsx`
What changed: Each activity item now links to the farm editor (or AI tab for AI insights). Added a subtle type label ("zone", "planting", "task") below each item title.
Map/dashboard impact: Designers can click an activity entry to jump straight to the farm that activity relates to, instead of the timeline being a dead-end display.

### 4. Insights widget removes double truncation
File: `components/dashboard/insights-widget.tsx`
What changed: Removed the JS 140-char truncation that conflicted with CSS `line-clamp`. Now strips markdown formatting and relies solely on `line-clamp-3` for consistent text display.
Map/dashboard impact: AI insight cards show more readable text without awkward mid-sentence "..." followed by further CSS clamping.

## Watch for
- Activity timeline links go to the farm root, not to specific features — deep-linking to individual zones/plantings would require passing feature type + ID to the map editor's URL scheme.
- Tasks widget `pickDefaultTab()` runs on initial render only; if tasks are added/completed, the tab won't auto-switch (this is intentional — don't interrupt the user's current view).

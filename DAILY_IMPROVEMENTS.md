# PermaCraft — 2026-05-14
## Focus: Dashboard (Wednesday)

### 1. Smart default tab in TasksWidget
File: `components/dashboard/tasks-widget.tsx`
What changed: The tasks widget now auto-selects the first non-empty tab instead of always defaulting to "today". A new `computeSmartDefaultTab()` function checks if "today" has items (due/overdue/urgent tasks), falls back to "week" if that has items, and finally falls back to "all". Only defaults to "today" when no tasks exist at all (so the empty state messaging is appropriate).
Map/dashboard impact: Designers who use tasks without due dates no longer see an empty "Nothing due today" as their first impression. The widget opens to the tab that actually has content, making the task list immediately useful.

### 2. Replace unreliable insight categorization with query-first layout
File: `components/dashboard/insights-widget.tsx`
What changed: Removed the `categorize()` function that assigned "Gap"/"Opportunity"/"Insight" labels based on keyword matching (words like "could", "add", "missing"). These labels were often wrong because such words appear in all kinds of AI responses. Replaced with a clean layout: the user's original query is the primary header, a relative timestamp shows recency, and the AI response snippet is the body. Each insight card is now a clickable link to the AI chat. Also improved snippet extraction to prefer complete first sentences over arbitrary character cuts.
Map/dashboard impact: Designers see their actual questions and the AI's answers without misleading auto-categories. The clickable cards let them jump back to the full conversation. Snippets read more naturally since they break at sentence boundaries when possible.

### 3. Add recency indicator to farm selector cards
File: `components/dashboard/dashboard-client-v2.tsx`
What changed: The horizontal farm selector cards (shown for users with 2+ farms) now display a relative timestamp like "2 hours ago" or "3 days ago" next to each farm name. Uses the `last_activity_at` timestamp from the dashboard query (which already accounts for zone/planting/line updates, not just the farm record).
Map/dashboard impact: Multi-farm designers can instantly identify which farm they worked on most recently without clicking through each card. The recency info is subtle (10px muted text) so it doesn't clutter the compact card layout.

## Watch for
- The `computeSmartDefaultTab()` runs at component initialization time. If tasks are updated (added/completed/deleted) after mount, the default tab doesn't re-compute — but that's correct because by then the user has actively chosen a tab.
- The InsightsWidget now imports `formatDistanceToNow` from date-fns, which was already a project dependency (used by FarmHeroCard and ActivityTimeline).
- Farm selector recency text truncation: very long farm names combined with the timestamp could overflow on narrow mobile cards. The timestamp uses `flex-shrink-0` so the farm name truncates first, preserving the time info.

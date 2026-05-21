# PermaCraft — 2026-05-21
## Focus: Dashboard (Wednesday)

### 1. Activity Timeline Time Grouping
File: `components/dashboard/activity-timeline.tsx`
What changed: Activity items are now grouped into "Today", "This Week", and "Earlier" sections with labeled dividers instead of a flat chronological list.
Map/dashboard impact: Designers with active farms can instantly see what happened today vs. earlier this week, making the timeline scannable at a glance instead of requiring mental date parsing for each item.

### 2. Farm Description Display in Hero Card
File: `components/dashboard/farm-hero-card.tsx`
What changed: The farm's `description` field (which was stored but never shown) now renders below the name/meta line, clamped to 2 lines.
Map/dashboard impact: Designers who wrote descriptions like "5-acre homestead in Zone 7b, year 2 of food forest" now see that context on the dashboard without opening the farm editor. Especially useful when managing 5+ farms.

### 3. AI Insights Markdown Stripping
File: `components/dashboard/insights-widget.tsx`
What changed: Added `stripMarkdown()` preprocessing to `extractSnippet()` that removes headings, bold/italic, lists, links, and code formatting before truncating the AI response for display.
Map/dashboard impact: AI insight snippets now display as clean prose instead of showing raw markdown syntax (e.g., `## Analysis` or `**Important:**`) in the dashboard cards.

### 4. EcoRing Actionable Improvement Tip
Files: `components/dashboard/eco-ring.tsx`, `components/dashboard/dashboard-client-v2.tsx`
What changed: The eco health suggestion tip now includes a "Browse species to plant" link that navigates to the farm editor's species tab. Added `farmId` prop to `EcoRing`.
Map/dashboard impact: When a designer's eco score is below 75%, they see not just what's missing but a direct link to act on it — reducing the steps from "read tip" to "browse and add a nitrogen fixer" from 3 clicks to 1.

## Watch for
- Activity timeline grouping uses `isThisWeek` from date-fns v4 with `weekStartsOn: 1` (Monday). Verify this matches user expectations for "this week" boundaries.
- The species tab link (`?tab=species`) needs to be handled by the farm editor route. If the editor doesn't parse that query param, the link lands on the default tab. Worth verifying in the farm editor.
- Farm description display relies on the existing `description` column. If descriptions contain very long text or HTML, the `line-clamp-2` CSS handles it gracefully, but sanitization may be needed if user input isn't already sanitized at write time.

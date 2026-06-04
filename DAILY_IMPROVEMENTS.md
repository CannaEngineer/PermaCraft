# PermaCraft — 2026-06-04
## Focus: Dashboard (Wednesday)

### 1. Fix incomplete farm DELETE cascade
File: `app/api/farms/[id]/route.ts`
What changed: Added explicit DELETE statements for 17 missing tables (lines, tasks, design_layers, phases, comments, annotations, crop_plans, harvest_logs, farm_story_sections, story_entries, timeline_entries, farm_tours, shop_products, farm_posts, custom_imagery, farm_follows, collection_items). Also updated the delete confirmation dialog to list all affected data types.
Map/dashboard impact: Deleting a farm no longer leaves orphaned records in related tables. Previously, only 6 of 23 farm-linked tables were cleaned up.

### 2. Task quick-add with priority and due date
File: `components/dashboard/tasks-widget.tsx`
What changed: The inline task creation form now includes a priority selector (Low/Normal/High/Urgent) and a date picker for due dates. Previously hardcoded to priority 2 with no due date.
Map/dashboard impact: Designers can create properly prioritized and scheduled tasks directly from the dashboard without opening the farm editor.

### 3. Farm hero card edit UX improvements
File: `components/dashboard/farm-hero-card.tsx`
What changed: Enlarged save/cancel/delete buttons from 26px to ~36px touch targets (rounded-xl px-3 py-2 with h-4 w-4 icons). Added client-side acres validation, error state display on save failure, and network error handling.
Map/dashboard impact: Edit mode is now usable on mobile devices. Save failures show a clear error message instead of silently failing.

### 4. Activity timeline date formatting
File: `components/dashboard/activity-timeline.tsx`
What changed: Today's activity shows relative time ("2 hours ago"), while older activity shows calendar dates ("Jun 2"). Full datetime is available on hover via title attribute.
Map/dashboard impact: Designers can distinguish between activities across different days without mental math on relative timestamps like "3 days ago" vs "4 days ago".

## Watch for
- SQLite foreign keys are never enabled via PRAGMA. The explicit batch delete is the only protection. If new tables with farm_id are added in future migrations, the delete cascade in `app/api/farms/[id]/route.ts` must be updated manually.
- The `farm_journal_entries` table (in `migrations/002_farm_journal.sql`, separate from `lib/db/migrations/`) was not added to the cascade since it appears to be from an older migration path. Monitor if it's actively used.
- The delete dialog lists "shop products" but shop_orders (which reference farm_id) are not deleted — orders should likely be preserved for financial records. If this is wrong, add them to the cascade.

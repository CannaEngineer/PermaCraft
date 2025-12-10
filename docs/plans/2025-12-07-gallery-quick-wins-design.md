# Gallery Quick Wins Design
**Date**: 2025-12-07
**Status**: Approved
**Implementation Time**: 6-8 days

## Overview

This design extracts high-impact, low-effort improvements from the full [Gallery Improvement Plan](../../GALLERY_IMPROVEMENT_PLAN.md). Instead of 16-21 weeks of work across 5 phases, we implement 5 quick wins that deliver immediate user value in under 2 weeks.

## Design Philosophy

**Leverage existing infrastructure**: Use database fields and tables that already exist but lack UI connections (`hashtags`, `saved_posts`, `post_type`, farm metadata).

**No schema changes**: All improvements work with current database structure.

**Reuse existing patterns**: Follow established patterns for infinite scroll, API endpoints, and UI components.

## Current State Analysis

### What We Have
- ✅ Linear feed with infinite scroll working
- ✅ Post cards with farm context, author info, reactions, comments
- ✅ AI screenshots displayed for ai_insight posts
- ✅ Universal search integration
- ✅ Database fields: `hashtags`, `tagged_zones` (queried but not displayed)
- ✅ Database table: `saved_posts` (exists but no UI)
- ✅ Database field: `post_type` with index (not filterable)
- ✅ Farm metadata: `climate_zone`, `acres`, `soil_type` (not filterable)

### What's Missing
- ❌ No hashtag display or filtering
- ❌ No bookmark functionality
- ❌ No post type filtering
- ❌ No visual variety (single column only)
- ❌ No climate/size filtering (the most requested feature)

## Quick Win #1: Hashtag Display & Filtering

**Value**: Massive improvement in content discovery
**Effort**: 1-2 days
**Dependencies**: None

### Features
1. Display hashtags on post cards as clickable badges
2. Click hashtag to filter feed to that topic
3. Trending hashtags sidebar showing top 5-10 hashtags (last 30 days)
4. URL support: `/gallery?hashtag=permaculture`

### Implementation
- **UI Changes**:
  - Update `components/feed/post-card.tsx` to render `post.hashtags` array
  - Add clickable badges (similar to existing tagged zones display)
  - Create `components/feed/trending-hashtags.tsx` widget

- **API Changes**:
  - Update `/api/feed/global/route.ts` to accept `hashtag` query param
  - Add WHERE clause: `AND p.hashtags LIKE ?` with JSON search
  - Create `/api/feed/trending-hashtags/route.ts` for sidebar

- **SQL Pattern** (trending hashtags):
```sql
-- Extract hashtags from all recent posts and count frequency
SELECT json_extract(value, '$') as hashtag, COUNT(*) as count
FROM farm_posts, json_each(farm_posts.hashtags)
WHERE created_at > unixepoch() - (30 * 86400)
  AND is_published = 1
GROUP BY hashtag
ORDER BY count DESC
LIMIT 10
```

### User Flow
1. User sees hashtags like `#foodforest`, `#zone3` on posts
2. Clicks `#foodforest`
3. Gallery filters to show only posts with that hashtag
4. URL updates to `/gallery?hashtag=foodforest`
5. User can clear filter or click different hashtag

## Quick Win #2: Bookmark/Save Posts

**Value**: High - users want to save inspiring designs
**Effort**: 1 day
**Dependencies**: None

### Features
1. Bookmark button on each post (toggle on/off)
2. Saved posts page at `/gallery/saved`
3. Visual indicator when post is bookmarked
4. Bookmark count (optional)

### Implementation
- **UI Changes**:
  - Add bookmark button to `components/feed/post-actions.tsx`
  - Use `Bookmark` icon from lucide-react
  - Show filled icon when bookmarked
  - Track bookmark state in `PostCard` component

- **API Changes**:
  - Create `/api/farms/[farmId]/posts/[postId]/bookmark/route.ts`
  - POST to toggle bookmark (like reactions)
  - Return new bookmark state
  - Create `/api/feed/saved/route.ts` (similar to global feed)

- **New Pages**:
  - `/app/(app)/gallery/saved/page.tsx`
  - Reuse `GlobalFeedClient` component with saved posts data
  - Add "Saved" tab/link in gallery navigation

### SQL Pattern
```sql
-- Check if user has bookmarked post
SELECT id FROM saved_posts
WHERE user_id = ? AND post_id = ?

-- Toggle bookmark
INSERT INTO saved_posts (id, user_id, post_id)
VALUES (?, ?, ?)
ON CONFLICT(user_id, post_id) DO DELETE

-- Get saved posts feed
SELECT p.*, ...
FROM farm_posts p
JOIN saved_posts sp ON sp.post_id = p.id
WHERE sp.user_id = ?
ORDER BY sp.created_at DESC
```

### User Flow
1. User sees inspiring food forest design
2. Clicks bookmark icon
3. Post is saved to their collection
4. User navigates to "Saved" tab
5. Sees all bookmarked posts for reference

## Quick Win #3: Post Type Filtering

**Value**: Users want to browse AI insights separately
**Effort**: 1 day
**Dependencies**: None

### Features
1. Filter tabs: All | AI Insights | Photos | Updates
2. URL support: `/gallery?type=ai_insight`
3. Count badges showing posts per type (optional)
4. Preserves other filters (hashtags, etc.)

### Implementation
- **UI Changes**:
  - Add tab buttons in `app/(app)/gallery/page.tsx` above feed
  - Use shadcn `Tabs` component
  - Highlight active tab
  - Show counts if available

- **API Changes**:
  - Update `/api/feed/global/route.ts` to accept `type` query param
  - Add WHERE clause: `AND p.post_type = ?` when specified
  - Optional: Add count query for badges

### SQL Pattern
```sql
-- Filter by type
WHERE f.is_public = 1
  AND p.is_published = 1
  AND p.post_type = ? -- 'ai_insight', 'photo', or 'text'

-- Get counts for badges
SELECT post_type, COUNT(*) as count
FROM farm_posts p
JOIN farms f ON f.id = p.farm_id
WHERE f.is_public = 1 AND p.is_published = 1
GROUP BY post_type
```

### User Flow
1. User lands on gallery (shows all posts)
2. Clicks "AI Insights" tab
3. Feed filters to show only AI-generated content
4. URL updates to `/gallery?type=ai_insight`
5. User can switch back to "All" or try "Photos"

## Quick Win #4: Grid Layout Option

**Value**: Dramatic visual improvement, more content visible
**Effort**: 1-2 days
**Dependencies**: None

### Features
1. Layout toggle button: List ⇄ Grid
2. Responsive 2-column grid on desktop
3. Preference saved in localStorage
4. Smooth transition between layouts

### Implementation
- **UI Changes**:
  - Add toggle button in gallery header (LayoutGrid/LayoutList icons)
  - Update `components/feed/global-feed-client.tsx` to accept `layout` prop
  - Apply conditional CSS classes based on layout mode
  - Store preference: `localStorage.setItem('gallery-layout', 'grid')`

- **CSS Strategy**:
```tsx
// List mode (current)
<div className="max-w-2xl mx-auto space-y-4">

// Grid mode (new)
<div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
```

- **State Management**:
```tsx
const [layout, setLayout] = useState<'list' | 'grid'>('list')

useEffect(() => {
  const saved = localStorage.getItem('gallery-layout')
  if (saved) setLayout(saved as 'list' | 'grid')
}, [])

const toggleLayout = () => {
  const newLayout = layout === 'list' ? 'grid' : 'list'
  setLayout(newLayout)
  localStorage.setItem('gallery-layout', newLayout)
}
```

### User Flow
1. User opens gallery (defaults to list or saved preference)
2. Clicks grid icon to see 2-column layout
3. More posts visible at once, Pinterest-like feel
4. Preference remembered on next visit

### Future Enhancement
Can upgrade to full masonry layout (react-masonry-css) later without changing the toggle UX.

## Quick Win #5: Climate Zone & Farm Size Filtering

**Value**: THE most important filter for permaculture users
**Effort**: 2 days
**Dependencies**: None

### Features
1. Collapsible filter sidebar with:
   - Climate zone checkboxes (7a, 7b, 8a, 8b, etc.)
   - Farm size radio buttons: <1ac, 1-5ac, 5-20ac, 20+ac
   - Soil type checkboxes (clay, loam, sand, silt)
2. URL support: `/gallery?zones=7a,7b&size=medium`
3. Active filter chips with remove option
4. Filter state persists with URL (shareable)

### Implementation
- **UI Changes**:
  - Create `components/feed/filter-sidebar.tsx`
  - Collapsible on mobile (drawer or accordion)
  - Checkboxes for multi-select (climate, soil)
  - Radio buttons for single-select (farm size)
  - "Clear Filters" button

- **API Changes**:
  - Update `/api/feed/global/route.ts` to accept:
    - `climate_zones` (array): `?climate_zones=7a&climate_zones=7b`
    - `farm_size` (string): `?farm_size=small`
    - `soil_types` (array): `?soil_types=clay&soil_types=loam`
  - Add JOIN conditions to filter by farm metadata

### SQL Pattern
```sql
-- Base query with metadata filters
SELECT p.*, f.climate_zone, f.acres, f.soil_type, ...
FROM farm_posts p
JOIN farms f ON p.farm_id = f.id
WHERE f.is_public = 1 AND p.is_published = 1
  -- Climate zone filter (if provided)
  AND (? IS NULL OR f.climate_zone IN (?, ?, ?))
  -- Farm size filter (if provided)
  AND (
    ? IS NULL OR
    (? = 'small' AND f.acres < 1) OR
    (? = 'medium' AND f.acres BETWEEN 1 AND 5) OR
    (? = 'large' AND f.acres BETWEEN 5 AND 20) OR
    (? = 'xlarge' AND f.acres >= 20)
  )
  -- Soil type filter (if provided)
  AND (? IS NULL OR f.soil_type IN (?, ?, ?))

-- Get available filter values (for UI)
SELECT DISTINCT climate_zone FROM farms
WHERE climate_zone IS NOT NULL AND is_public = 1
ORDER BY climate_zone
```

### Farm Size Categories
- **Small**: < 1 acre (urban, backyard)
- **Medium**: 1-5 acres (suburban homestead)
- **Large**: 5-20 acres (small farm)
- **Very Large**: 20+ acres (production farm)

### User Flow
1. User opens gallery, sees filter sidebar
2. Selects "Zone 7a" and "Zone 7b" checkboxes
3. Selects "Medium (1-5 acres)" size
4. Feed filters to show only matching farms
5. URL updates: `/gallery?zones=7a,7b&size=medium`
6. User can share URL with friend in same climate
7. Active filters shown as removable chips above feed

## Technical Considerations

### Performance
- All filters use existing indexes (post_type, created_at, farm metadata)
- No N+1 queries (JOIN farms in single query)
- Pagination still works with filters (cursor-based)

### URL State Management
- Use Next.js `useSearchParams` and `useRouter`
- Filters encode as query params for shareability
- Browser back button works correctly

### Mobile Responsiveness
- Filter sidebar becomes drawer on mobile
- Grid layout becomes single column on mobile
- Hashtags wrap properly on small screens

### Accessibility
- Checkboxes/radios properly labeled
- Keyboard navigation works
- Screen reader friendly filter announcements

## Implementation Order

**Recommended sequence** (can parallelize some):

1. **Day 1-2**: Quick Win #3 (Post Type Filtering)
   - Simplest, builds confidence
   - Establishes URL param pattern

2. **Day 2-3**: Quick Win #1 (Hashtags)
   - Moderate complexity
   - High visibility feature

3. **Day 3-4**: Quick Win #2 (Bookmarks)
   - Independent feature
   - Backend + frontend work

4. **Day 4-5**: Quick Win #4 (Grid Layout)
   - Pure frontend
   - Can work in parallel with others

5. **Day 6-8**: Quick Win #5 (Climate/Size Filters)
   - Most complex (sidebar UI)
   - Builds on URL param pattern from #3

## Success Metrics

After implementation, track:
- **Engagement**: Time spent on gallery (expect +30%)
- **Discovery**: Click-through rate on hashtags/filters
- **Retention**: Bookmark usage rate
- **Preference**: Grid vs list adoption (interesting A/B data)
- **Filtering**: Most popular climate zones/sizes

## Future Enhancements

These quick wins set up infrastructure for Phase 2+ features:
- Full masonry layout (upgrade from 2-col grid)
- Permaculture technique filtering (needs tagging system)
- Featured species filtering (needs species extraction from posts)
- Personalized "For You" feed (needs engagement tracking)
- Creator profiles (Phase 5)

## Checklist

- [ ] Quick Win #1: Hashtag display & filtering
  - [ ] Display hashtags on PostCard
  - [ ] Clickable hashtag filtering
  - [ ] Trending hashtags sidebar
  - [ ] API support for hashtag param

- [ ] Quick Win #2: Bookmark/save posts
  - [ ] Bookmark button in PostActions
  - [ ] Bookmark API endpoint
  - [ ] Saved posts page
  - [ ] Saved feed API endpoint

- [ ] Quick Win #3: Post type filtering
  - [ ] Filter tabs UI
  - [ ] API support for type param
  - [ ] Count badges (optional)

- [ ] Quick Win #4: Grid layout option
  - [ ] Layout toggle button
  - [ ] Grid CSS implementation
  - [ ] LocalStorage persistence

- [ ] Quick Win #5: Climate zone & farm size filtering
  - [ ] Filter sidebar component
  - [ ] Climate zone checkboxes
  - [ ] Farm size categories
  - [ ] Soil type checkboxes (optional)
  - [ ] API support for metadata filters
  - [ ] Active filter chips

---

**Estimated Total Time**: 6-8 days
**Estimated User Value**: 70% of full 5-phase plan impact
**Estimated Effort**: 10% of full plan complexity

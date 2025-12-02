# Universal Search System Design

**Date:** 2025-12-01
**Status:** Design Complete, Ready for Implementation
**Priority:** High - Core navigation feature

## Overview

Implement a context-aware, real-time search system that works across personal farms and community content. The search provides instant feedback with grouped results in a dropdown overlay.

## Goals

1. **Intuitive & Fast**: Real-time search with 400ms debounce for instant feedback
2. **Context-Aware**: Smart prioritization based on user location (My Farms vs Community)
3. **Reusable**: Single component that works everywhere with different contexts
4. **Comprehensive**: Search farms, posts, species, zones, users, and AI conversations
5. **Accessible**: Keyboard navigation, ARIA labels, mobile-friendly

## User Experience

### Search Interaction Flow

1. User focuses search bar (click or `Cmd/Ctrl + K`)
2. Types query (minimum 3 characters)
3. After 400ms of no typing, search executes
4. Results appear in dropdown overlay below search bar
5. User navigates with mouse/keyboard
6. Clicking result navigates to that entity
7. Dropdown dismisses on: selection, Escape, click outside

### Context Behavior

**Three contexts determine what gets searched:**

- `my-farms`: Your farms, zones, AI conversations only
- `community`: Public farms and posts from all users
- `global`: Everything (farms, posts, users, species, AI conversations)

**Where each context is used:**
- Navigation bar: `global` (search everything)
- Dashboard page: `my-farms` (search your content)
- Gallery page: `community` (search public content)

## Architecture

### Component Structure

```
components/search/
├── universal-search.tsx           # Main search bar + dropdown container
├── search-results-dropdown.tsx    # Grouped results overlay
├── search-result-item.tsx         # Individual result renderer
├── search-section.tsx             # Result section with header
└── use-search.ts                  # Hook for API calls, debouncing, state
```

### Component API

```tsx
<UniversalSearch
  context="my-farms" | "community" | "global"
  placeholder="Search your farms..."
  onResultClick={(result) => router.push(result.url)}
  className="w-full"
/>
```

### Search Hook

```typescript
const {
  query,
  setQuery,
  results,
  isLoading,
  isOpen,
  setIsOpen,
  highlightedIndex,
  setHighlightedIndex,
} = useSearch({ context, minChars: 3, debounceMs: 400 });
```

## API Design

### Endpoint: `/api/search`

**Request:**
```
GET /api/search?q=swale&context=my-farms&limit=15
```

**Response:**
```json
{
  "farms": [
    {
      "id": "farm_123",
      "name": "Green Acres Farm",
      "description": "Permaculture paradise with swale systems",
      "owner_name": "John Doe",
      "owner_image": "https://...",
      "is_public": 1,
      "image_url": "https://...",
      "acres": 5.2
    }
  ],
  "posts": [
    {
      "id": "post_456",
      "farm_id": "farm_123",
      "farm_name": "Green Acres",
      "content_preview": "Just finished building our swale system...",
      "author_name": "John Doe",
      "author_image": "https://...",
      "type": "ai_insight",
      "created_at": 1234567890
    }
  ],
  "species": [
    {
      "id": "species_789",
      "common_name": "Swale Willow",
      "scientific_name": "Salix species",
      "layer": "shrub",
      "description": "Great for erosion control in swales"
    }
  ],
  "zones": [
    {
      "id": "zone_101",
      "farm_id": "farm_123",
      "farm_name": "Green Acres",
      "name": "Main Swale",
      "zone_type": "swale"
    }
  ],
  "users": [
    {
      "id": "user_202",
      "name": "Jane Smith",
      "image": "https://...",
      "farm_count": 3
    }
  ],
  "ai_conversations": [
    {
      "id": "conv_303",
      "farm_id": "farm_123",
      "farm_name": "Green Acres",
      "title": "Swale design for north slope",
      "created_at": 1234567890
    }
  ]
}
```

### Search Queries by Context

**my-farms context:**
```sql
-- Farms (user owns)
SELECT * FROM farms WHERE user_id = ? AND name LIKE ?

-- Zones (in user's farms)
SELECT z.*, f.name as farm_name
FROM zones z JOIN farms f ON z.farm_id = f.id
WHERE f.user_id = ? AND (z.name LIKE ? OR z.zone_type LIKE ?)

-- AI Conversations (user's conversations)
SELECT c.*, f.name as farm_name
FROM ai_conversations c JOIN farms f ON c.farm_id = f.id
WHERE f.user_id = ? AND c.title LIKE ?
```

**community context:**
```sql
-- Public farms
SELECT f.*, u.name as owner_name, u.image as owner_image
FROM farms f JOIN users u ON f.user_id = u.id
WHERE f.is_public = 1 AND f.name LIKE ?

-- Public posts
SELECT p.*, u.name as author_name, u.image as author_image, f.name as farm_name
FROM farm_posts p
JOIN users u ON p.author_id = u.id
JOIN farms f ON p.farm_id = f.id
WHERE p.is_published = 1 AND f.is_public = 1
AND (p.content LIKE ? OR p.hashtags LIKE ?)
```

**global context:**
All of the above PLUS:

```sql
-- All accessible farms (owned OR public)
SELECT * FROM farms
WHERE (user_id = ? OR is_public = 1) AND name LIKE ?

-- All users
SELECT id, name, image,
       (SELECT COUNT(*) FROM farms WHERE user_id = users.id) as farm_count
FROM users WHERE name LIKE ?

-- All species
SELECT * FROM species
WHERE common_name LIKE ? OR scientific_name LIKE ?
```

## UI Components

### Search Bar

**Features:**
- Search icon (magnifying glass) on left
- Clear button (X) appears when typing
- Loading spinner during search
- Context-based placeholder text
- Keyboard shortcut: `Cmd/Ctrl + K`

**Styling:**
```tsx
className="
  h-11 w-full px-4 py-2 pl-10 pr-10
  border border-border rounded-lg
  bg-card text-foreground
  placeholder:text-muted-foreground
  focus:outline-none focus:ring-2 focus:ring-primary
"
```

### Results Dropdown

**Layout:**
- Appears below search bar
- Max height: 500px with scroll
- Grouped sections with headers
- Each section shows max 3 results
- "View all X results" link if more exist

**Section Order & Icons:**
1. 🗺️ **Farms** - name, owner, acres, thumbnail
2. 📝 **Posts** - preview, author, timestamp (✨ for AI insights)
3. 🌱 **Species** - common name, scientific name, layer
4. 📍 **Zones** - name, farm name, type
5. 👤 **Users** - name, avatar, farm count
6. 💬 **AI Conversations** - title, farm name, date

**Result Item Structure:**
```tsx
<ResultItem>
  <Icon /> {/* Type-specific icon */}
  <Content>
    <Title>Farm Name</Title> {/* Matched text bolded */}
    <Subtitle>by John Doe • 5.2 acres</Subtitle>
  </Content>
  <Thumbnail /> {/* If available */}
</ResultItem>
```

### Empty States

**No query entered:**
- Show "Start typing to search..."
- Optional: Recent searches or popular items

**No results found:**
```
No matches for "xyz"

Suggestions:
• Try a different search term
• Browse all farms
• Explore community
```

### Search Highlighting

Match query text appears **bold** in results:
- Query: "swale"
- Result: "Built a **swale** system on the north slope"

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + K` | Focus search from anywhere |
| `Arrow Down` | Highlight next result |
| `Arrow Up` | Highlight previous result |
| `Enter` | Navigate to highlighted result |
| `Escape` | Close dropdown |
| `Tab` | Move focus away (closes dropdown) |

## Performance Optimizations

**Debouncing:**
- Wait 400ms after typing stops before searching
- Cancel previous request if new query starts

**Query Limits:**
- Minimum 3 characters to trigger search
- Each section limited to 3 results in dropdown
- Total API response limited to 15 items per category

**Caching:**
- Cache results for 60 seconds (same query = instant)
- Clear cache when creating/updating content

**Request Cancellation:**
- Use AbortController to cancel in-flight requests
- New query cancels previous search

## Mobile Responsive

**Adaptations:**
- Search bar full width on mobile
- Dropdown full width (edge to edge)
- Larger touch targets (min 44px height)
- Tap outside overlay to dismiss
- "View all" links larger for thumb tapping
- Hide keyboard on result selection

**Breakpoints:**
- Mobile: `< 768px` - Full width, stacked layout
- Desktop: `≥ 768px` - Max width 600px, side-by-side details

## Security & Permissions

**Access Control:**
- Never show private farms to non-owners
- Filter out unpublished/draft posts
- Only show AI conversations from user's farms
- Respect `is_public` flag on all queries
- Users can only see their own zones/conversations

**Input Sanitization:**
- Escape special characters in LIKE queries
- Use parameterized queries (no SQL injection)
- Limit query length to 100 characters

## Error Handling

**API Errors:**
- Network error: "Search unavailable, try again"
- Timeout: "Search took too long, try simplifying"
- 500 error: "Something went wrong, please retry"

**Fallback Behavior:**
- If API fails, show empty state with error message
- Allow retry button
- Don't block UI - search is non-critical

## Testing Strategy

**Unit Tests:**
- Search hook debouncing logic
- Result grouping and sorting
- Keyboard navigation state
- Query sanitization

**Integration Tests:**
- API endpoint with different contexts
- Permission filtering (private farms)
- Result formatting and highlighting

**Manual Testing:**
- Test on mobile devices
- Keyboard-only navigation
- Screen reader compatibility
- Test with slow network (throttling)

## Future Enhancements

**Phase 2 (Optional):**
- Search filters (date range, farm type, author)
- Advanced search syntax (`author:john type:post`)
- Search history (recent searches)
- Autocomplete suggestions
- Search analytics (popular queries)
- Full-text search with ranking (PostgreSQL/Elasticsearch)

**Phase 3 (Optional):**
- Saved searches
- Search alerts (notify when new matching content)
- Geographic search (farms near location)
- Image search (find similar farm layouts)

## Implementation Checklist

### Phase 1: Core Search
- [ ] Create API endpoint `/api/search`
- [ ] Implement search queries for each entity type
- [ ] Add context-based filtering logic
- [ ] Test query performance with sample data

### Phase 2: UI Components
- [ ] Build `universal-search.tsx` component
- [ ] Create `search-results-dropdown.tsx`
- [ ] Build `search-result-item.tsx` renderer
- [ ] Add `search-section.tsx` for grouped results
- [ ] Implement `use-search.ts` hook

### Phase 3: Interactions
- [ ] Add debouncing (400ms)
- [ ] Implement keyboard navigation
- [ ] Add loading states and spinners
- [ ] Handle empty states
- [ ] Add result highlighting

### Phase 4: Integration
- [ ] Add search to navigation bar (global context)
- [ ] Add search to dashboard (my-farms context)
- [ ] Add search to gallery (community context)
- [ ] Add `Cmd/Ctrl + K` keyboard shortcut

### Phase 5: Polish
- [ ] Mobile responsive testing
- [ ] Performance optimization (caching)
- [ ] Add request cancellation
- [ ] Test with screen readers
- [ ] Error handling and fallbacks

## Success Criteria

1. **Speed**: Results appear within 500ms of typing
2. **Accuracy**: Relevant results appear in correct context
3. **Usability**: Keyboard navigation works smoothly
4. **Mobile**: Works well on phones with touch
5. **Accessible**: WCAG AA compliant, screen reader friendly
6. **Performance**: No lag or freezing during search

## Notes

- Using SQLite `LIKE` for simplicity; can upgrade to full-text search later
- Search is case-insensitive (`LIKE` with `COLLATE NOCASE`)
- Match highlighting done client-side with regex
- Component designed to be dropped anywhere in the app
- Can easily extend with new entity types or contexts

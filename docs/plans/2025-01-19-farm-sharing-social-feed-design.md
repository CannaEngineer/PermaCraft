# Farm Sharing & Social Feed Design

**Date:** January 19, 2025
**Status:** Approved
**Goal:** Create a world-class farm sharing and community system with social media polish

---

## Vision

Transform Permaculture.Studio's gallery into a living social platform where farm owners tell their permaculture journey through timestamped posts. Enable community learning through engagement (comments, reactions) while maintaining owner control over their narrative.

**Core Concept:** "Farm as Living Story"

Each public farm becomes a portfolio that evolves over time through posts, photos, and AI insights. Visitors discover, learn, and engage. The experience should feel as polished and addictive as modern social platforms (Instagram, LinkedIn) but purpose-built for permaculture education.

---

## Content Types

### 1. Text Posts
Farm owner shares thoughts, observations, milestones.
- Rich text with markdown support
- Optional zone tagging
- Hashtag support
- Example: "Started sheet mulching Zone 3 today. Testing the cardboard + wood chip method the AI suggested."

### 2. Photo Posts
Visual updates with captions, automatically tagged with zones if applicable.
- Multi-photo support (carousel)
- Auto-optimize and compress
- Full-screen lightbox viewer
- Example: Before/after series of swale construction

### 3. AI Highlight Posts
Curated insights from AI conversations with screenshots and owner commentary.
- Owner selects specific AI responses
- Includes terrain analysis screenshots
- Owner adds their own commentary/results
- Example: "The AI analyzed my slope and suggested this swale placement. Here's how it turned out!"

---

## User Flows

### Farm Owner Journey

1. **Creating Content**
   - Floating Action Button (FAB) always visible in farm editor
   - Quick menu: Write Update / Share Photos / Share AI Insight
   - Modal opens with rich editor
   - Auto-save to drafts every 10 seconds
   - One-click publish

2. **Sharing AI Insights**
   - Lists recent AI conversations
   - Select conversation to share
   - Choose what to include (question, response, screenshots)
   - Add personal commentary
   - Publish to feed

3. **Moderating**
   - Optional comment moderation (approve before publish)
   - Edit/delete own posts
   - View engagement analytics

### Visitor Journey

1. **Discovery**
   - Browse gallery grid with improved cards
   - Filter by farm type, climate zone
   - Sort by recent activity, most popular

2. **Exploring Farms**
   - View farm header (cover photo, stats, description)
   - Tab navigation: Feed / Photos / Map / About
   - Infinite scroll feed
   - Switch to photo grid view

3. **Engaging**
   - React to posts (❤️ Love, 🌱 Inspired, 💡 Learned, 🔥 Impressive)
   - Comment with nested replies
   - @ mention users
   - Save posts for later
   - Share to other platforms

---

## Database Schema

### New Tables

```sql
-- Farm Posts (unified content)
CREATE TABLE farm_posts (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  post_type TEXT NOT NULL, -- 'text', 'photo', 'ai_insight'

  content TEXT,
  media_urls TEXT, -- JSON array

  ai_conversation_id TEXT,
  ai_response_excerpt TEXT,

  tagged_zones TEXT, -- JSON array
  hashtags TEXT, -- JSON array

  view_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  is_published INTEGER DEFAULT 1,
  is_draft INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ai_conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
);

-- Post Comments (nested with parent_id)
CREATE TABLE post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  parent_comment_id TEXT,
  author_id TEXT NOT NULL,

  content TEXT NOT NULL,
  reaction_count INTEGER DEFAULT 0,

  is_deleted INTEGER DEFAULT 0,
  is_flagged INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reactions (polymorphic: posts OR comments)
CREATE TABLE post_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  comment_id TEXT,
  user_id TEXT NOT NULL,

  reaction_type TEXT DEFAULT 'heart',

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(post_id, user_id),
  UNIQUE(comment_id, user_id)
);

-- User Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  notification_type TEXT NOT NULL, -- 'comment', 'reply', 'reaction', 'mention'

  post_id TEXT,
  comment_id TEXT,
  triggered_by_user_id TEXT,

  content_preview TEXT,
  is_read INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Saved Posts (bookmarks)
CREATE TABLE saved_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,

  UNIQUE(user_id, post_id)
);

-- Post Views (analytics)
CREATE TABLE post_views (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT,

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Key Design Decisions:**

1. **Denormalized Counters** - `reaction_count`, `comment_count` on posts
   - Avoids COUNT() queries on every feed load
   - Must increment/decrement on reactions/comments
   - 10x faster feed loads

2. **Polymorphic Reactions** - Can react to posts OR comments
   - Either `post_id` or `comment_id` is set, never both
   - Flexible engagement model

3. **JSON Arrays** - For `media_urls`, `tagged_zones`, `hashtags`
   - SQLite handles small JSON well
   - Avoids junction tables
   - Acceptable tradeoff: can't efficiently query "all posts with zone X"

4. **View Tracking** - Separate table, aggregated async
   - Views tracked in background (don't slow page loads)
   - Batch update `view_count` periodically

---

## API Routes

### RESTful Structure

```
/api/farms/[farmId]/
├── posts/
│   ├── route.ts                    → GET (list), POST (create)
│   ├── [postId]/
│   │   ├── route.ts                → GET, PATCH, DELETE
│   │   ├── reactions/route.ts      → POST (toggle reaction)
│   │   └── comments/
│   │       ├── route.ts            → GET (list), POST (create)
│   │       └── [commentId]/
│   │           ├── route.ts        → PATCH, DELETE
│   │           └── reactions/route.ts → POST (toggle)
│   └── ai-insights/route.ts        → GET (list shareable conversations)
│
├── gallery/route.ts                → GET (photos only)
└── feed/route.ts                   → GET (unified feed with filters)

/api/notifications/
├── route.ts                        → GET (list), PATCH (mark read)
└── unread-count/route.ts          → GET (badge count)

/api/saved-posts/
├── route.ts                        → GET (list saved), POST (save)
└── [postId]/route.ts              → DELETE (unsave)

/api/upload/photo/route.ts         → POST (R2 upload, returns URL)
```

### Key Endpoints

**Feed Loading** - `GET /api/farms/[farmId]/feed`
- Cursor-based pagination (not offset/limit)
- Query: `?cursor=<postId>&limit=20&type=all|photo|ai&zone=<zoneId>`
- Returns posts with user reaction status
- Includes author info (joined in query)

**Toggle Reaction** - `POST /api/farms/[farmId]/posts/[postId]/reactions`
- Idempotent toggle (add if not exists, remove if exists)
- Increments/decrements denormalized counter
- Creates notification for post author
- Returns new state for optimistic update sync

**Nested Comments** - `GET /api/farms/[farmId]/posts/[postId]/comments`
- Returns tree structure (not flat)
- Server builds nested hierarchy
- Max depth: 3 levels

---

## Component Architecture

### Zero External Dependencies

**State Management:**
- ✅ Built-in React hooks (useState, useEffect, useCallback, useRef)
- ✅ Next.js Server Components for initial data
- ✅ Browser fetch API for client updates
- ✅ Custom hooks for reusable logic
- ✅ Context API only if needed (e.g., notifications)
- ❌ NO Redux/Zustand/React Query

### Component Hierarchy

```
app/(app)/
├── gallery/
│   └── page.tsx                         → Gallery grid (server)
│
├── farm/[id]/
│   ├── page.tsx                         → Farm wrapper (server)
│   └── components/
│       ├── farm-feed-client.tsx         → Feed container (client)
│       ├── farm-header.tsx              → Cover, stats (server)
│       ├── farm-tabs.tsx                → Navigation tabs (client)
│       └── share-panel.tsx              → Create post FAB (client)
│
components/feed/
├── post-card.tsx                        → Individual post (client)
├── post-actions.tsx                     → Like/Comment/Share (client)
├── comment-section.tsx                  → Comments with nesting (client)
├── comment-form.tsx                     → New comment input (client)
├── reaction-button.tsx                  → Animated reactions (client)
├── media-lightbox.tsx                   → Photo viewer (client)
└── infinite-feed.tsx                    → Scroll container (client)

components/modals/
├── create-post-modal.tsx                → Write/upload posts (client)
└── share-ai-insight-modal.tsx           → Select conversation (client)

components/notifications/
├── notification-bell.tsx                → Header bell + badge (client)
└── notification-dropdown.tsx            → Notification list (client)
```

### Key Patterns

**Infinite Scroll** (Custom Hook)
```typescript
export function useInfiniteScroll({ onLoadMore, hasMore, loading }) {
  const observerRef = useRef<IntersectionObserver>();

  const lastElementRef = useCallback((node) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        onLoadMore();
      }
    });

    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, onLoadMore]);

  return { ref: lastElementRef };
}
```

**Optimistic Updates**
```typescript
const handleReaction = async (type: string) => {
  // 1. Update UI immediately
  setUserReaction(type);
  setReactionCount(prev => prev + 1);

  try {
    // 2. Send to server
    const res = await fetch('/api/...');
    const data = await res.json();

    // 3. Sync with server (in case of mismatch)
    setUserReaction(data.user_reaction);
    setReactionCount(data.new_count);
  } catch (error) {
    // 4. Rollback on error
    setUserReaction(null);
    setReactionCount(prev => prev - 1);
  }
};
```

---

## UX Details (Social Media Polish)

### Feed Experience

**Post Cards:**
- Full-width photos (no letterboxing)
- Author avatar + name + timestamp
- Content with markdown rendering
- Zone badges (pill shaped, colored)
- Engagement stats (reactions, comments, views)
- Action buttons (React, Comment, Share)

**Engagement Mechanics:**
- Double-tap photo to like (heart animation)
- Click reaction → emoji picker pops up
- Click comment → section expands inline
- Hover post → quick actions appear

**Infinite Scroll:**
- Skeleton loaders during fetch
- Pull-to-refresh on mobile
- Scroll-to-top button after scrolling
- "No more posts" indicator at end

### Content Creation

**Floating Action Button:**
- Always visible bottom-right
- Glowing green "+" icon
- Click → contextual menu appears
- Options: Write Update / Share Photos / Share AI Insight

**Post Creation Modal:**
- Rich text editor with formatting toolbar
- Drag-drop photo upload
- Photo preview thumbnails
- Zone selector (multi-select chips)
- Hashtag input with # autocomplete
- Character counter (soft limit)
- Auto-save to drafts
- Preview mode

**AI Insight Sharing:**
- List recent conversations
- Preview AI response
- Select what to share (question, response, screenshots, full thread)
- Add personal commentary
- One-click publish

### Comments

**Nested Threads:**
- Max depth: 3 levels
- Visual nesting with left border
- Reply button on each comment
- Edit window: 5 minutes
- Markdown support
- @ mentions with autocomplete

**Reactions on Comments:**
- Heart icon to like
- Show like count
- No emoji picker (simpler than posts)

### Notifications

**Bell Icon:**
- Red badge with unread count
- Click → dropdown appears
- Real-time updates via polling (30s interval)
- Mark all read button

**Notification Types:**
- Someone commented on your post
- Someone replied to your comment
- Someone reacted to your post/comment
- Someone mentioned you (@username)

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Database migration script
- Core API routes (posts, feed)
- Photo upload to R2
- Seed test data

### Phase 2: Feed & Viewing (Week 2)
- FarmFeedClient with infinite scroll
- PostCard component
- Gallery view (photo grid)
- Farm page header with tabs
- Enhanced gallery landing

### Phase 3: Engagement (Week 3)
- Reaction system with animations
- Comment section with nesting
- Comment form
- Notification system
- Real-time polling

### Phase 4: Content Creation (Week 4)
- SharePanel FAB
- Create post modal
- Photo upload flow
- AI insight sharing modal
- Draft auto-save

### Phase 5: Polish & Performance (Week 5)
- Optimistic updates everywhere
- Error handling + retry
- Loading states + skeletons
- Mobile responsive
- Accessibility (keyboard, ARIA)
- View tracking analytics

---

## Success Metrics

**Engagement:**
- % of public farms with ≥1 post
- Average posts per public farm
- Comments per post ratio
- Return visitor rate to gallery

**Content Quality:**
- % posts with photos (target: 60%+)
- % posts with AI insights (target: 30%+)
- Average post length (sweet spot: 100-300 chars)

**Community Growth:**
- New users from gallery discovery
- Farms marked public after posting
- Weekly active users

---

## Technical Decisions Summary

- ✅ Social feed approach (chronological storytelling)
- ✅ Owner posts + community discussion
- ✅ AI highlight posts (curated with commentary)
- ✅ Photos ARE posts (unified content model)
- ✅ Public = fully open + optional comment moderation
- ✅ Zero external dependencies (pure React + Next.js)
- ✅ Cursor-based pagination (infinite scroll)
- ✅ Denormalized counters (performance)
- ✅ Optimistic updates (instant feel)
- ✅ Server Components first (SEO + performance)

---

## Migration & Backward Compatibility

**Zero Breaking Changes:**
- All new tables (no schema changes to existing)
- All new routes (no conflicts)
- All new components (existing pages enhanced)

**Existing Data:**
- Farms already have `is_public` flag → no change
- AI conversations stay private until owner shares
- No existing posts → fresh start

**Enhancements to Existing Pages:**
- Gallery: Better cards, filters, stats
- Farm editor: Add SharePanel FAB
- AI chat: Add "Share to Feed" button

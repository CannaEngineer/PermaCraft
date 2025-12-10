# Community Gallery Enhancement Plan

This document outlines the implementation plan to transform the current community gallery into a professional social platform for permaculture enthusiasts. The plan addresses the top 5 improvements identified to reach the ideal UX vision.

## Current State Assessment

The gallery currently implements a basic chronological feed with post cards showing farm context, author information, content, and engagement features like reactions and comments. Key components include:

- `/app/(app)/gallery/page.tsx` - Main gallery page with universal search
- `/components/feed/global-feed-client.tsx` - Infinite scrolling feed client
- `/components/feed/post-card.tsx` - Individual post display
- `/components/feed/post-actions.tsx` - Engagement controls
- `/components/feed/comment-section.tsx` - Comment functionality
- Database tables: `farm_posts`, `post_comments`, `post_reactions`

## Implementation Plan

### Phase 1: Visual Enhancement and Layout Improvements

**Objective**: Transform the linear feed into an attractive, visually rich grid layout

#### Tasks:
1. **Create a responsive grid layout component**
   - Replace linear feed with masonry/grid layout
   - Implement responsive design for different screen sizes
   - Ensure proper aspect ratios for images and cards

2. **Enhance post previews**
   - Implement better image handling for farm screenshots and AI analyses
   - Add visual indicators for post types (AI insights, progress updates, etc.)
   - Improve typography and visual hierarchy

3. **Implement visual content optimization**
   - Add image loading optimization (lazy loading, blur placeholders)
   - Implement proper error handling for broken images
   - Add video support if needed

#### Estimated Timeline: 2-3 weeks

### Phase 2: Advanced Filtering and Discovery Features

**Objective**: Add comprehensive filtering capabilities to enable targeted discovery

#### Tasks:
1. **Design and implement filter UI**
   - Create filter sidebar with expandable sections
   - Implement multi-select filters for:
     - Climate zones
     - Farm size categories
     - Permaculture techniques
     - Featured species
     - Content types (AI insights, progress updates, harvest reports)

2. **Backend API enhancements**
   - Extend `/api/feed/global` to accept filter parameters
   - Add database indexes to support efficient filtering
   - Optimize queries for filtered results

3. **Search enhancement**
   - Expand universal search to work within filter context
   - Add auto-suggest for search terms
   - Improve search relevance algorithm

#### Estimated Timeline: 3-4 weeks

### Phase 3: Personalized Feed Algorithm

**Objective**: Implement algorithmic curation based on user preferences and behavior

#### Tasks:
1. **User preference collection**
   - Add interest selection during onboarding
   - Implement "like" or "follow" buttons for content types and users
   - Track user engagement patterns (time spent, interactions)

2. **Personalization algorithm**
   - Create content recommendation engine
   - Implement hybrid filtering (collaborative + content-based)
   - Add diversity algorithm to prevent filter bubbles

3. **Multiple feed options**
   - Maintain For You / Following / Trending tabs
   - Allow users to switch between feed types
   - Implement "Show me more like this" functionality

#### Estimated Timeline: 4-5 weeks

### Phase 4: Enhanced Content Creation Tools

**Objective**: Lower the barrier to content creation with better tools and templates

#### Tasks:
1. **Create dedicated post creation UI**
   - Move post creation out of farm editor context
   - Add post templates for common content types
   - Implement rich text editor for content
   - Add hashtag suggestions and trending tags

2. **Improved multimedia handling**
   - Add image upload and editing tools
   - Implement batch upload for multiple images
   - Add video upload capability
   - Add AI analysis integration for new posts

3. **Post scheduling and drafts**
   - Allow users to save posts as drafts
   - Add scheduling functionality
   - Add post publishing queue

#### Estimated Timeline: 3-4 weeks

### Phase 5: Creator Profiles and Social Features

**Objective**: Develop comprehensive profiles and connection features

#### Tasks:
1. **Creator profile pages**
   - Design comprehensive user profile pages
   - Show user's farms, posts, and contributions
   - Add user verification badges
   - Implement profile customization options

2. **Social connection features**
   - Add user following system (`user_follows` table)
   - Create following feed (separate from global feed)
   - Add user messaging system
   - Implement user badges/achievements system

3. **Community engagement features**
   - Add post bookmarking functionality
   - Create user collections/boards for saved posts
   - Add post sharing to external platforms
   - Implement report/block functionality

#### Estimated Timeline: 4-5 weeks

## Implementation Order and Dependencies

1. **Phase 1** (Visual layout) - Foundation for all visual improvements
2. **Phase 2** (Filtering) - Can be implemented in parallel with Phase 1
3. **Phase 4** (Content creation) - Independent, can run in parallel
4. **Phase 3** (Personalization) - Depends on user engagement data
5. **Phase 5** (Social features) - Can begin after Phase 1, with ongoing additions

## Database Schema Changes

New tables to be added:
```
user_follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  followed_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(follower_id, followed_id)
);

user_interests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  interest_type TEXT NOT NULL,  -- climate_zone, technique, species, etc.
  interest_value TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

bookmarked_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

content_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  preference_score REAL DEFAULT 0.0,  -- -1.0 to 1.0
  last_interaction_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, content_type)
);
```

## Technical Considerations

1. **Performance**: With increased personalization and filtering, implement proper database indexing and caching strategies
2. **Accessibility**: Ensure all new UI components meet WCAG standards
3. **Mobile-first**: Design responsive components that work well on all device sizes
4. **Privacy**: Implement proper privacy controls for personalization features
5. **Content moderation**: Plan for automated and manual content moderation as the community grows

## Success Metrics

- Increase in daily active users on the gallery
- Increase in content creation (posts per user)
- Improvement in engagement rates (comments, reactions per post)
- User satisfaction scores
- Time spent on gallery page
- Content discovery effectiveness (click-through rates on recommendations)

## Summary

This phased implementation plan transforms the current basic gallery into a professional social platform that encourages knowledge sharing and community building in permaculture. Each phase builds upon the previous work while delivering value to users incrementally. The plan prioritizes visual improvements and discovery features first, followed by personalization and deeper social features that will foster community growth.
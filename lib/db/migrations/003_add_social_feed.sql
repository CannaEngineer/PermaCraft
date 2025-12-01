-- Migration: Add Social Feed & Community Features
-- Date: 2025-01-19
-- Description: Tables for farm posts, comments, reactions, notifications

-- Farm Posts (unified content table)
CREATE TABLE IF NOT EXISTS farm_posts (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK(post_type IN ('text', 'photo', 'ai_insight')),

  -- Content
  content TEXT,
  media_urls TEXT, -- JSON array of photo/screenshot URLs

  -- AI Insight specific
  ai_conversation_id TEXT,
  ai_response_excerpt TEXT,

  -- Metadata
  tagged_zones TEXT, -- JSON array of zone IDs
  hashtags TEXT, -- JSON array of hashtags

  -- Engagement metrics (denormalized for performance)
  view_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  -- Status
  is_published INTEGER DEFAULT 1,
  is_draft INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ai_conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
);

-- Post Comments (nested with parent_id)
CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  parent_comment_id TEXT,
  author_id TEXT NOT NULL,

  content TEXT NOT NULL,

  -- Engagement
  reaction_count INTEGER DEFAULT 0,

  -- Moderation
  is_deleted INTEGER DEFAULT 0,
  is_flagged INTEGER DEFAULT 0,

  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Reactions (polymorphic: posts OR comments)
CREATE TABLE IF NOT EXISTS post_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  comment_id TEXT,
  user_id TEXT NOT NULL,

  reaction_type TEXT DEFAULT 'heart' CHECK(reaction_type IN ('heart', 'seedling', 'bulb', 'fire')),

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(post_id, user_id),
  UNIQUE(comment_id, user_id),

  -- Ensure either post_id or comment_id is set, never both
  CHECK((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))
);

-- User Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,

  notification_type TEXT NOT NULL CHECK(notification_type IN ('comment', 'reply', 'reaction', 'mention')),

  -- Polymorphic references
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
CREATE TABLE IF NOT EXISTS saved_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,

  UNIQUE(user_id, post_id)
);

-- Post Views (for analytics)
CREATE TABLE IF NOT EXISTS post_views (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT,

  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Performance

-- Post queries
CREATE INDEX IF NOT EXISTS idx_posts_farm_id ON farm_posts(farm_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON farm_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON farm_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_type ON farm_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_published ON farm_posts(is_published);

-- Comment queries
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON post_comments(created_at ASC);

-- Reaction queries
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON post_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON post_reactions(user_id);

-- Notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Saved posts queries
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);

-- View tracking
CREATE INDEX IF NOT EXISTS idx_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_views_user_id ON post_views(user_id);

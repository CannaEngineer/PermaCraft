-- Community Engagement Features Migration

-- Post Comments
CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  parent_comment_id TEXT,              -- For threaded replies
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id),
  FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_post ON post_comments(post_id, created_at DESC);
CREATE INDEX idx_comments_author ON post_comments(author_id);
CREATE INDEX idx_comments_parent ON post_comments(parent_comment_id);

-- Post Reactions (likes, loves, etc.)
CREATE TABLE IF NOT EXISTS post_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK(reaction_type IN ('like', 'love', 'insightful', 'inspiring')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(post_id, user_id)             -- One reaction per user per post
);

CREATE INDEX idx_reactions_post ON post_reactions(post_id);
CREATE INDEX idx_reactions_user ON post_reactions(user_id);
CREATE INDEX idx_reactions_type ON post_reactions(reaction_type);

-- Farm Follows (subscribe to other farms)
CREATE TABLE IF NOT EXISTS farm_follows (
  id TEXT PRIMARY KEY,
  follower_user_id TEXT NOT NULL,
  followed_farm_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (follower_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followed_farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  UNIQUE(follower_user_id, followed_farm_id)
);

CREATE INDEX idx_follows_follower ON farm_follows(follower_user_id);
CREATE INDEX idx_follows_farm ON farm_follows(followed_farm_id);

-- Curated Collections
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  curator_id TEXT,                     -- NULL for platform collections
  is_featured INTEGER DEFAULT 0,       -- Featured on homepage
  is_public INTEGER DEFAULT 1,
  cover_image_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (curator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_collections_featured ON collections(is_featured DESC, created_at DESC);
CREATE INDEX idx_collections_curator ON collections(curator_id);

-- Collection Items (farms in collections)
CREATE TABLE IF NOT EXISTS collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  farm_id TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  curator_note TEXT,                   -- Why this farm is in the collection
  added_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  UNIQUE(collection_id, farm_id)
);

CREATE INDEX idx_collection_items_collection ON collection_items(collection_id, display_order);
CREATE INDEX idx_collection_items_farm ON collection_items(farm_id);

-- Post Saves/Bookmarks
CREATE TABLE IF NOT EXISTS post_saves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  UNIQUE(user_id, post_id)
);

CREATE INDEX idx_post_saves_user ON post_saves(user_id, created_at DESC);
CREATE INDEX idx_post_saves_post ON post_saves(post_id);

-- Post Views (engagement tracking)
CREATE TABLE IF NOT EXISTS post_views (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  viewer_user_id TEXT,                 -- NULL for anonymous
  viewer_ip TEXT,                      -- For rate limiting
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (viewer_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_post_views_post ON post_views(post_id);
CREATE INDEX idx_post_views_user ON post_views(viewer_user_id);
CREATE INDEX idx_post_views_ip ON post_views(viewer_ip, created_at DESC);

-- Social Shares (tracking for analytics)
CREATE TABLE IF NOT EXISTS post_shares (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT,                        -- NULL for anonymous
  platform TEXT NOT NULL CHECK(platform IN ('twitter', 'facebook', 'pinterest', 'reddit', 'copy_link')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (post_id) REFERENCES farm_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_post_shares_post ON post_shares(post_id);
CREATE INDEX idx_post_shares_platform ON post_shares(platform);

-- Update farm_posts table with engagement counters (for performance)
ALTER TABLE farm_posts ADD COLUMN comment_count INTEGER DEFAULT 0;
ALTER TABLE farm_posts ADD COLUMN reaction_count INTEGER DEFAULT 0;
ALTER TABLE farm_posts ADD COLUMN save_count INTEGER DEFAULT 0;
ALTER TABLE farm_posts ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE farm_posts ADD COLUMN share_count INTEGER DEFAULT 0;

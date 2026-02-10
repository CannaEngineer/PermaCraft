-- Blog Topic Queue
-- Stores AI-discovered blog topics to avoid querying LLM on every generation

CREATE TABLE IF NOT EXISTS blog_topic_queue (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  keywords TEXT NOT NULL, -- JSON array of keywords
  target_audience TEXT NOT NULL, -- 'beginners', 'intermediate', 'advanced'
  seo_angle TEXT,
  why_trending TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'used', 'skipped'
  priority INTEGER DEFAULT 0, -- Higher priority topics used first
  created_at INTEGER DEFAULT (unixepoch()),
  used_at INTEGER,
  used_by_post_id TEXT,
  FOREIGN KEY (used_by_post_id) REFERENCES blog_posts(id) ON DELETE SET NULL
);

-- Index for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_blog_topic_queue_status_priority
  ON blog_topic_queue(status, priority DESC, created_at);

-- Index for finding used topics by post
CREATE INDEX IF NOT EXISTS idx_blog_topic_queue_used_by_post
  ON blog_topic_queue(used_by_post_id);

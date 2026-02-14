CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  feature_id TEXT,
  feature_type TEXT CHECK(feature_type IN ('zone', 'planting', 'line', 'general')),
  content TEXT NOT NULL,
  parent_comment_id TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_farm ON comments(farm_id);
CREATE INDEX IF NOT EXISTS idx_comments_feature ON comments(feature_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON comments(resolved);

-- feature_id can be null for general farm comments
-- parent_comment_id enables threaded replies

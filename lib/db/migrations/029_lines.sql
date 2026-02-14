CREATE TABLE IF NOT EXISTS lines (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  geometry TEXT NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'custom',
  label TEXT,
  style TEXT NOT NULL,
  layer_ids TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_lines_farm ON lines(farm_id);
CREATE INDEX IF NOT EXISTS idx_lines_type ON lines(line_type);

-- Add layer_ids to lines for Track 1 integration
-- (This enables layer filtering for lines)

-- Farm Journal Entries Table
CREATE TABLE IF NOT EXISTS farm_journal_entries (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  entry_date INTEGER NOT NULL,          -- User-specified date (can backdate)
  title TEXT,                           -- Optional short title
  content TEXT NOT NULL,                -- Rich text content
  media_urls TEXT,                      -- JSON array of photo URLs
  weather TEXT,                         -- Optional weather notes
  tags TEXT,                            -- JSON array: ['planting', 'harvest', etc.]
  is_shared_to_community INTEGER DEFAULT 0,  -- Optional public sharing
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_journal_farm_date
  ON farm_journal_entries(farm_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_author
  ON farm_journal_entries(author_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_shared
  ON farm_journal_entries(is_shared_to_community, created_at DESC);

-- Species Community: Tips, edits, and wiki contributions

CREATE TABLE IF NOT EXISTS species_tips (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  upvote_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  is_approved INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS species_tip_votes (
  id TEXT PRIMARY KEY,
  tip_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'report')),
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (tip_id) REFERENCES species_tips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(tip_id, user_id)
);

CREATE TABLE IF NOT EXISTS species_content_edits (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  original_value TEXT,
  proposed_value TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,
  reviewed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_species_tips_species ON species_tips(species_id, is_approved, upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_species_tip_votes_tip ON species_tip_votes(tip_id);
CREATE INDEX IF NOT EXISTS idx_species_content_edits_species ON species_content_edits(species_id, status);

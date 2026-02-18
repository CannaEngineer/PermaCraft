-- Species Videos: YouTube video curation for plant learning
CREATE TABLE IF NOT EXISTS species_videos (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_name TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  is_featured INTEGER DEFAULT 0,
  relevance_score INTEGER DEFAULT 0,
  added_by TEXT,
  approved INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_species_videos_species ON species_videos(species_id);
CREATE INDEX IF NOT EXISTS idx_species_videos_featured ON species_videos(species_id, is_featured DESC);

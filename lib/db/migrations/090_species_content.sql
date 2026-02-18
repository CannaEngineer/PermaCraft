-- Species Content: AI-generated narratives and growing guides
CREATE TABLE IF NOT EXISTS species_content (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL UNIQUE,
  narrative_summary TEXT,
  narrative_full TEXT,
  growing_guide TEXT,
  growing_guide_summary TEXT,
  ai_model_used TEXT,
  generated_at INTEGER,
  last_edited_at INTEGER,
  edit_count INTEGER DEFAULT 0,
  quality_score INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_species_content_species ON species_content(species_id);
CREATE INDEX IF NOT EXISTS idx_species_content_quality ON species_content(quality_score DESC);

-- Farm Story Sections
-- Allows farm owners to build a scrolling narrative story page for their farm.

CREATE TABLE IF NOT EXISTS farm_story_sections (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  section_type TEXT NOT NULL CHECK(section_type IN (
    'hero','origin','values','the_land','what_we_grow','seasons','visit_us','custom'
  )),
  title TEXT NOT NULL,
  content TEXT,
  media_url TEXT,
  media_urls TEXT,               -- JSON array
  ai_generated INTEGER DEFAULT 0,
  ai_model TEXT,
  is_visible INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  metadata TEXT,                 -- JSON for section-specific data
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_story_sections_farm
  ON farm_story_sections(farm_id, display_order ASC);

ALTER TABLE farms ADD COLUMN story_published INTEGER DEFAULT 0;
ALTER TABLE farms ADD COLUMN story_theme TEXT DEFAULT 'earth';
ALTER TABLE farms ADD COLUMN story_generated_at INTEGER;

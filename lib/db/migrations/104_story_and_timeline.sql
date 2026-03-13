-- Story & Timeline entries for the Map Editor UX Streamline
-- Story entries: private farm journal, auto-populated from real activity
-- Timeline entries: operational calendar for crop plans, tasks, phases

CREATE TABLE IF NOT EXISTS story_entries (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('task', 'milestone', 'phase', 'manual')),
  content TEXT NOT NULL,
  photo_url TEXT,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published')),
  entry_date INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS timeline_entries (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  entry_date INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('crop_plan', 'task', 'phase', 'manual')),
  source_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_story_entries_farm ON story_entries(farm_id);
CREATE INDEX IF NOT EXISTS idx_story_entries_status ON story_entries(farm_id, status);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_farm ON timeline_entries(farm_id);
CREATE INDEX IF NOT EXISTS idx_timeline_entries_date ON timeline_entries(farm_id, entry_date);

-- Add completion_note to tasks (runner skips on "already exists" error)
ALTER TABLE tasks ADD COLUMN completion_note TEXT;

-- Add new crop_plan columns (runner skips on "already exists" error)
ALTER TABLE crop_plans ADD COLUMN zone_id TEXT REFERENCES zones(id) ON DELETE SET NULL;
ALTER TABLE crop_plans ADD COLUMN start_date INTEGER;
ALTER TABLE crop_plans ADD COLUMN end_date INTEGER;
ALTER TABLE crop_plans ADD COLUMN variety TEXT;
ALTER TABLE crop_plans ADD COLUMN expected_yield TEXT;

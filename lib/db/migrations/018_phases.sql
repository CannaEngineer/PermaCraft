CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date INTEGER,
  end_date INTEGER,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_phases_farm ON phases(farm_id);
CREATE INDEX IF NOT EXISTS idx_phases_order ON phases(display_order);

-- Add phase_id to zones, plantings, and lines
ALTER TABLE zones ADD COLUMN phase_id TEXT;
ALTER TABLE plantings ADD COLUMN phase_id TEXT;

-- Note: lines table from Track 2 not yet merged, will need ALTER TABLE lines ADD COLUMN phase_id TEXT when Track 2 is merged

-- Example phases:
-- "Year 1: Infrastructure" (paths, ponds, fences)
-- "Year 2: Windbreaks & Guilds" (perimeter trees, first guilds)
-- "Year 3: Annual Production" (gardens, annual crops)

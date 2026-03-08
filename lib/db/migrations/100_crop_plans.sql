-- Crop & Production Planning System
-- Closes HIGH PRIORITY gap: Structured crop planning with calendars and harvest tracking

CREATE TABLE IF NOT EXISTS crop_plans (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  name TEXT NOT NULL,
  season TEXT NOT NULL, -- 'spring', 'summer', 'fall', 'winter', 'year-round'
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crop_plan_items (
  id TEXT PRIMARY KEY,
  crop_plan_id TEXT NOT NULL,
  species_id TEXT,
  variety_id TEXT,
  zone_id TEXT,
  name TEXT NOT NULL, -- Display name (species common name or custom)
  planned_sow_date INTEGER, -- Unix epoch
  planned_transplant_date INTEGER,
  planned_harvest_date INTEGER,
  quantity REAL,
  unit TEXT, -- 'plants', 'seeds', 'rows', 'beds', 'sq_ft', 'lbs'
  expected_yield REAL,
  expected_yield_unit TEXT, -- 'lbs', 'bushels', 'bunches', 'heads'
  actual_yield REAL,
  actual_yield_unit TEXT,
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'sown', 'transplanted', 'growing', 'harvesting', 'done'
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (crop_plan_id) REFERENCES crop_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS harvest_logs (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  crop_plan_item_id TEXT,
  planting_id TEXT,
  species_id TEXT,
  harvest_date INTEGER NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL, -- 'lbs', 'oz', 'bushels', 'bunches', 'heads', 'pieces'
  quality_rating INTEGER, -- 1-5
  notes TEXT,
  photo_url TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (crop_plan_item_id) REFERENCES crop_plan_items(id) ON DELETE SET NULL,
  FOREIGN KEY (planting_id) REFERENCES plantings(id) ON DELETE SET NULL,
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_crop_plans_farm ON crop_plans(farm_id);
CREATE INDEX IF NOT EXISTS idx_crop_plan_items_plan ON crop_plan_items(crop_plan_id);
CREATE INDEX IF NOT EXISTS idx_harvest_logs_farm ON harvest_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_harvest_logs_date ON harvest_logs(farm_id, harvest_date);

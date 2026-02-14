-- Custom Imagery for Farms
-- Stores uploaded drone orthomosaics and property maps
-- Processing pipeline: upload → tile → display on map

CREATE TABLE IF NOT EXISTS custom_imagery (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  source_url TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK(processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  tile_url_template TEXT,
  bounds TEXT NOT NULL,
  alignment_corners TEXT,
  opacity REAL NOT NULL DEFAULT 1.0,
  visible INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_custom_imagery_farm ON custom_imagery(farm_id);
CREATE INDEX IF NOT EXISTS idx_custom_imagery_status ON custom_imagery(processing_status);

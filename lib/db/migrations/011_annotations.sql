-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  feature_id TEXT NOT NULL,
  feature_type TEXT NOT NULL CHECK(feature_type IN ('zone', 'planting', 'line')),
  design_rationale TEXT NOT NULL,
  rich_notes TEXT,
  tags TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  created_by TEXT NOT NULL,
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_annotations_farm_feature
  ON annotations(farm_id, feature_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_annotations_created
  ON annotations(farm_id, created_at DESC);

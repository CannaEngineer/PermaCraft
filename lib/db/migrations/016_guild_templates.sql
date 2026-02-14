CREATE TABLE IF NOT EXISTS guild_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  climate_zones TEXT,
  focal_species_id TEXT NOT NULL,
  companion_species TEXT NOT NULL,
  spacing_rules TEXT,
  benefits TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (focal_species_id) REFERENCES species(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_guild_templates_focal ON guild_templates(focal_species_id);
CREATE INDEX IF NOT EXISTS idx_guild_templates_public ON guild_templates(is_public);

-- climate_zones: JSON ["5a", "5b", "6a", "6b"]
-- companion_species: JSON [{"species_id":"...", "layer":"understory", "min_distance_feet":3, "max_distance_feet":10, "count":3}]
-- spacing_rules: JSON {"canopy_radius_feet":15, "understory_radius_feet":8}
-- benefits: JSON ["nitrogen_fixation", "pest_control", "pollinator_attraction"]

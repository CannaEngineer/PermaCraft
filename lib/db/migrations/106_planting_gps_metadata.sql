-- 106_planting_gps_metadata.sql
-- Adds GPS provenance, varieties, sub-varieties, and custom-species ownership.
--
-- Goals:
--   1. Persist the variety/cultivar selected when planting (the picker existed,
--      but the selection was silently dropped on save).
--   2. Allow varieties to nest (e.g., Chestnut species → "Colossal" variety →
--      a specific sub-selection within "Colossal") via parent_variety_id.
--   3. Persist GPS metadata captured at placement time (accuracy / altitude /
--      method) so users have an audit trail of how precise each pin is.
--   4. Allow user-contributed species not present in the global catalog,
--      scoped either to a single farm or shared across the user's farms.
--
-- Note: SQLite ALTER TABLE ADD COLUMN does not support inline FOREIGN KEY
-- constraints, so all references below are enforced at the application layer.

-- ─── plantings: variety + GPS provenance ─────────────────────────────────────

ALTER TABLE plantings ADD COLUMN variety_id TEXT;
ALTER TABLE plantings ADD COLUMN placement_accuracy_meters REAL;
ALTER TABLE plantings ADD COLUMN placement_altitude_meters REAL;
ALTER TABLE plantings ADD COLUMN placement_method TEXT; -- 'gps' | 'map_click' | 'manual' | 'imported'
ALTER TABLE plantings ADD COLUMN placement_recorded_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_plantings_variety_id ON plantings(variety_id);

-- ─── plant_varieties: hierarchical sub-varieties + custom user entries ───────

ALTER TABLE plant_varieties ADD COLUMN parent_variety_id TEXT;
ALTER TABLE plant_varieties ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plant_varieties ADD COLUMN farm_id TEXT;

CREATE INDEX IF NOT EXISTS idx_varieties_parent ON plant_varieties(parent_variety_id);
CREATE INDEX IF NOT EXISTS idx_varieties_farm ON plant_varieties(farm_id);

-- ─── species: custom user-contributed plants ────────────────────────────────

ALTER TABLE species ADD COLUMN created_by_user_id TEXT;
ALTER TABLE species ADD COLUMN farm_id TEXT;
ALTER TABLE species ADD COLUMN is_custom INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_species_created_by ON species(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_species_farm ON species(farm_id);
CREATE INDEX IF NOT EXISTS idx_species_custom ON species(is_custom);

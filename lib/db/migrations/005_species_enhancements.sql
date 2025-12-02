-- Add permaculture and geographic fields to species table
ALTER TABLE species ADD COLUMN permaculture_functions TEXT;
ALTER TABLE species ADD COLUMN companion_plants TEXT;
ALTER TABLE species ADD COLUMN zone_placement_notes TEXT;
ALTER TABLE species ADD COLUMN edible_parts TEXT;
ALTER TABLE species ADD COLUMN sourcing_notes TEXT;
ALTER TABLE species ADD COLUMN broad_regions TEXT;
ALTER TABLE species ADD COLUMN min_hardiness_zone TEXT;
ALTER TABLE species ADD COLUMN max_hardiness_zone TEXT;
ALTER TABLE species ADD COLUMN min_rainfall_inches REAL;
ALTER TABLE species ADD COLUMN max_rainfall_inches REAL;
ALTER TABLE species ADD COLUMN ai_generated INTEGER DEFAULT 0;

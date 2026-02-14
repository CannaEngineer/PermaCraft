-- Add layer_ids column to zones
ALTER TABLE zones ADD COLUMN layer_ids TEXT;

-- Add layer_ids column to plantings
ALTER TABLE plantings ADD COLUMN layer_ids TEXT;

-- Note: Lines table doesn't exist yet (Track 2), will add when created

-- Add boundary and acres columns to practice_farms
-- Created: 2025-12-16

-- Add acres column
ALTER TABLE practice_farms ADD COLUMN acres REAL;

-- Add boundary_geometry column
ALTER TABLE practice_farms ADD COLUMN boundary_geometry TEXT;

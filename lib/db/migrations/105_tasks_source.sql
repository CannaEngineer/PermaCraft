-- Add source column to existing tasks table for dashboard intelligence
ALTER TABLE tasks ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

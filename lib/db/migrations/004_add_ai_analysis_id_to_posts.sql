-- Migration: Add AI Analysis ID to Posts
-- Date: 2025-12-01
-- Description: Track specific AI analysis/message for AI insight posts to display correct screenshot

ALTER TABLE farm_posts ADD COLUMN ai_analysis_id TEXT;

-- Add foreign key constraint (SQLite doesn't support adding FK after creation, so this is a comment for reference)
-- FOREIGN KEY (ai_analysis_id) REFERENCES ai_analyses(id) ON DELETE SET NULL

-- Add index for querying
CREATE INDEX IF NOT EXISTS idx_posts_ai_analysis_id ON farm_posts(ai_analysis_id);

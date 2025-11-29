-- Migration: Add AI Conversations and update AI Analyses table
-- Date: 2025-11-29

-- Create AI Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  title TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- Create index for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_farm_id ON ai_conversations(farm_id);

-- Add new columns to ai_analyses table
-- SQLite doesn't support ALTER TABLE ADD COLUMN with FOREIGN KEY in one statement
-- So we'll add columns first, then create a new table with constraints if needed

-- Add conversation_id column
ALTER TABLE ai_analyses ADD COLUMN conversation_id TEXT;

-- Add screenshot_data column
ALTER TABLE ai_analyses ADD COLUMN screenshot_data TEXT;

-- Add map_layer column
ALTER TABLE ai_analyses ADD COLUMN map_layer TEXT;

-- Add zones_context column
ALTER TABLE ai_analyses ADD COLUMN zones_context TEXT;

-- Create index for conversation_id
CREATE INDEX IF NOT EXISTS idx_analyses_conversation_id ON ai_analyses(conversation_id);

-- Note: The snapshot_ids column is now deprecated in favor of screenshot_data
-- but we'll keep it for backward compatibility

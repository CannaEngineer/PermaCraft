-- Migration: Make farm_id nullable on ai_conversations and ai_analyses
-- Adds user_id and conversation_type to ai_conversations for site-wide AI assistant
-- Date: 2026-02-20

-- Step 1: Recreate ai_conversations with nullable farm_id and new columns
CREATE TABLE IF NOT EXISTS ai_conversations_new (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  user_id TEXT NOT NULL,
  conversation_type TEXT NOT NULL DEFAULT 'general',
  title TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE
);

-- Copy existing data, deriving user_id from farms.user_id
INSERT INTO ai_conversations_new (id, farm_id, user_id, conversation_type, title, created_at, updated_at)
SELECT
  ac.id,
  ac.farm_id,
  f.user_id,
  'farm',
  ac.title,
  ac.created_at,
  ac.updated_at
FROM ai_conversations ac
JOIN farms f ON ac.farm_id = f.id;

-- Drop old table and rename
DROP TABLE IF EXISTS ai_conversations;
ALTER TABLE ai_conversations_new RENAME TO ai_conversations;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_conversations_farm_id ON ai_conversations(farm_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON ai_conversations(conversation_type);

-- Step 2: Recreate ai_analyses with nullable farm_id
CREATE TABLE IF NOT EXISTS ai_analyses_new (
  id TEXT PRIMARY KEY,
  farm_id TEXT,
  conversation_id TEXT,
  user_query TEXT NOT NULL,
  screenshot_data TEXT,
  map_layer TEXT,
  zones_context TEXT,
  ai_response TEXT NOT NULL,
  model TEXT,
  generated_image_url TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

-- Copy existing data
INSERT INTO ai_analyses_new (id, farm_id, conversation_id, user_query, screenshot_data, map_layer, zones_context, ai_response, model, generated_image_url, created_at)
SELECT id, farm_id, conversation_id, user_query, screenshot_data, map_layer, zones_context, ai_response, model, generated_image_url, created_at
FROM ai_analyses;

-- Drop old table and rename
DROP TABLE IF EXISTS ai_analyses;
ALTER TABLE ai_analyses_new RENAME TO ai_analyses;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_analyses_conversation_id ON ai_analyses(conversation_id);
CREATE INDEX IF NOT EXISTS idx_analyses_farm_id ON ai_analyses(farm_id);

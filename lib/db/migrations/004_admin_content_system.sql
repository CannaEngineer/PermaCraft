-- Admin Content Generation System Migration
-- Created: 2026-02-09

-- Add admin flag to users table
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

-- Content generations tracking table
CREATE TABLE IF NOT EXISTS content_generations (
  id TEXT PRIMARY KEY,
  lesson_id TEXT,
  topic_id TEXT NOT NULL,
  generated_by_user_id TEXT NOT NULL,
  input_prompt TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  raw_output TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'rejected')),
  edited_output TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (generated_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

-- Lesson versions for tracking edits
CREATE TABLE IF NOT EXISTS lesson_versions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  edited_by_user_id TEXT NOT NULL,
  change_notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (edited_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_generations_user ON content_generations(generated_by_user_id);
CREATE INDEX IF NOT EXISTS idx_content_generations_status ON content_generations(status);
CREATE INDEX IF NOT EXISTS idx_content_generations_topic ON content_generations(topic_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_lesson ON lesson_versions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_versions_user ON lesson_versions(edited_by_user_id);
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);

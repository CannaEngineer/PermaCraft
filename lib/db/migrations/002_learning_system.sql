-- Learning System Tables Migration
-- Created: 2025-12-15

-- ============================================
-- PART 1: CREATE ALL TABLES
-- ============================================

-- Learning Paths
CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  estimated_lessons INTEGER NOT NULL,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  icon_name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Topics
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('text', 'interactive', 'video', 'mixed')),
  estimated_minutes INTEGER NOT NULL,
  difficulty TEXT NOT NULL CHECK(difficulty IN ('beginner', 'intermediate', 'advanced')),
  prerequisite_lesson_ids TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- Path Lessons (Many-to-Many)
CREATE TABLE IF NOT EXISTS path_lessons (
  id TEXT PRIMARY KEY,
  learning_path_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  is_required INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE(learning_path_id, lesson_id)
);

-- Learning Path Topics (Many-to-Many)
CREATE TABLE IF NOT EXISTS learning_path_topics (
  id TEXT PRIMARY KEY,
  learning_path_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  emphasis_level TEXT NOT NULL CHECK(emphasis_level IN ('core', 'supplementary', 'optional')),
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE(learning_path_id, topic_id)
);

-- User Progress
CREATE TABLE IF NOT EXISTS user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  learning_path_id TEXT,
  current_level INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE SET NULL
);

-- Lesson Completions
CREATE TABLE IF NOT EXISTS lesson_completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_at INTEGER DEFAULT (unixepoch()),
  xp_earned INTEGER NOT NULL,
  quiz_score INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE(user_id, lesson_id)
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  badge_type TEXT NOT NULL CHECK(badge_type IN ('foundation', 'mastery', 'path_completion')),
  tier INTEGER NOT NULL,
  unlock_criteria TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- User Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  UNIQUE(user_id, badge_id)
);

-- Practice Farms
CREATE TABLE IF NOT EXISTS practice_farms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  zoom_level REAL NOT NULL,
  ai_grade INTEGER,
  ai_feedback TEXT,
  submitted_for_review INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

-- Practice Zones
CREATE TABLE IF NOT EXISTS practice_zones (
  id TEXT PRIMARY KEY,
  practice_farm_id TEXT NOT NULL,
  name TEXT,
  zone_type TEXT NOT NULL,
  geometry TEXT NOT NULL,
  properties TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (practice_farm_id) REFERENCES practice_farms(id) ON DELETE CASCADE
);

-- Practice Plantings
CREATE TABLE IF NOT EXISTS practice_plantings (
  id TEXT PRIMARY KEY,
  practice_farm_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  name TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  planted_year INTEGER,
  current_year INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (practice_farm_id) REFERENCES practice_farms(id) ON DELETE CASCADE,
  FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE CASCADE
);

-- Contextual Hints
CREATE TABLE IF NOT EXISTS contextual_hints (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('first_zone', 'first_planting', 'water_feature', 'ai_analysis', 'help_icon')),
  lesson_id TEXT NOT NULL,
  hint_text TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- User Hint Dismissals
CREATE TABLE IF NOT EXISTS user_hint_dismissals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hint_id TEXT NOT NULL,
  dismissed_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hint_id) REFERENCES contextual_hints(id) ON DELETE CASCADE,
  UNIQUE(user_id, hint_id)
);

-- AI Tutor Conversations
CREATE TABLE IF NOT EXISTS ai_tutor_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  messages TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- ============================================
-- PART 2: CREATE ALL INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lessons_topic ON lessons(topic_id);
CREATE INDEX IF NOT EXISTS idx_lessons_slug ON lessons(slug);
CREATE INDEX IF NOT EXISTS idx_path_lessons_path ON path_lessons(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_path_lessons_lesson ON path_lessons(lesson_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_topics_path ON learning_path_topics(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_topics_topic ON learning_path_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_path ON user_progress(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson ON lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_badges_tier ON badges(tier);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_practice_farms_user ON practice_farms(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_farms_lesson ON practice_farms(lesson_id);
CREATE INDEX IF NOT EXISTS idx_practice_zones_farm ON practice_zones(practice_farm_id);
CREATE INDEX IF NOT EXISTS idx_practice_plantings_farm ON practice_plantings(practice_farm_id);
CREATE INDEX IF NOT EXISTS idx_practice_plantings_species ON practice_plantings(species_id);
CREATE INDEX IF NOT EXISTS idx_contextual_hints_trigger ON contextual_hints(trigger_type);
CREATE INDEX IF NOT EXISTS idx_contextual_hints_lesson ON contextual_hints(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_hint_dismissals_user ON user_hint_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_conversations_user ON ai_tutor_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_conversations_lesson ON ai_tutor_conversations(lesson_id);

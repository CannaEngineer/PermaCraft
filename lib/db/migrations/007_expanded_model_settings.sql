-- Expanded Model Settings for All AI Tasks

-- Drop existing table if we're updating the schema
DROP TABLE IF EXISTS model_settings;

-- Create comprehensive model settings table
CREATE TABLE IF NOT EXISTS model_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',

  -- Blog Generation Models
  blog_text_model TEXT NOT NULL DEFAULT 'x-ai/grok-4.1-fast',
  blog_image_prompt_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-lite',
  blog_image_generation_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-image',

  -- Lesson Generation Models
  lesson_generation_model TEXT NOT NULL DEFAULT 'x-ai/grok-4.1-fast',

  -- AI Tutor (Conversational)
  ai_tutor_model TEXT NOT NULL DEFAULT 'x-ai/grok-4.1-fast',

  -- Map Analysis (Vision)
  map_analysis_vision_model TEXT NOT NULL DEFAULT 'meta-llama/llama-3.2-90b-vision-instruct:free',
  map_analysis_fallback_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-lite',

  -- Sketch Generation
  sketch_instruction_model TEXT NOT NULL DEFAULT 'google/gemini-flash-1.5',
  sketch_image_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-image',

  -- Practice Farm Feedback
  practice_feedback_model TEXT NOT NULL DEFAULT 'x-ai/grok-4.1-fast',

  -- Lesson Personalization
  lesson_personalization_model TEXT NOT NULL DEFAULT 'x-ai/grok-4.1-fast',

  -- Metadata
  updated_at INTEGER DEFAULT (unixepoch()),
  updated_by TEXT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT OR REPLACE INTO model_settings (
  id,
  blog_text_model,
  blog_image_prompt_model,
  blog_image_generation_model,
  lesson_generation_model,
  ai_tutor_model,
  map_analysis_vision_model,
  map_analysis_fallback_model,
  sketch_instruction_model,
  sketch_image_model,
  practice_feedback_model,
  lesson_personalization_model
) VALUES (
  'default',
  'x-ai/grok-4.1-fast',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.5-flash-image',
  'x-ai/grok-4.1-fast',
  'x-ai/grok-4.1-fast',
  'meta-llama/llama-3.2-90b-vision-instruct:free',
  'google/gemini-2.5-flash-lite',
  'google/gemini-flash-1.5',
  'google/gemini-2.5-flash-image',
  'x-ai/grok-4.1-fast',
  'x-ai/grok-4.1-fast'
);

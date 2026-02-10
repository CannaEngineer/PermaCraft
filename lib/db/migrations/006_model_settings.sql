-- Model Settings Configuration

CREATE TABLE IF NOT EXISTS model_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  text_model TEXT NOT NULL DEFAULT 'x-ai/grok-4.1-fast',
  image_prompt_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-lite',
  image_generation_model TEXT NOT NULL DEFAULT 'openai/dall-e-3',
  updated_at INTEGER DEFAULT (unixepoch()),
  updated_by TEXT,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT OR IGNORE INTO model_settings (id, text_model, image_prompt_model, image_generation_model)
VALUES ('default', 'x-ai/grok-4.1-fast', 'google/gemini-2.5-flash-lite', 'openai/dall-e-3');

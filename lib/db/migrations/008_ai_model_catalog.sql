-- AI Model Catalog
-- Stores available AI models that can be selected in settings

CREATE TABLE IF NOT EXISTS ai_model_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'text', 'vision', 'image_generation', 'image_prompt'
  cost_per_1k_tokens TEXT,
  cost_description TEXT, -- Human readable like "$0.002 per request" or "Free"
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(model_id, category) -- Same model can be used for different purposes
);

-- Insert default models

-- Text Models
INSERT OR IGNORE INTO ai_model_catalog (id, name, provider, model_id, category, cost_description, description) VALUES
  ('model_grok_4_1_fast', 'Grok 4.1 Fast', 'X.AI', 'x-ai/grok-4.1-fast', 'text', '$0.002 per 1k tokens', 'Fast and cheap text generation, great for most tasks'),
  ('model_grok_2', 'Grok 2', 'X.AI', 'x-ai/grok-2-1212', 'text', '$0.01 per 1k tokens', 'More capable Grok model'),
  ('model_claude_sonnet', 'Claude 3.5 Sonnet', 'Anthropic', 'anthropic/claude-3.5-sonnet', 'text', '$0.20 per 1k tokens', 'Premium text generation with excellent reasoning'),
  ('model_gpt_4o', 'GPT-4o', 'OpenAI', 'openai/gpt-4o', 'text', '$0.15 per 1k tokens', 'Powerful multimodal model'),
  ('model_gpt_4o_mini', 'GPT-4o Mini', 'OpenAI', 'openai/gpt-4o-mini', 'text', '$0.02 per 1k tokens', 'Smaller, faster GPT-4o variant'),
  ('model_llama_90b', 'Llama 3.2 90B', 'Meta', 'meta-llama/llama-3.2-90b-vision-instruct:free', 'text', 'Free', 'Free open-source model');

-- Vision Models
INSERT OR IGNORE INTO ai_model_catalog (id, name, provider, model_id, category, cost_description, description) VALUES
  ('model_llama_90b_vision', 'Llama 3.2 90B Vision', 'Meta', 'meta-llama/llama-3.2-90b-vision-instruct:free', 'vision', 'Free', 'Free vision model for image analysis'),
  ('model_gemini_flash_lite', 'Gemini 2.5 Flash Lite', 'Google', 'google/gemini-2.5-flash-lite', 'vision', '$0.001 per 1k tokens', 'Fast and cheap vision model'),
  ('model_gemini_flash_1_5', 'Gemini Flash 1.5', 'Google', 'google/gemini-flash-1.5', 'vision', '$0.001 per 1k tokens', 'Fast vision processing'),
  ('model_gpt_4o_vision', 'GPT-4o Vision', 'OpenAI', 'openai/gpt-4o', 'vision', '$0.15 per 1k tokens', 'Premium vision analysis');

-- Image Prompt Models
INSERT OR IGNORE INTO ai_model_catalog (id, name, provider, model_id, category, cost_description, description) VALUES
  ('model_gemini_flash_lite_prompt', 'Gemini 2.5 Flash Lite', 'Google', 'google/gemini-2.5-flash-lite', 'image_prompt', '$0.001 per 1k tokens', 'Fast prompt generation'),
  ('model_grok_4_1_fast_prompt', 'Grok 4.1 Fast', 'X.AI', 'x-ai/grok-4.1-fast', 'image_prompt', '$0.002 per 1k tokens', 'Quick prompt creation'),
  ('model_gpt_4o_mini_prompt', 'GPT-4o Mini', 'OpenAI', 'openai/gpt-4o-mini', 'image_prompt', '$0.02 per 1k tokens', 'Detailed prompt generation');

-- Image Generation Models
INSERT OR IGNORE INTO ai_model_catalog (id, name, provider, model_id, category, cost_description, description) VALUES
  ('model_dalle_3', 'DALL-E 3', 'OpenAI', 'openai/dall-e-3', 'image_generation', '$0.04 per image', 'High quality, reliable image generation'),
  ('model_flux_1_1_pro', 'FLUX 1.1 Pro', 'Black Forest Labs', 'black-forest-labs/flux-1.1-pro', 'image_generation', '$0.04 per image', 'Professional image generation'),
  ('model_stable_diffusion_xl', 'Stable Diffusion XL', 'Stability AI', 'stability-ai/stable-diffusion-xl-1024-v1-0', 'image_generation', '$0.003 per image', 'Cost-effective image generation'),
  ('model_gemini_flash_image', 'Gemini 2.5 Flash Image', 'Google', 'google/gemini-2.5-flash-image', 'image_generation', '$0.002 per image', 'Experimental image generation');

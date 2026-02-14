-- Fix Invalid Image Generation Model ID
-- Changes 'openai/dall-e-3' to 'google/gemini-2.5-flash-image'
-- DALL-E 3 is not available via OpenRouter, use Gemini instead

UPDATE model_settings
SET blog_image_generation_model = 'google/gemini-2.5-flash-image'
WHERE blog_image_generation_model = 'openai/dall-e-3';

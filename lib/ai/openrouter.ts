import OpenAI from "openai";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is not set");
}

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "PermaCraft",
  },
});

// Free models on OpenRouter (in priority order)
// Note: Some models may not support vision - fallback will skip them automatically
export const FREE_VISION_MODELS = [
  "amazon/nova-2-lite-v1:free",                     // Amazon Nova 2 Lite - vision, fast
  "nvidia/nemotron-nano-12b-v2-vl:free",            // Nemotron Nano VL - vision-language model
  "google/gemini-flash-1.5:free",                   // Gemini Flash 1.5 - vision
  "meta-llama/llama-3.2-90b-vision-instruct:free",  // Llama 3.2 90B Vision
  "x-ai/grok-4.1-fast:free",                        // Grok 4.1 Fast (may be unavailable)
  "google/gemma-3-27b-it:free",                     // Gemma 3 27B
  "openrouter/bert-nebulon-alpha",                  // Bert Nebulon Alpha
];

// Default to first model
export const FREE_VISION_MODEL = FREE_VISION_MODELS[0];

// Fallback paid vision model (when free tier rate limit is hit)
// Gemini 2.5 Flash Lite is very cheap and fast for OCR
export const FALLBACK_VISION_MODEL = "google/gemini-2.5-flash-lite";

// Image generation model for AI sketches/layouts
// Gemini 2.5 Flash Image can generate annotated images from descriptions
export const IMAGE_GENERATION_MODEL = "google/gemini-2.5-flash-image";

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
  "x-ai/grok-4.1-fast:free",                        // Grok 4.1 Fast - 2M context, vision
  "google/gemma-3-27b-it:free",                     // Gemma 3 27B - backup #1
  "nvidia/nemotron-nano-12b-v2-vl:free",            // Nemotron Nano VL - vision-language model
  "openrouter/bert-nebulon-alpha",                  // Bert Nebulon Alpha - backup #3
  "meta-llama/llama-3.2-90b-vision-instruct:free",  // Llama 3.2 90B Vision - backup #4
  "google/gemini-flash-1.5:free",                   // Gemini Flash 1.5 - backup #5
];

// Default to first model
export const FREE_VISION_MODEL = FREE_VISION_MODELS[0];

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

// Using xAI's Grok 4.1 Fast - free vision model with 2M context window on OpenRouter
export const FREE_VISION_MODEL = "x-ai/grok-4.1-fast:free";

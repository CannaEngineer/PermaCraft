/**
 * Centralized AI Model Settings Service
 *
 * This module provides a single source of truth for all AI model configurations
 * across the application. Different tasks use different models to optimize for
 * cost, speed, and quality.
 */

import { db } from '@/lib/db';

export interface ModelSettings {
  // Blog Generation
  blog_text_model: string;
  blog_image_prompt_model: string;
  blog_image_generation_model: string;

  // Lesson Generation
  lesson_generation_model: string;

  // AI Tutor (Conversational)
  ai_tutor_model: string;

  // Map Analysis (Vision)
  map_analysis_vision_model: string;
  map_analysis_fallback_model: string;

  // Sketch Generation
  sketch_instruction_model: string;
  sketch_image_model: string;

  // Practice Farm Feedback
  practice_feedback_model: string;

  // Lesson Personalization
  lesson_personalization_model: string;

  // Species Content Generation
  species_content_model: string;
}

/**
 * Default model settings (fallback if database is not configured)
 */
const DEFAULT_SETTINGS: ModelSettings = {
  blog_text_model: 'x-ai/grok-4.1-fast',
  blog_image_prompt_model: 'google/gemini-2.5-flash-lite',
  blog_image_generation_model: 'google/gemini-2.5-flash-image',
  lesson_generation_model: 'x-ai/grok-4.1-fast',
  ai_tutor_model: 'x-ai/grok-4.1-fast',
  map_analysis_vision_model: 'meta-llama/llama-3.2-90b-vision-instruct:free',
  map_analysis_fallback_model: 'google/gemini-2.5-flash-lite',
  sketch_instruction_model: 'google/gemini-2.5-flash-lite',
  sketch_image_model: 'google/gemini-2.5-flash-image',
  practice_feedback_model: 'x-ai/grok-4.1-fast',
  lesson_personalization_model: 'x-ai/grok-4.1-fast',
  species_content_model: 'x-ai/grok-4.1-fast',
};

/**
 * Get current model settings from database
 *
 * Falls back to default settings if database is not configured or query fails.
 * Settings are cached per request to avoid repeated database queries.
 */
let cachedSettings: ModelSettings | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function getModelSettings(): Promise<ModelSettings> {
  // Return cached settings if still valid
  const now = Date.now();
  if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM model_settings WHERE id = ?',
      args: ['default'],
    });

    // Check if rows exists and has data
    if (!result || !result.rows || result.rows.length === 0) {
      console.warn('No model settings found in database, using defaults');
      cachedSettings = DEFAULT_SETTINGS;
      cacheTimestamp = now;
      return DEFAULT_SETTINGS;
    }

    cachedSettings = result.rows[0] as any as ModelSettings;
    cacheTimestamp = now;
    return cachedSettings;
  } catch (error) {
    console.error('Failed to load model settings from database:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Get model for a specific task
 *
 * Convenience functions to get the right model for each use case.
 */
export async function getBlogTextModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.blog_text_model;
}

export async function getBlogImagePromptModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.blog_image_prompt_model;
}

export async function getBlogImageGenerationModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.blog_image_generation_model;
}

export async function getLessonGenerationModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.lesson_generation_model;
}

export async function getAITutorModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.ai_tutor_model;
}

export async function getMapAnalysisVisionModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.map_analysis_vision_model;
}

export async function getMapAnalysisFallbackModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.map_analysis_fallback_model;
}

export async function getSketchInstructionModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.sketch_instruction_model;
}

export async function getSketchImageModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.sketch_image_model;
}

export async function getPracticeFeedbackModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.practice_feedback_model;
}

export async function getLessonPersonalizationModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.lesson_personalization_model;
}

export async function getSpeciesContentModel(): Promise<string> {
  const settings = await getModelSettings();
  return settings.species_content_model;
}

/**
 * Clear the settings cache
 *
 * Call this after updating settings to force a fresh database query.
 */
export function clearModelSettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}

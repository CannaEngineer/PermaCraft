import OpenAI from 'openai';
import { getSpeciesById } from '@/lib/species/species-queries';
import { upsertSpeciesContent, getSpeciesWithoutContent } from '@/lib/species/species-content-queries';
import { buildNarrativePrompt, buildGrowingGuidePrompt } from './species-content-prompter';
import { getSpeciesContentModel } from './model-settings';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://permaculture.studio',
    'X-Title': 'Permaculture.Studio',
  },
});

function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    try {
      const start = jsonString.indexOf('{');
      const end = jsonString.lastIndexOf('}') + 1;
      if (start >= 0 && end > start) {
        const extracted = jsonString.substring(start, end);
        const minimal = extracted
          .replace(/\r?\n/g, ' ')
          .replace(/\t/g, ' ')
          .replace(/\s+/g, ' ');
        return JSON.parse(minimal);
      }
    } catch {
      // Give up
    }
    console.error('JSON parsing failed for species content:', jsonString.substring(0, 200));
    return fallback;
  }
}

/**
 * Generate AI content for a single species
 */
export async function generateSpeciesContent(speciesId: string): Promise<{ success: boolean; error?: string }> {
  const species = await getSpeciesById(speciesId);
  if (!species) {
    return { success: false, error: 'Species not found' };
  }

  const model = await getSpeciesContentModel();

  try {
    // Generate narrative
    const narrativePrompt = buildNarrativePrompt(species);
    const narrativeResponse = await openrouter.chat.completions.create({
      model,
      messages: [{ role: 'user', content: narrativePrompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const narrativeText = narrativeResponse.choices[0]?.message?.content || '';
    const narrative = safeJsonParse<{
      narrative_summary?: string;
      narrative_full?: string;
    }>(narrativeText, {});

    // Generate growing guide
    const guidePrompt = buildGrowingGuidePrompt(species);
    const guideResponse = await openrouter.chat.completions.create({
      model,
      messages: [{ role: 'user', content: guidePrompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const guideText = guideResponse.choices[0]?.message?.content || '';
    const guide = safeJsonParse<{
      growing_guide_summary?: string;
      growing_guide?: string;
    }>(guideText, {});

    // Upsert to database
    await upsertSpeciesContent(speciesId, {
      narrative_summary: narrative.narrative_summary || null,
      narrative_full: narrative.narrative_full || null,
      growing_guide: guide.growing_guide || null,
      growing_guide_summary: guide.growing_guide_summary || null,
      ai_model_used: model,
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to generate content for species ${speciesId}:`, message);
    return { success: false, error: message };
  }
}

/**
 * Batch generate content for species without content
 */
export async function batchGenerateSpeciesContent(limit: number = 5): Promise<{
  generated: number;
  failed: number;
  errors: string[];
}> {
  const speciesList = await getSpeciesWithoutContent(limit);
  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const species of speciesList) {
    const result = await generateSpeciesContent(species.id);
    if (result.success) {
      generated++;
    } else {
      failed++;
      errors.push(`${species.common_name}: ${result.error}`);
    }
  }

  return { generated, failed, errors };
}

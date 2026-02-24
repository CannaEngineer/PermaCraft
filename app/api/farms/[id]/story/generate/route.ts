import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { openrouter, FREE_VISION_MODELS, FALLBACK_VISION_MODEL } from '@/lib/ai/openrouter';
import { checkRateLimit, rateLimitHeaders } from '@/lib/ai/rate-limit';
import { FARM_STORY_SYSTEM_PROMPT, createStoryGenerationPrompt } from '@/lib/ai/prompts';

const DEFAULT_SECTION_TYPES = ['hero', 'origin', 'values', 'the_land', 'what_we_grow', 'seasons', 'visit_us'] as const;

// POST /api/farms/[id]/story/generate — AI story generation
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id: farmId } = await context.params;

  // Verify ownership
  const farmResult = await db.execute({
    sql: `SELECT id, user_id, name, description, acres, climate_zone, soil_type, rainfall_inches
          FROM farms WHERE id = ?`,
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Rate limit: 5 per hour for story generation
  const rl = checkRateLimit(session.user.id, 'story-generate', 5);
  if (!rl.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: rateLimitHeaders(rl),
    });
  }

  const body = await req.json().catch(() => ({}));
  const { additionalContext } = body as { sectionTypes?: string[]; additionalContext?: string };

  // Fetch zones
  const zonesResult = await db.execute({
    sql: 'SELECT name, zone_type FROM zones WHERE farm_id = ?',
    args: [farmId],
  });
  const zones = zonesResult.rows as any[];

  // Fetch plantings with species join
  const plantingsResult = await db.execute({
    sql: `SELECT DISTINCT s.common_name, s.scientific_name, s.layer, s.is_native, s.permaculture_functions
          FROM plantings p
          JOIN species s ON p.species_id = s.id
          WHERE p.farm_id = ?
          ORDER BY s.layer, s.common_name`,
    args: [farmId],
  });
  const plantings = plantingsResult.rows as any[];

  // Build prompt
  const userPrompt = createStoryGenerationPrompt(
    farm,
    zones,
    plantings,
    additionalContext
  );

  // Call OpenRouter with fallback chain
  let aiResponse: string | null = null;
  let modelUsed: string | null = null;
  const models = [...FREE_VISION_MODELS, FALLBACK_VISION_MODEL];

  for (const model of models) {
    try {
      const completion = await openrouter.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: FARM_STORY_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const content = completion.choices?.[0]?.message?.content;
      if (content) {
        aiResponse = content;
        modelUsed = model;
        break;
      }
    } catch (err) {
      console.error(`Story generation failed with model ${model}:`, err);
      continue;
    }
  }

  if (!aiResponse) {
    return new Response('AI generation failed across all models', { status: 502 });
  }

  // Parse JSON from response (handle potential markdown fences)
  let parsed: Record<string, { title: string; tagline?: string; content?: string }>;
  try {
    const cleaned = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return Response.json(
      { error: 'Failed to parse AI response', raw: aiResponse },
      { status: 502 }
    );
  }

  // Upsert sections
  const sections: any[] = [];
  for (let i = 0; i < DEFAULT_SECTION_TYPES.length; i++) {
    const sectionType = DEFAULT_SECTION_TYPES[i];
    const data = parsed[sectionType];
    if (!data) continue;

    const sectionId = crypto.randomUUID();
    const title = data.title || sectionType.replace(/_/g, ' ');
    const content = sectionType === 'hero' ? (data.tagline || '') : (data.content || '');

    // Delete existing section of same type for this farm
    await db.execute({
      sql: 'DELETE FROM farm_story_sections WHERE farm_id = ? AND section_type = ?',
      args: [farmId, sectionType],
    });

    await db.execute({
      sql: `INSERT INTO farm_story_sections (id, farm_id, section_type, title, content, ai_generated, ai_model, is_visible, display_order)
            VALUES (?, ?, ?, ?, ?, 1, ?, 1, ?)`,
      args: [sectionId, farmId, sectionType, title, content, modelUsed, i],
    });

    sections.push({
      id: sectionId,
      farm_id: farmId,
      section_type: sectionType,
      title,
      content,
      ai_generated: 1,
      ai_model: modelUsed,
      is_visible: 1,
      display_order: i,
    });
  }

  // Update farm timestamp
  await db.execute({
    sql: 'UPDATE farms SET story_generated_at = unixepoch() WHERE id = ?',
    args: [farmId],
  });

  return Response.json({
    sections,
    modelUsed,
  }, {
    headers: rateLimitHeaders(rl),
  });
}

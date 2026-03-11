import { NextRequest } from 'next/server';
import { openrouter, FREE_VISION_MODELS, FALLBACK_VISION_MODEL } from '@/lib/ai/openrouter';
import { getTourPoiById } from '@/lib/tour/queries';
import { getTourConfigBySlug } from '@/lib/tour/queries';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/tour/utils';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-ai:${ip}`, 30, 60 * 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { query, farm_slug, poi_id, session_id } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }

    if (query.length > 500) {
      return Response.json({ error: 'Query too long (max 500 characters)' }, { status: 400 });
    }

    // Build context
    let farmName = 'this farm';
    let farmContext = '';
    let poiContext = '';

    if (farm_slug) {
      const config = await getTourConfigBySlug(farm_slug);
      if (config) {
        const farmResult = await db.execute({
          sql: 'SELECT name, description, acres, climate_zone FROM farms WHERE id = ?',
          args: [config.farm_id],
        });
        const farm = farmResult.rows[0] as any;
        if (farm) {
          farmName = farm.name;
          farmContext = [
            farm.description && `Description: ${farm.description}`,
            farm.acres && `Size: ${farm.acres} acres`,
            farm.climate_zone && `Climate zone: ${farm.climate_zone}`,
          ].filter(Boolean).join('. ');
        }
        if (config.ai_system_prompt) {
          farmContext += `\n\nFarm operator notes: ${config.ai_system_prompt}`;
        }
      }
    }

    if (poi_id) {
      const poi = await getTourPoiById(poi_id);
      if (poi) {
        poiContext = `The visitor is currently at: "${poi.name}" (${poi.category}).`;
        if (poi.description) {
          poiContext += ` Description: ${poi.description}`;
        }
        if (poi.species_list) {
          try {
            const species = JSON.parse(poi.species_list);
            if (Array.isArray(species) && species.length > 0) {
              poiContext += ` Species present: ${species.join(', ')}.`;
            }
          } catch {}
        }
      }
    }

    const systemPrompt = `You are a friendly, knowledgeable tour guide for ${farmName}, a permaculture farm. You help visitors understand what they're seeing and learn about permaculture principles.

${farmContext}

${poiContext}

Guidelines:
- Keep responses concise — under 150 words unless the visitor asks for more detail
- Connect observations to permaculture principles when relevant
- Use common names for plants, with scientific names in parentheses when first mentioned
- Be enthusiastic but accurate
- If you don't know something specific about this farm, say so honestly
- Suggest what visitors should look for or notice nearby`;

    // Try models in order
    const models = [...FREE_VISION_MODELS.map(m => m.replace(':free', ':free')), FALLBACK_VISION_MODEL];

    let response = '';
    let modelUsed = '';

    for (const model of [FREE_VISION_MODELS[0], FREE_VISION_MODELS[1], FALLBACK_VISION_MODEL]) {
      try {
        const stream = await openrouter.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query.trim() },
          ],
          max_tokens: 500,
          stream: true,
        });

        // Stream the response
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                const text = chunk.choices[0]?.delta?.content || '';
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      } catch (error: any) {
        console.warn(`Tour AI chat failed with model ${model}:`, error?.message);
        continue;
      }
    }

    return Response.json({ error: 'AI service temporarily unavailable' }, { status: 503 });
  } catch (error) {
    console.error('Tour AI chat error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

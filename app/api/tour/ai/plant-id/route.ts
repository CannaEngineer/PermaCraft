import { NextRequest } from 'next/server';
import { openrouter, FREE_VISION_MODELS, FALLBACK_VISION_MODEL } from '@/lib/ai/openrouter';
import { checkRateLimit } from '@/lib/tour/utils';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-plant-id:${ip}`, 20, 60 * 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return Response.json({ error: 'Base64 image is required' }, { status: 400 });
    }

    // Limit image size (~5MB base64)
    if (image.length > 7_000_000) {
      return Response.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
    }

    const systemPrompt = `You are a plant identification expert with deep knowledge of permaculture. Given a photo, identify the plant and return a JSON response with these fields:

{
  "common_name": "Common name",
  "scientific_name": "Genus species",
  "confidence": "high" | "medium" | "low",
  "permaculture_role": "Brief description of its role in permaculture systems",
  "edibility": "edible" | "edible_with_caution" | "not_edible" | "toxic",
  "note": "One sentence about this plant that would interest a farm visitor"
}

Return ONLY valid JSON, no markdown code blocks or extra text.`;

    const imageUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`;

    // Try vision models in order
    for (const model of [FREE_VISION_MODELS[0], FREE_VISION_MODELS[1], FALLBACK_VISION_MODEL]) {
      try {
        const completion = await openrouter.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Identify this plant:' },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            },
          ],
          max_tokens: 500,
        });

        const responseText = completion.choices[0]?.message?.content || '';

        // Parse JSON from response
        let result;
        try {
          // Try direct parse first
          result = JSON.parse(responseText);
        } catch {
          // Try extracting JSON from markdown code block
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Could not parse plant ID response');
          }
        }

        return Response.json({ result, model });
      } catch (error: any) {
        console.warn(`Plant ID failed with model ${model}:`, error?.message);
        continue;
      }
    }

    return Response.json({ error: 'Plant identification temporarily unavailable' }, { status: 503 });
  } catch (error) {
    console.error('Plant ID error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

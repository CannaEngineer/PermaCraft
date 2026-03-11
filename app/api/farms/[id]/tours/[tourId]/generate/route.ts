import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { openrouter, FREE_VISION_MODELS, FALLBACK_VISION_MODEL } from '@/lib/ai/openrouter';
import { checkRateLimit, rateLimitHeaders } from '@/lib/ai/rate-limit';
import { FARM_TOUR_SYSTEM_PROMPT, createTourGenerationPrompt } from '@/lib/ai/prompts';

// POST /api/farms/[id]/tours/[tourId]/generate — AI-generate tour stops
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; tourId: string }> }
) {
  const session = await requireAuth();
  const { id: farmId, tourId } = await context.params;

  // Verify ownership
  const farmResult = await db.execute({
    sql: `SELECT id, user_id, name, description, acres, climate_zone, soil_type, rainfall_inches, center_lat, center_lng
          FROM farms WHERE id = ?`,
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Verify tour exists and belongs to this farm
  const tourResult = await db.execute({
    sql: 'SELECT id, tour_type FROM farm_tours WHERE id = ? AND farm_id = ?',
    args: [tourId, farmId],
  });
  const tour = tourResult.rows[0] as any;
  if (!tour) {
    return new Response('Tour not found', { status: 404 });
  }

  // Rate limit: 5 per hour
  const rl = checkRateLimit(session.user.id, 'tour-generate', 5);
  if (!rl.allowed) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: rateLimitHeaders(rl),
    });
  }

  const body = await req.json().catch(() => ({}));
  const { additionalContext } = body as { additionalContext?: string };

  // Fetch zones
  const zonesResult = await db.execute({
    sql: 'SELECT id, name, zone_type, geometry FROM zones WHERE farm_id = ?',
    args: [farmId],
  });
  const zones = zonesResult.rows as any[];

  // Fetch plantings with species
  const plantingsResult = await db.execute({
    sql: `SELECT DISTINCT s.common_name, s.scientific_name, s.layer, s.is_native, s.permaculture_functions,
          p.lat, p.lng
          FROM plantings p
          JOIN species s ON p.species_id = s.id
          WHERE p.farm_id = ?
          ORDER BY s.layer, s.common_name`,
    args: [farmId],
  });
  const plantings = plantingsResult.rows as any[];

  const tourType = tour.tour_type || 'in_person';

  // Build prompt
  const userPrompt = createTourGenerationPrompt(
    farm, zones, plantings, tourType, additionalContext
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
          { role: 'system', content: FARM_TOUR_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 6000,
      });

      const content = completion.choices?.[0]?.message?.content;
      if (content) {
        aiResponse = content;
        modelUsed = model;
        break;
      }
    } catch (err) {
      console.error(`Tour generation failed with model ${model}:`, err);
      continue;
    }
  }

  if (!aiResponse) {
    return new Response('AI generation failed across all models', { status: 502 });
  }

  // Parse JSON response
  let parsed: {
    tour: {
      title: string;
      description: string;
      welcome_message: string;
      completion_message: string;
      estimated_duration_minutes: number;
      difficulty: string;
      tags: string[];
    };
    stops: Array<{
      title: string;
      description: string;
      stop_type: string;
      estimated_time_minutes: number;
      navigation_hint?: string;
      direction_from_previous?: string;
      seasonal_visibility?: string;
      quiz_question?: string;
      quiz_options?: string[];
      quiz_answer_index?: number;
      is_optional?: boolean;
    }>;
  };

  try {
    const cleaned = aiResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return Response.json(
      { error: 'Failed to parse AI response', raw: aiResponse },
      { status: 502 }
    );
  }

  // Update tour metadata from AI
  await db.execute({
    sql: `UPDATE farm_tours SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          welcome_message = ?,
          completion_message = ?,
          estimated_duration_minutes = ?,
          difficulty = ?,
          tags = ?,
          ai_generated = 1,
          ai_model = ?,
          updated_at = unixepoch()
          WHERE id = ?`,
    args: [
      parsed.tour.title,
      parsed.tour.description,
      parsed.tour.welcome_message || null,
      parsed.tour.completion_message || null,
      parsed.tour.estimated_duration_minutes || null,
      parsed.tour.difficulty || 'easy',
      parsed.tour.tags ? JSON.stringify(parsed.tour.tags) : null,
      modelUsed,
      tourId,
    ],
  });

  // Delete existing stops (regeneration replaces all)
  await db.execute({
    sql: 'DELETE FROM tour_stops WHERE tour_id = ?',
    args: [tourId],
  });

  // Insert new stops
  const insertedStops: any[] = [];
  for (let i = 0; i < parsed.stops.length; i++) {
    const stop = parsed.stops[i];
    const stopId = crypto.randomUUID();

    // Try to match stop to a zone location for coordinates
    let lat: number | null = null;
    let lng: number | null = null;

    // If stop type matches a zone, try to use its centroid
    const matchedZone = zones.find(z =>
      z.name && stop.title.toLowerCase().includes(z.name.toLowerCase())
    );
    if (matchedZone && matchedZone.geometry) {
      try {
        const geo = JSON.parse(matchedZone.geometry);
        if (geo.coordinates) {
          // Simple centroid for polygon
          const coords = geo.type === 'Polygon' ? geo.coordinates[0] : [geo.coordinates];
          const avgLng = coords.reduce((s: number, c: number[]) => s + c[0], 0) / coords.length;
          const avgLat = coords.reduce((s: number, c: number[]) => s + c[1], 0) / coords.length;
          lng = avgLng;
          lat = avgLat;
        }
      } catch { /* ignore parse errors */ }
    }

    // If no zone match, try to match to a planting
    if (!lat && !lng) {
      const matchedPlanting = plantings.find(p =>
        stop.title.toLowerCase().includes(p.common_name.toLowerCase())
      );
      if (matchedPlanting) {
        lat = matchedPlanting.lat;
        lng = matchedPlanting.lng;
      }
    }

    await db.execute({
      sql: `INSERT INTO tour_stops (id, tour_id, title, description, stop_type, lat, lng,
            estimated_time_minutes, is_optional, navigation_hint, direction_from_previous,
            seasonal_visibility, quiz_question, quiz_options, quiz_answer_index,
            ai_generated, ai_description, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [
        stopId, tourId, stop.title, stop.description,
        stop.stop_type || 'point_of_interest',
        lat, lng,
        stop.estimated_time_minutes || 3,
        stop.is_optional ? 1 : 0,
        stop.navigation_hint || null,
        stop.direction_from_previous || null,
        stop.seasonal_visibility || null,
        stop.quiz_question || null,
        stop.quiz_options ? JSON.stringify(stop.quiz_options) : null,
        stop.quiz_answer_index ?? null,
        stop.description,
        i,
      ],
    });

    insertedStops.push({
      id: stopId,
      tour_id: tourId,
      title: stop.title,
      description: stop.description,
      stop_type: stop.stop_type,
      lat, lng,
      display_order: i,
      navigation_hint: stop.navigation_hint,
    });
  }

  // Fetch updated tour
  const updatedTour = await db.execute({
    sql: 'SELECT * FROM farm_tours WHERE id = ?',
    args: [tourId],
  });

  return Response.json({
    tour: updatedTour.rows[0],
    stops: insertedStops,
    modelUsed,
  }, {
    headers: rateLimitHeaders(rl),
  });
}

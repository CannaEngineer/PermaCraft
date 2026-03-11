import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

// GET /api/farms/[id]/tours/[tourId]/stops
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; tourId: string }> }
) {
  const { tourId } = await context.params;

  const result = await db.execute({
    sql: 'SELECT * FROM tour_stops WHERE tour_id = ? ORDER BY display_order ASC',
    args: [tourId],
  });

  return Response.json({ stops: result.rows });
}

// POST /api/farms/[id]/tours/[tourId]/stops — add a stop
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; tourId: string }> }
) {
  const session = await requireAuth();
  const { id: farmId, tourId } = await context.params;

  // Verify ownership
  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Verify tour belongs to farm
  const tourResult = await db.execute({
    sql: 'SELECT id FROM farm_tours WHERE id = ? AND farm_id = ?',
    args: [tourId, farmId],
  });
  if (tourResult.rows.length === 0) {
    return new Response('Tour not found', { status: 404 });
  }

  const body = await req.json();
  const {
    title,
    description,
    rich_content,
    media_urls,
    lat,
    lng,
    radius_meters = 20,
    zone_id,
    planting_id,
    stop_type = 'point_of_interest',
    display_order,
    is_optional = 0,
    audio_url,
    estimated_time_minutes = 3,
    seasonal_visibility,
    navigation_hint,
    direction_from_previous,
    distance_from_previous_meters,
    heading_degrees,
    virtual_media_url,
    virtual_media_type,
    quiz_question,
    quiz_options,
    quiz_answer_index,
  } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return new Response('Title is required', { status: 400 });
  }

  const id = crypto.randomUUID();

  // Auto-calculate order if not provided
  let order = display_order;
  if (order == null) {
    const maxResult = await db.execute({
      sql: 'SELECT MAX(display_order) as max_order FROM tour_stops WHERE tour_id = ?',
      args: [tourId],
    });
    const maxRow = maxResult.rows[0] as any;
    order = (maxRow?.max_order ?? -1) + 1;
  }

  await db.execute({
    sql: `INSERT INTO tour_stops (id, tour_id, title, description, rich_content, media_urls,
          lat, lng, radius_meters, zone_id, planting_id, stop_type, display_order,
          is_optional, audio_url, estimated_time_minutes, seasonal_visibility,
          navigation_hint, direction_from_previous, distance_from_previous_meters,
          heading_degrees, virtual_media_url, virtual_media_type,
          quiz_question, quiz_options, quiz_answer_index)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, tourId, title.trim(), description || null, rich_content || null,
      media_urls ? JSON.stringify(media_urls) : null,
      lat ?? null, lng ?? null, radius_meters,
      zone_id || null, planting_id || null, stop_type, order,
      is_optional, audio_url || null, estimated_time_minutes,
      seasonal_visibility || null,
      navigation_hint || null, direction_from_previous || null,
      distance_from_previous_meters ?? null, heading_degrees ?? null,
      virtual_media_url || null, virtual_media_type || null,
      quiz_question || null, quiz_options || null, quiz_answer_index ?? null,
    ],
  });

  // Update tour duration estimate
  const durationResult = await db.execute({
    sql: 'SELECT SUM(estimated_time_minutes) as total FROM tour_stops WHERE tour_id = ?',
    args: [tourId],
  });
  const total = (durationResult.rows[0] as any)?.total || 0;
  await db.execute({
    sql: 'UPDATE farm_tours SET estimated_duration_minutes = ?, updated_at = unixepoch() WHERE id = ?',
    args: [total, tourId],
  });

  const stopResult = await db.execute({
    sql: 'SELECT * FROM tour_stops WHERE id = ?',
    args: [id],
  });

  return Response.json(stopResult.rows[0], { status: 201 });
}

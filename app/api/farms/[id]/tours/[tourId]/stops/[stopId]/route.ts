import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

// PATCH /api/farms/[id]/tours/[tourId]/stops/[stopId]
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; tourId: string; stopId: string }> }
) {
  const session = await requireAuth();
  const { id: farmId, tourId, stopId } = await context.params;

  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const body = await req.json();
  const allowedFields = [
    'title', 'description', 'rich_content', 'media_urls',
    'lat', 'lng', 'radius_meters', 'zone_id', 'planting_id',
    'stop_type', 'display_order', 'is_optional', 'audio_url',
    'estimated_time_minutes', 'seasonal_visibility',
    'navigation_hint', 'direction_from_previous', 'distance_from_previous_meters',
    'heading_degrees', 'virtual_media_url', 'virtual_media_type',
    'quiz_question', 'quiz_options', 'quiz_answer_index',
  ];

  const updates: string[] = [];
  const args: any[] = [];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === 'media_urls' && Array.isArray(body[field])) {
        updates.push(`${field} = ?`);
        args.push(JSON.stringify(body[field]));
      } else {
        updates.push(`${field} = ?`);
        args.push(body[field]);
      }
    }
  }

  if (updates.length === 0) {
    return new Response('No fields to update', { status: 400 });
  }

  updates.push('updated_at = unixepoch()');
  args.push(stopId, tourId);

  await db.execute({
    sql: `UPDATE tour_stops SET ${updates.join(', ')} WHERE id = ? AND tour_id = ?`,
    args,
  });

  // Recalculate tour duration
  const durationResult = await db.execute({
    sql: 'SELECT SUM(estimated_time_minutes) as total FROM tour_stops WHERE tour_id = ?',
    args: [tourId],
  });
  const total = (durationResult.rows[0] as any)?.total || 0;
  await db.execute({
    sql: 'UPDATE farm_tours SET estimated_duration_minutes = ?, updated_at = unixepoch() WHERE id = ?',
    args: [total, tourId],
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM tour_stops WHERE id = ?',
    args: [stopId],
  });

  return Response.json(updated.rows[0]);
}

// DELETE /api/farms/[id]/tours/[tourId]/stops/[stopId]
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; tourId: string; stopId: string }> }
) {
  const session = await requireAuth();
  const { id: farmId, tourId, stopId } = await context.params;

  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  await db.execute({
    sql: 'DELETE FROM tour_stops WHERE id = ? AND tour_id = ?',
    args: [stopId, tourId],
  });

  // Re-order remaining stops
  await db.execute({
    sql: `UPDATE tour_stops SET display_order = (
      SELECT COUNT(*) FROM tour_stops AS ts2
      WHERE ts2.tour_id = tour_stops.tour_id AND ts2.display_order < tour_stops.display_order
    ) WHERE tour_id = ?`,
    args: [tourId],
  });

  // Recalculate duration
  const durationResult = await db.execute({
    sql: 'SELECT SUM(estimated_time_minutes) as total FROM tour_stops WHERE tour_id = ?',
    args: [tourId],
  });
  const total = (durationResult.rows[0] as any)?.total || 0;
  await db.execute({
    sql: 'UPDATE farm_tours SET estimated_duration_minutes = ?, updated_at = unixepoch() WHERE id = ?',
    args: [total, tourId],
  });

  return new Response(null, { status: 204 });
}

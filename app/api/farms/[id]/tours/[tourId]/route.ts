import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

// GET /api/farms/[id]/tours/[tourId] — get single tour with stops
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; tourId: string }> }
) {
  const { id: farmId, tourId } = await context.params;

  const tourResult = await db.execute({
    sql: 'SELECT * FROM farm_tours WHERE id = ? AND farm_id = ?',
    args: [tourId, farmId],
  });
  const tour = tourResult.rows[0];
  if (!tour) return new Response('Tour not found', { status: 404 });

  const stopsResult = await db.execute({
    sql: 'SELECT * FROM tour_stops WHERE tour_id = ? ORDER BY display_order ASC',
    args: [tourId],
  });

  return Response.json({
    tour,
    stops: stopsResult.rows,
  });
}

// PATCH /api/farms/[id]/tours/[tourId] — update tour
export async function PATCH(
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

  const body = await req.json();
  const allowedFields = [
    'title', 'description', 'cover_image_url', 'status', 'access_type',
    'access_password', 'estimated_duration_minutes', 'difficulty',
    'seasonal_notes', 'welcome_message', 'completion_message',
    'show_map', 'allow_comments',
  ];

  const updates: string[] = [];
  const args: any[] = [];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      args.push(body[field]);
    }
  }

  if (updates.length === 0) {
    return new Response('No fields to update', { status: 400 });
  }

  // Handle status change to published
  if (body.status === 'published') {
    updates.push('published_at = unixepoch()');
  }

  updates.push('updated_at = unixepoch()');
  args.push(tourId, farmId);

  await db.execute({
    sql: `UPDATE farm_tours SET ${updates.join(', ')} WHERE id = ? AND farm_id = ?`,
    args,
  });

  const updatedTour = await db.execute({
    sql: 'SELECT * FROM farm_tours WHERE id = ?',
    args: [tourId],
  });

  return Response.json(updatedTour.rows[0]);
}

// DELETE /api/farms/[id]/tours/[tourId] — delete tour
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; tourId: string }> }
) {
  const session = await requireAuth();
  const { id: farmId, tourId } = await context.params;

  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  await db.execute({
    sql: 'DELETE FROM farm_tours WHERE id = ? AND farm_id = ?',
    args: [tourId, farmId],
  });

  return new Response(null, { status: 204 });
}

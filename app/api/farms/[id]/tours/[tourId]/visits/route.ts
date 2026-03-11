import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

// POST /api/farms/[id]/tours/[tourId]/visits — start a visit (visitor endpoint)
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; tourId: string }> }
) {
  const { id: farmId, tourId } = await context.params;
  const session = await getSession();

  // Verify tour exists and is published
  const tourResult = await db.execute({
    sql: `SELECT t.*, f.user_id as farm_owner_id FROM farm_tours t
          JOIN farms f ON t.farm_id = f.id
          WHERE t.id = ? AND t.farm_id = ?`,
    args: [tourId, farmId],
  });
  const tour = tourResult.rows[0] as any;
  if (!tour || tour.status !== 'published') {
    return new Response('Tour not found', { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { visitor_name, visitor_email, device_type, referrer } = body;

  const id = crypto.randomUUID();
  const sessionToken = crypto.randomUUID();

  await db.execute({
    sql: `INSERT INTO tour_visits (id, tour_id, visitor_user_id, visitor_name, visitor_email,
          session_token, device_type, referrer)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, tourId, session?.user?.id || null,
      visitor_name || null, visitor_email || null,
      sessionToken, device_type || null, referrer || null,
    ],
  });

  // Increment visitor count
  await db.execute({
    sql: 'UPDATE farm_tours SET visitor_count = visitor_count + 1 WHERE id = ?',
    args: [tourId],
  });

  return Response.json({ visit_id: id, session_token: sessionToken }, { status: 201 });
}

// PATCH /api/farms/[id]/tours/[tourId]/visits — update visit progress
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; tourId: string }> }
) {
  const { tourId } = await context.params;
  const body = await req.json();
  const { session_token, last_stop_id, stops_visited, completed, rating, feedback } = body;

  if (!session_token) {
    return new Response('session_token is required', { status: 400 });
  }

  const updates: string[] = [];
  const args: any[] = [];

  if (last_stop_id) {
    updates.push('last_stop_id = ?');
    args.push(last_stop_id);
  }
  if (stops_visited) {
    updates.push('stops_visited = ?');
    args.push(JSON.stringify(stops_visited));
  }
  if (completed) {
    updates.push('completed_at = unixepoch()');
  }
  if (rating != null) {
    updates.push('rating = ?');
    args.push(rating);
  }
  if (feedback) {
    updates.push('feedback = ?');
    args.push(feedback);
  }

  if (updates.length === 0) {
    return new Response('No fields to update', { status: 400 });
  }

  args.push(session_token, tourId);

  await db.execute({
    sql: `UPDATE tour_visits SET ${updates.join(', ')} WHERE session_token = ? AND tour_id = ?`,
    args,
  });

  return Response.json({ success: true });
}

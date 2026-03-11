import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

// POST /api/farms/[id]/tours/[tourId]/stops/reorder — reorder stops
export async function POST(
  req: Request,
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

  const body = await req.json();
  const { stop_ids } = body;

  if (!Array.isArray(stop_ids) || stop_ids.length === 0) {
    return new Response('stop_ids array is required', { status: 400 });
  }

  for (let i = 0; i < stop_ids.length; i++) {
    await db.execute({
      sql: 'UPDATE tour_stops SET display_order = ?, updated_at = unixepoch() WHERE id = ? AND tour_id = ?',
      args: [i, stop_ids[i], tourId],
    });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM tour_stops WHERE tour_id = ? ORDER BY display_order ASC',
    args: [tourId],
  });

  return Response.json({ stops: result.rows });
}

import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

// PUT /api/farms/[id]/story/reorder — reorder sections
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  const { id: farmId } = await context.params;

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
  const { order } = body as { order: string[] };

  if (!Array.isArray(order) || order.length === 0) {
    return new Response('order must be a non-empty array of section IDs', { status: 400 });
  }

  // Batch update display_order based on array index
  for (let i = 0; i < order.length; i++) {
    await db.execute({
      sql: 'UPDATE farm_story_sections SET display_order = ?, updated_at = unixepoch() WHERE id = ? AND farm_id = ?',
      args: [i, order[i], farmId],
    });
  }

  return Response.json({ success: true });
}

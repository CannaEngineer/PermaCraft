import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

// PATCH /api/farms/[id]/story/[sectionId] — update a section
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await requireAuth();
  const { id: farmId, sectionId } = await context.params;

  // Verify ownership
  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  // Verify section exists and belongs to farm
  const sectionResult = await db.execute({
    sql: 'SELECT id FROM farm_story_sections WHERE id = ? AND farm_id = ?',
    args: [sectionId, farmId],
  });
  if (!sectionResult.rows[0]) {
    return new Response('Section not found', { status: 404 });
  }

  const body = await req.json();
  const updates: string[] = [];
  const args: any[] = [];

  const allowedFields = ['title', 'content', 'media_url', 'media_urls', 'is_visible', 'display_order', 'metadata', 'section_type'];
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      const val = field === 'metadata' && typeof body[field] === 'object'
        ? JSON.stringify(body[field])
        : body[field];
      args.push(val);
    }
  }

  if (updates.length === 0) {
    return new Response('No fields to update', { status: 400 });
  }

  updates.push('updated_at = unixepoch()');
  args.push(sectionId, farmId);

  await db.execute({
    sql: `UPDATE farm_story_sections SET ${updates.join(', ')} WHERE id = ? AND farm_id = ?`,
    args,
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM farm_story_sections WHERE id = ?',
    args: [sectionId],
  });

  return Response.json(updated.rows[0]);
}

// DELETE /api/farms/[id]/story/[sectionId] — delete a section
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; sectionId: string }> }
) {
  const session = await requireAuth();
  const { id: farmId, sectionId } = await context.params;

  // Verify ownership
  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  await db.execute({
    sql: 'DELETE FROM farm_story_sections WHERE id = ? AND farm_id = ?',
    args: [sectionId, farmId],
  });

  return new Response(null, { status: 204 });
}

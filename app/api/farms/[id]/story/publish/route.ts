import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

// PATCH /api/farms/[id]/story/publish — toggle publish + theme
export async function PATCH(
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
  const { published, theme } = body as { published?: number; theme?: string };

  const updates: string[] = [];
  const args: any[] = [];

  if (published !== undefined) {
    if (published !== 0 && published !== 1) {
      return new Response('published must be 0 or 1', { status: 400 });
    }
    updates.push('story_published = ?');
    args.push(published);
  }

  if (theme !== undefined) {
    const validThemes = ['earth', 'meadow', 'forest', 'water'];
    if (!validThemes.includes(theme)) {
      return new Response('Invalid theme', { status: 400 });
    }
    updates.push('story_theme = ?');
    args.push(theme);
  }

  if (updates.length === 0) {
    return new Response('No fields to update', { status: 400 });
  }

  updates.push('updated_at = unixepoch()');
  args.push(farmId);

  await db.execute({
    sql: `UPDATE farms SET ${updates.join(', ')} WHERE id = ?`,
    args,
  });

  return Response.json({ success: true });
}

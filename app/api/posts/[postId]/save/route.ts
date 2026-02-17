import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await requireAuth();
    const result = await db.execute({
      sql: 'SELECT id FROM post_saves WHERE user_id = ? AND post_id = ?',
      args: [session.user.id, params.postId]
    });
    return Response.json({ saved: result.rows.length > 0 });
  } catch {
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await requireAuth();

    const existing = await db.execute({
      sql: 'SELECT id FROM post_saves WHERE user_id = ? AND post_id = ?',
      args: [session.user.id, params.postId]
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: 'DELETE FROM post_saves WHERE user_id = ? AND post_id = ?',
        args: [session.user.id, params.postId]
      });
      await db.execute({
        sql: 'UPDATE farm_posts SET save_count = MAX(0, save_count - 1) WHERE id = ?',
        args: [params.postId]
      });
      return Response.json({ saved: false });
    } else {
      await db.execute({
        sql: 'INSERT INTO post_saves (id, user_id, post_id, created_at) VALUES (?, ?, ?, unixepoch())',
        args: [crypto.randomUUID(), session.user.id, params.postId]
      });
      await db.execute({
        sql: 'UPDATE farm_posts SET save_count = save_count + 1 WHERE id = ?',
        args: [params.postId]
      });
      return Response.json({ saved: true });
    }
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

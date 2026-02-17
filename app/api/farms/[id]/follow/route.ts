import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const followResult = await db.execute({
      sql: 'SELECT id FROM farm_follows WHERE follower_user_id = ? AND followed_farm_id = ?',
      args: [session.user.id, params.id]
    });

    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM farm_follows WHERE followed_farm_id = ?',
      args: [params.id]
    });

    return Response.json({
      following: followResult.rows.length > 0,
      follower_count: Number(countResult.rows[0].count)
    });
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const existing = await db.execute({
      sql: 'SELECT id FROM farm_follows WHERE follower_user_id = ? AND followed_farm_id = ?',
      args: [session.user.id, params.id]
    });

    if (existing.rows.length > 0) {
      await db.execute({
        sql: 'DELETE FROM farm_follows WHERE follower_user_id = ? AND followed_farm_id = ?',
        args: [session.user.id, params.id]
      });
      return Response.json({ following: false });
    } else {
      await db.execute({
        sql: 'INSERT INTO farm_follows (id, follower_user_id, followed_farm_id, created_at) VALUES (?, ?, ?, unixepoch())',
        args: [crypto.randomUUID(), session.user.id, params.id]
      });
      return Response.json({ following: true });
    }
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

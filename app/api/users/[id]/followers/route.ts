import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await db.execute({
      sql: `
        SELECT u.id, u.name, u.image, u.bio, uf.created_at as followed_at
        FROM user_follows uf
        JOIN users u ON uf.follower_id = u.id
        WHERE uf.followed_id = ?
        ORDER BY uf.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [id, limit, offset],
    });

    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM user_follows WHERE followed_id = ?',
      args: [id],
    });

    return Response.json({
      users: result.rows,
      total: (countResult.rows[0] as any).count,
    });
  } catch (error) {
    console.error('Followers error:', error);
    return Response.json({ error: 'Failed to load followers' }, { status: 500 });
  }
}

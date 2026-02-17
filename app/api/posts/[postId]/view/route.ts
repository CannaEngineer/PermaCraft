import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    // Rate limit: one view per IP per post per 24h
    const yesterday = Math.floor(Date.now() / 1000) - 86400;
    const recent = await db.execute({
      sql: 'SELECT id FROM post_views WHERE post_id = ? AND viewer_ip = ? AND created_at > ?',
      args: [params.postId, ip, yesterday]
    });

    if (recent.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO post_views (id, post_id, viewer_ip, created_at) VALUES (?, ?, ?, unixepoch())',
        args: [crypto.randomUUID(), params.postId, ip]
      });
      await db.execute({
        sql: 'UPDATE farm_posts SET view_count = view_count + 1 WHERE id = ?',
        args: [params.postId]
      });
    }

    const countResult = await db.execute({
      sql: 'SELECT view_count FROM farm_posts WHERE id = ?',
      args: [params.postId]
    });

    return Response.json({ view_count: countResult.rows[0]?.view_count ?? 0 });
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

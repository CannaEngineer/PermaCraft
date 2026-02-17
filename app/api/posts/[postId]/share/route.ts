import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const { platform } = await request.json();
    const validPlatforms = ['twitter', 'facebook', 'pinterest', 'reddit', 'copy_link'];
    if (!validPlatforms.includes(platform)) {
      return new Response('Invalid platform', { status: 400 });
    }

    await db.execute({
      sql: 'INSERT INTO post_shares (id, post_id, platform, created_at) VALUES (?, ?, ?, unixepoch())',
      args: [crypto.randomUUID(), params.postId, platform]
    });
    await db.execute({
      sql: 'UPDATE farm_posts SET share_count = share_count + 1 WHERE id = ?',
      args: [params.postId]
    });

    const countResult = await db.execute({
      sql: 'SELECT share_count FROM farm_posts WHERE id = ?',
      args: [params.postId]
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://permaculture.studio';
    return Response.json({
      share_count: countResult.rows[0]?.share_count ?? 0,
      share_url: `${appUrl}/gallery/${params.postId}`
    });
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const args: any[] = [];

    let sql = `
      SELECT p.*,
             u.name as author_name,
             u.image as author_image,
             f.name as farm_name,
             f.description as farm_description,
             ai.screenshot_data as ai_screenshot
    `;

    if (session) {
      sql += `,
             (SELECT reaction_type FROM post_reactions
              WHERE post_id = p.id AND user_id = ?) as user_reaction,
             (SELECT 1 FROM saved_posts
              WHERE post_id = p.id AND user_id = ?) as is_bookmarked
      `;
      args.push(session.user.id, session.user.id);
    } else {
      sql += `,
             NULL as user_reaction,
             NULL as is_bookmarked
      `;
    }

    sql += `
      FROM farm_posts p
      JOIN users u ON p.author_id = u.id
      JOIN farms f ON p.farm_id = f.id
      LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
      WHERE p.author_id = ? AND p.is_published = 1 AND f.is_public = 1
    `;
    args.push(id);

    if (cursor) {
      const cursorResult = await db.execute({
        sql: 'SELECT created_at FROM farm_posts WHERE id = ?',
        args: [cursor],
      });
      if (cursorResult.rows.length > 0) {
        sql += ' AND p.created_at < ?';
        args.push((cursorResult.rows[0] as any).created_at);
      }
    }

    sql += ' ORDER BY p.created_at DESC LIMIT ?';
    args.push(limit + 1);

    const postsResult = await db.execute({ sql, args });
    const hasMore = postsResult.rows.length > limit;
    const posts = postsResult.rows.slice(0, limit);

    const formattedPosts = posts.map((post: any) => {
      let aiScreenshot = null;
      if (post.ai_screenshot) {
        try {
          const urls = JSON.parse(post.ai_screenshot);
          aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
        } catch {
          aiScreenshot = post.ai_screenshot;
        }
      }

      return {
        id: post.id,
        farm_id: post.farm_id,
        farm_name: post.farm_name,
        farm_description: post.farm_description,
        type: post.post_type,
        content: post.content,
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
        ai_response_excerpt: post.ai_response_excerpt,
        ai_screenshot: aiScreenshot,
        tagged_zones: post.tagged_zones ? JSON.parse(post.tagged_zones) : null,
        hashtags: post.hashtags ? JSON.parse(post.hashtags) : null,
        author: {
          id: post.author_id,
          name: post.author_name,
          image: post.author_image,
        },
        reaction_count: post.reaction_count,
        comment_count: post.comment_count,
        view_count: post.view_count,
        created_at: post.created_at,
        user_reaction: post.user_reaction,
        is_bookmarked: post.is_bookmarked === 1,
      };
    });

    return Response.json({
      posts: formattedPosts,
      next_cursor: hasMore ? formattedPosts[formattedPosts.length - 1].id : null,
      has_more: hasMore,
    });
  } catch (error) {
    console.error('User posts error:', error);
    return Response.json({ error: 'Failed to load user posts' }, { status: 500 });
  }
}

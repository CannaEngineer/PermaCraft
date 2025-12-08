import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Saved Posts Feed API
 *
 * Returns posts that the current user has bookmarked, ordered by bookmark date.
 * Includes all the same data as the global feed.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const args: any[] = [session.user.id, session.user.id];
    let sql = `
      SELECT p.*,
             u.name as author_name,
             u.image as author_image,
             f.name as farm_name,
             f.description as farm_description,
             ai.screenshot_data as ai_screenshot,
             (SELECT reaction_type FROM post_reactions
              WHERE post_id = p.id AND user_id = ?) as user_reaction,
             1 as is_bookmarked,
             sp.created_at as bookmark_created_at
      FROM saved_posts sp
      JOIN farm_posts p ON sp.post_id = p.id
      JOIN users u ON p.author_id = u.id
      JOIN farms f ON p.farm_id = f.id
      LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
      WHERE sp.user_id = ? AND p.is_published = 1
    `;

    // Cursor pagination based on bookmark creation date
    if (cursor) {
      const cursorResult = await db.execute({
        sql: "SELECT created_at FROM saved_posts WHERE id = ?",
        args: [cursor],
      });
      if (cursorResult.rows.length > 0) {
        sql += ` AND sp.created_at < ?`;
        args.push((cursorResult.rows[0] as any).created_at);
      }
    }

    sql += ` ORDER BY sp.created_at DESC LIMIT ?`;
    args.push(limit + 1);

    const postsResult = await db.execute({ sql, args });
    const hasMore = postsResult.rows.length > limit;
    const posts = postsResult.rows.slice(0, limit);

    const formattedPosts = posts.map((post: any) => {
      // Parse ai_screenshot JSON array and get first URL
      let aiScreenshot = null;
      if (post.ai_screenshot) {
        try {
          const urls = JSON.parse(post.ai_screenshot);
          aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
        } catch (e) {
          // If not JSON, use as-is (fallback for base64)
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
        is_bookmarked: true, // All posts in this feed are bookmarked
      };
    });

    return Response.json({
      posts: formattedPosts,
      next_cursor: hasMore ? formattedPosts[formattedPosts.length - 1].id : null,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("Saved posts feed error:", error);
    return Response.json(
      { error: "Failed to load saved posts" },
      { status: 500 }
    );
  }
}

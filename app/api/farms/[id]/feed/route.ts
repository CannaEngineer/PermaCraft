import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Farm Feed API Route
 *
 * GET /api/farms/[id]/feed
 *
 * Returns paginated feed of posts for a farm using cursor-based pagination.
 * Supports filtering by post type and zone.
 *
 * Query Parameters:
 * - cursor: Post ID to start from (for infinite scroll)
 * - limit: Number of posts to return (default: 20, max: 50)
 * - type: Filter by post type (text, photo, ai_insight, all)
 * - zone: Filter by tagged zone ID
 *
 * Response includes user's reaction status for each post.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const farmId = params.id;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const typeFilter = searchParams.get('type') || 'all';
    const zoneFilter = searchParams.get('zone');

    // Check farm exists and is accessible
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND (is_public = 1 OR user_id = ?)",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json(
        { error: "Farm not found or not accessible" },
        { status: 404 }
      );
    }

    // Build query with filters
    let sql = `
      SELECT p.*,
             u.name as author_name,
             u.image as author_image,
             ai.screenshot_data as ai_screenshot,
             (SELECT reaction_type FROM post_reactions
              WHERE post_id = p.id AND user_id = ?) as user_reaction
      FROM farm_posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
      WHERE p.farm_id = ? AND p.is_published = 1
    `;

    const args: any[] = [session.user.id, farmId];

    // Add cursor filter (for pagination)
    if (cursor) {
      // Get the created_at timestamp of the cursor post
      const cursorResult = await db.execute({
        sql: "SELECT created_at FROM farm_posts WHERE id = ?",
        args: [cursor],
      });

      if (cursorResult.rows.length > 0) {
        const cursorTimestamp = (cursorResult.rows[0] as any).created_at;
        sql += ` AND p.created_at < ?`;
        args.push(cursorTimestamp);
      }
    }

    // Add type filter
    if (typeFilter !== 'all') {
      sql += ` AND p.post_type = ?`;
      args.push(typeFilter);
    }

    // Add zone filter (JSON search)
    if (zoneFilter) {
      sql += ` AND p.tagged_zones LIKE ?`;
      args.push(`%"${zoneFilter}"%`);
    }

    // Order and limit
    sql += ` ORDER BY p.created_at DESC LIMIT ?`;
    args.push(limit + 1); // Fetch one extra to check if there are more

    // Execute query
    const postsResult = await db.execute({ sql, args });

    // Check if there are more posts
    const hasMore = postsResult.rows.length > limit;
    const posts = postsResult.rows.slice(0, limit);

    // Format posts
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
        type: post.post_type,
        content: post.content,
        media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
        ai_conversation_id: post.ai_conversation_id,
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
      };
    });

    // Get next cursor (last post ID)
    const nextCursor = hasMore && formattedPosts.length > 0
      ? formattedPosts[formattedPosts.length - 1].id
      : null;

    return Response.json({
      posts: formattedPosts,
      next_cursor: nextCursor,
      has_more: hasMore,
    });
  } catch (error) {
    console.error("Get feed error:", error);
    return Response.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
}

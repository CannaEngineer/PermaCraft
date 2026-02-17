import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Community Feed API
 *
 * Enhanced gallery feed with page-based pagination, text search,
 * zone type filtering, climate zone filtering, and sort modes.
 *
 * Query params:
 *   page        - Page number (default: 1)
 *   limit       - Items per page (default: 12, max: 50)
 *   search      - Text search on post content and farm name
 *   zone_type   - Filter by zone type tag (food_forest, water_features, annual_garden, orchard, woodland)
 *   climate_zone - Filter by farm climate zone
 *   sort        - Sort mode: 'recent' | 'popular' | 'trending' (default: 'recent')
 *
 * Returns: { posts, total, page, limit, hasMore }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search")?.trim() || "";
    const zoneType = searchParams.get("zone_type") || "";
    const climateZone = searchParams.get("climate_zone") || "";
    const sort = searchParams.get("sort") || "recent";

    const userId = session?.user?.id || null;

    // Build the base SELECT with optional user-specific columns
    let selectSql: string;
    const args: any[] = [];

    if (userId) {
      selectSql = `
        SELECT p.*,
               u.name as author_name,
               u.image as author_image,
               f.name as farm_name,
               f.description as farm_description,
               f.location_description,
               f.climate_zone as farm_climate_zone,
               ai.screenshot_data as ai_screenshot,
               (SELECT reaction_type FROM post_reactions
                WHERE post_id = p.id AND user_id = ?) as user_reaction,
               (SELECT 1 FROM saved_posts
                WHERE post_id = p.id AND user_id = ?) as is_bookmarked
        FROM farm_posts p
        JOIN users u ON p.author_id = u.id
        JOIN farms f ON p.farm_id = f.id
        LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
        WHERE f.is_public = 1 AND p.is_published = 1
      `;
      args.push(userId, userId);
    } else {
      selectSql = `
        SELECT p.*,
               u.name as author_name,
               u.image as author_image,
               f.name as farm_name,
               f.description as farm_description,
               f.location_description,
               f.climate_zone as farm_climate_zone,
               ai.screenshot_data as ai_screenshot,
               NULL as user_reaction,
               NULL as is_bookmarked
        FROM farm_posts p
        JOIN users u ON p.author_id = u.id
        JOIN farms f ON p.farm_id = f.id
        LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
        WHERE f.is_public = 1 AND p.is_published = 1
      `;
    }

    // Reusable WHERE clause conditions (appended to both data + count queries)
    let whereClause = "";
    const filterArgs: any[] = [];

    // Text search on post content and farm name
    if (search) {
      whereClause += ` AND (p.content LIKE ? OR f.name LIKE ?)`;
      const searchWild = `%${search}%`;
      filterArgs.push(searchWild, searchWild);
    }

    // Zone type filter: match against tagged_zones JSON array
    if (zoneType && zoneType !== "all") {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM json_each(p.tagged_zones)
        WHERE json_each.value LIKE ?
      )`;
      filterArgs.push(`%${zoneType}%`);
    }

    // Climate zone filter on the farm
    if (climateZone && climateZone !== "all") {
      whereClause += ` AND f.climate_zone = ?`;
      filterArgs.push(climateZone);
    }

    // Determine ORDER BY based on sort mode
    // trending = high (view_count + reaction_count) in the last 7 days
    // We approximate trending using a weighted score from the denormalized counters,
    // boosted for posts created within the last 7 days (604800 seconds)
    let orderBy: string;
    switch (sort) {
      case "popular":
        orderBy = `ORDER BY (p.reaction_count + p.comment_count + p.view_count) DESC, p.created_at DESC`;
        break;
      case "trending":
        // Posts from last 7 days weighted heavily; older posts ranked by raw score
        orderBy = `ORDER BY (
          CASE WHEN p.created_at >= (unixepoch() - 604800)
               THEN (p.view_count + p.reaction_count * 3) * 2
               ELSE (p.view_count + p.reaction_count * 3)
          END
        ) DESC, p.created_at DESC`;
        break;
      case "recent":
      default:
        orderBy = `ORDER BY p.created_at DESC`;
        break;
    }

    // Count query for pagination metadata
    const countArgs = [...(userId ? [userId, userId] : []), ...filterArgs];
    const countSql = `
      SELECT COUNT(*) as total
      FROM farm_posts p
      JOIN users u ON p.author_id = u.id
      JOIN farms f ON p.farm_id = f.id
      LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
      WHERE f.is_public = 1 AND p.is_published = 1
      ${whereClause}
    `;

    const dataArgs = [...args, ...filterArgs, limit, offset];
    const dataSql = `${selectSql}${whereClause} ${orderBy} LIMIT ? OFFSET ?`;

    const [countResult, postsResult] = await Promise.all([
      db.execute({ sql: countSql, args: countArgs }),
      db.execute({ sql: dataSql, args: dataArgs }),
    ]);

    const total = (countResult.rows[0] as any)?.total ?? 0;
    const hasMore = offset + limit < total;

    const formattedPosts = postsResult.rows.map((post: any) => {
      // Parse ai_screenshot JSON array and get first URL
      let aiScreenshot: string | null = null;
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
        location_description: post.location_description,
        climate_zone: post.farm_climate_zone,
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
        reaction_count: post.reaction_count ?? 0,
        comment_count: post.comment_count ?? 0,
        view_count: post.view_count ?? 0,
        created_at: post.created_at,
        user_reaction: post.user_reaction ?? null,
        is_bookmarked: post.is_bookmarked === 1,
      };
    });

    return Response.json({
      posts: formattedPosts,
      total,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error("Community feed error:", error);
    return Response.json(
      { error: "Failed to load community feed" },
      { status: 500 }
    );
  }
}

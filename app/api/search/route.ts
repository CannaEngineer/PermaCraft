import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const contextParam = searchParams.get("context") || "global";
    const validContexts = ["my-farms", "community", "global"] as const;
    const context = validContexts.includes(contextParam as any) ? contextParam : "global";

    if (!query || query.length < 3) {
      return Response.json({
        farms: [],
        posts: [],
        species: [],
        zones: [],
        users: [],
        ai_conversations: [],
      });
    }

    const searchQuery = `%${query.replace(/[%_]/g, '\\$&')}%`;
    const results = {
      farms: [],
      posts: [],
      species: [],
      zones: [],
      users: [],
      ai_conversations: [],
    };

    // Search Farms
    if (context === "my-farms") {
      // Only user's farms
      const farmsResult = await db.execute({
        sql: `SELECT f.*,
              (SELECT screenshot_data FROM ai_analyses
               WHERE farm_id = f.id AND screenshot_data IS NOT NULL
               ORDER BY created_at DESC LIMIT 1) as latest_screenshot_json
              FROM farms f
              WHERE f.user_id = ? AND (f.name LIKE ? OR f.description LIKE ?)
              ORDER BY f.updated_at DESC
              LIMIT 3`,
        args: [session.user.id, searchQuery, searchQuery],
      });

      results.farms = farmsResult.rows.map((row: any) => {
        let imageUrl = null;
        if (row.latest_screenshot_json) {
          try {
            const urls = JSON.parse(row.latest_screenshot_json);
            imageUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
          } catch (e) {
            console.error('Failed to parse screenshot JSON:', e);
          }
        }
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          owner_name: session.user.name,
          owner_image: session.user.image,
          is_public: row.is_public,
          image_url: imageUrl,
          acres: row.acres,
        };
      });
    } else if (context === "community") {
      // Only public farms
      const farmsResult = await db.execute({
        sql: `SELECT f.*, u.name as owner_name, u.image as owner_image,
              (SELECT screenshot_data FROM ai_analyses
               WHERE farm_id = f.id AND screenshot_data IS NOT NULL
               ORDER BY created_at DESC LIMIT 1) as latest_screenshot_json
              FROM farms f
              JOIN users u ON f.user_id = u.id
              WHERE f.is_public = 1 AND (f.name LIKE ? OR f.description LIKE ?)
              ORDER BY f.updated_at DESC
              LIMIT 3`,
        args: [searchQuery, searchQuery],
      });

      results.farms = farmsResult.rows.map((row: any) => {
        let imageUrl = null;
        if (row.latest_screenshot_json) {
          try {
            const urls = JSON.parse(row.latest_screenshot_json);
            imageUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
          } catch (e) {
            console.error('Failed to parse screenshot JSON:', e);
          }
        }
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          owner_name: row.owner_name,
          owner_image: row.owner_image,
          is_public: row.is_public,
          image_url: imageUrl,
          acres: row.acres,
        };
      });
    } else {
      // Global: owned OR public
      const farmsResult = await db.execute({
        sql: `SELECT f.*, u.name as owner_name, u.image as owner_image,
              (SELECT screenshot_data FROM ai_analyses
               WHERE farm_id = f.id AND screenshot_data IS NOT NULL
               ORDER BY created_at DESC LIMIT 1) as latest_screenshot_json
              FROM farms f
              JOIN users u ON f.user_id = u.id
              WHERE (f.user_id = ? OR f.is_public = 1)
              AND (f.name LIKE ? OR f.description LIKE ?)
              ORDER BY f.updated_at DESC
              LIMIT 3`,
        args: [session.user.id, searchQuery, searchQuery],
      });

      results.farms = farmsResult.rows.map((row: any) => {
        let imageUrl = null;
        if (row.latest_screenshot_json) {
          try {
            const urls = JSON.parse(row.latest_screenshot_json);
            imageUrl = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
          } catch (e) {
            console.error('Failed to parse screenshot JSON:', e);
          }
        }
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          owner_name: row.owner_name,
          owner_image: row.owner_image,
          is_public: row.is_public,
          image_url: imageUrl,
          acres: row.acres,
        };
      });
    }

    // Search Posts
    if (context === "community" || context === "global") {
      const postsResult = await db.execute({
        sql: `SELECT p.*, u.name as author_name, u.image as author_image,
              f.name as farm_name,
              ai.screenshot_data as ai_screenshot
              FROM farm_posts p
              JOIN users u ON p.author_id = u.id
              JOIN farms f ON p.farm_id = f.id
              LEFT JOIN ai_analyses ai ON p.ai_analysis_id = ai.id
              WHERE p.is_published = 1
              AND f.is_public = 1
              AND (p.content LIKE ? OR p.hashtags LIKE ?)
              ORDER BY p.created_at DESC
              LIMIT 3`,
        args: [searchQuery, searchQuery],
      });

      results.posts = postsResult.rows.map((post: any) => {
        let aiScreenshot = null;
        if (post.ai_screenshot) {
          try {
            const urls = JSON.parse(post.ai_screenshot);
            aiScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
          } catch (e) {
            console.error('Failed to parse screenshot JSON:', e);
            aiScreenshot = post.ai_screenshot;
          }
        }

        return {
          id: post.id,
          farm_id: post.farm_id,
          farm_name: post.farm_name,
          content_preview: post.content ? post.content.substring(0, 100) : "",
          author_name: post.author_name,
          author_image: post.author_image,
          type: post.post_type,
          created_at: post.created_at,
          ai_screenshot: aiScreenshot,
        };
      });
    }

    // Search Species (available in all contexts)
    const speciesResult = await db.execute({
      sql: `SELECT id, common_name, scientific_name, layer, description
            FROM species
            WHERE common_name LIKE ? OR scientific_name LIKE ?
            ORDER BY common_name ASC
            LIMIT 3`,
      args: [searchQuery, searchQuery],
    });

    results.species = speciesResult.rows.map((s: any) => ({
      id: s.id,
      common_name: s.common_name,
      scientific_name: s.scientific_name,
      layer: s.layer,
      description: s.description,
    }));

    // Search Zones (my-farms and global only)
    if (context === "my-farms" || context === "global") {
      const zonesResult = await db.execute({
        sql: `SELECT z.*, f.name as farm_name
              FROM zones z
              JOIN farms f ON z.farm_id = f.id
              WHERE f.user_id = ?
              AND (z.name LIKE ? OR z.zone_type LIKE ?)
              ORDER BY z.updated_at DESC
              LIMIT 3`,
        args: [session.user.id, searchQuery, searchQuery],
      });

      results.zones = zonesResult.rows.map((z: any) => ({
        id: z.id,
        farm_id: z.farm_id,
        farm_name: z.farm_name,
        name: z.name,
        zone_type: z.zone_type,
      }));
    }

    // Search Users (global only)
    if (context === "global") {
      const usersResult = await db.execute({
        sql: `SELECT u.id, u.name, u.image,
              (SELECT COUNT(*) FROM farms WHERE user_id = u.id AND is_public = 1) as farm_count
              FROM users u
              WHERE u.name LIKE ?
              LIMIT 3`,
        args: [searchQuery],
      });

      results.users = usersResult.rows.map((u: any) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        farm_count: u.farm_count,
      }));
    }

    // Search AI Conversations (my-farms and global only)
    if (context === "my-farms" || context === "global") {
      const conversationsResult = await db.execute({
        sql: `SELECT c.*, f.name as farm_name
              FROM ai_conversations c
              JOIN farms f ON c.farm_id = f.id
              WHERE f.user_id = ?
              AND c.title LIKE ?
              ORDER BY c.updated_at DESC
              LIMIT 3`,
        args: [session.user.id, searchQuery],
      });

      results.ai_conversations = conversationsResult.rows.map((c: any) => ({
        id: c.id,
        farm_id: c.farm_id,
        farm_name: c.farm_name,
        title: c.title,
        created_at: c.created_at,
      }));
    }

    return Response.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return Response.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}

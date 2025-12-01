import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { FarmPost } from "@/lib/db/schema";

/**
 * Create Post API Route
 *
 * POST /api/farms/[id]/posts
 *
 * Creates a new post on a farm. Only farm owners can create posts.
 *
 * Post Types:
 * - text: Simple text update
 * - photo: Photos with caption
 * - ai_insight: Curated AI conversation excerpt
 *
 * Request Body:
 * {
 *   type: "text" | "photo" | "ai_insight",
 *   content: "Post content...",
 *   media_urls?: ["https://r2.../photo.jpg"],
 *   ai_conversation_id?: "conv_123",
 *   ai_response_excerpt?: "The AI said...",
 *   tagged_zones?: ["zone_1", "zone_2"],
 *   hashtags?: ["swale", "waterwork"]
 * }
 */

const createPostSchema = z.object({
  type: z.enum(['text', 'photo', 'ai_insight']),
  content: z.string().optional(),
  media_urls: z.array(z.string()).optional(),
  ai_conversation_id: z.string().optional(),
  ai_response_excerpt: z.string().optional(),
  tagged_zones: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const farmId = params.id;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json(
        { error: "Farm not found or you don't have permission" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createPostSchema.parse(body);

    // Validate AI conversation if provided
    if (validatedData.ai_conversation_id) {
      const conversationResult = await db.execute({
        sql: "SELECT * FROM ai_conversations WHERE id = ? AND farm_id = ?",
        args: [validatedData.ai_conversation_id, farmId],
      });

      if (conversationResult.rows.length === 0) {
        return Response.json(
          { error: "AI conversation not found" },
          { status: 404 }
        );
      }
    }

    // Create post
    const postId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO farm_posts (
              id, farm_id, author_id, post_type,
              content, media_urls, ai_conversation_id, ai_response_excerpt,
              tagged_zones, hashtags, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      args: [
        postId,
        farmId,
        session.user.id,
        validatedData.type,
        validatedData.content || null,
        validatedData.media_urls ? JSON.stringify(validatedData.media_urls) : null,
        validatedData.ai_conversation_id || null,
        validatedData.ai_response_excerpt || null,
        validatedData.tagged_zones ? JSON.stringify(validatedData.tagged_zones) : null,
        validatedData.hashtags ? JSON.stringify(validatedData.hashtags) : null,
      ],
    });

    // Fetch created post with author info
    const createdPost = await db.execute({
      sql: `SELECT p.*,
                   u.name as author_name,
                   u.image as author_image
            FROM farm_posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.id = ?`,
      args: [postId],
    });

    const post = createdPost.rows[0] as any;

    // Format response
    const formattedPost = {
      id: post.id,
      farm_id: post.farm_id,
      type: post.post_type,
      content: post.content,
      media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
      ai_conversation_id: post.ai_conversation_id,
      ai_response_excerpt: post.ai_response_excerpt,
      tagged_zones: post.tagged_zones ? JSON.parse(post.tagged_zones) : null,
      hashtags: post.hashtags ? JSON.parse(post.hashtags) : null,
      author: {
        id: post.author_id,
        name: post.author_name,
        image: post.author_image,
      },
      reactions: {},
      reaction_count: 0,
      comment_count: 0,
      view_count: 0,
      created_at: post.created_at,
      user_reaction: null,
    };

    return Response.json({
      post: formattedPost,
      success: true,
    });
  } catch (error) {
    console.error("Create post error:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}

/**
 * Get Posts for Farm
 *
 * GET /api/farms/[id]/posts
 *
 * Returns paginated list of posts for a farm.
 * Used by farm-specific post lists (not the main feed).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const farmId = params.id;

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

    // Get posts with author info
    const postsResult = await db.execute({
      sql: `SELECT p.*,
                   u.name as author_name,
                   u.image as author_image
            FROM farm_posts p
            JOIN users u ON p.author_id = u.id
            WHERE p.farm_id = ? AND p.is_published = 1
            ORDER BY p.created_at DESC
            LIMIT 50`,
      args: [farmId],
    });

    const posts = postsResult.rows.map((post: any) => ({
      id: post.id,
      farm_id: post.farm_id,
      type: post.post_type,
      content: post.content,
      media_urls: post.media_urls ? JSON.parse(post.media_urls) : null,
      ai_conversation_id: post.ai_conversation_id,
      ai_response_excerpt: post.ai_response_excerpt,
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
    }));

    return Response.json({ posts });
  } catch (error) {
    console.error("Get posts error:", error);
    return Response.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

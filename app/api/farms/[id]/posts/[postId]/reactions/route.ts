import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

/**
 * Toggle Reaction API Route
 *
 * POST /api/farms/[id]/posts/[postId]/reactions
 *
 * Toggles a reaction on a post (add if doesn't exist, remove if exists).
 * Updates denormalized reaction_count on the post.
 * Creates notification for post author.
 *
 * Request Body:
 * {
 *   reaction_type: "heart" | "seedling" | "bulb" | "fire"
 * }
 *
 * Response:
 * {
 *   action: "added" | "removed",
 *   new_count: 13,
 *   user_reaction: "heart" | null
 * }
 */

const reactionSchema = z.object({
  reaction_type: z.enum(['heart', 'seedling', 'bulb', 'fire']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, postId } = params;

    // Parse and validate request body
    const body = await request.json();
    const { reaction_type } = reactionSchema.parse(body);

    // Check if post exists
    const postResult = await db.execute({
      sql: `SELECT p.*, f.user_id as farm_owner_id
            FROM farm_posts p
            JOIN farms f ON p.farm_id = f.id
            WHERE p.id = ? AND p.farm_id = ?`,
      args: [postId, farmId],
    });

    if (postResult.rows.length === 0) {
      return Response.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    const post = postResult.rows[0] as any;

    // Check if reaction already exists
    const existingReaction = await db.execute({
      sql: `SELECT * FROM post_reactions
            WHERE post_id = ? AND user_id = ?`,
      args: [postId, session.user.id],
    });

    let action: 'added' | 'removed';
    let newCount: number;
    let userReaction: string | null;

    if (existingReaction.rows.length > 0) {
      const existing = existingReaction.rows[0] as any;

      // If same reaction type, remove it (unlike)
      if (existing.reaction_type === reaction_type) {
        await db.execute({
          sql: `DELETE FROM post_reactions WHERE id = ?`,
          args: [existing.id],
        });

        // Decrement counter
        await db.execute({
          sql: `UPDATE farm_posts
                SET reaction_count = reaction_count - 1
                WHERE id = ?`,
          args: [postId],
        });

        action = 'removed';
        newCount = post.reaction_count - 1;
        userReaction = null;
      } else {
        // Different reaction type, update it
        await db.execute({
          sql: `UPDATE post_reactions
                SET reaction_type = ?
                WHERE id = ?`,
          args: [reaction_type, existing.id],
        });

        action = 'added';
        newCount = post.reaction_count;
        userReaction = reaction_type;
      }
    } else {
      // Add new reaction
      await db.execute({
        sql: `INSERT INTO post_reactions (id, post_id, user_id, reaction_type, created_at)
              VALUES (?, ?, ?, ?, unixepoch())`,
        args: [crypto.randomUUID(), postId, session.user.id, reaction_type],
      });

      // Increment counter
      await db.execute({
        sql: `UPDATE farm_posts
              SET reaction_count = reaction_count + 1
              WHERE id = ?`,
        args: [postId],
      });

      action = 'added';
      newCount = post.reaction_count + 1;
      userReaction = reaction_type;

      // Create notification for post author (if not reacting to own post)
      if (post.author_id !== session.user.id) {
        await db.execute({
          sql: `INSERT INTO notifications (
                  id, user_id, notification_type, post_id,
                  triggered_by_user_id, content_preview, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
          args: [
            crypto.randomUUID(),
            post.author_id,
            'reaction',
            postId,
            session.user.id,
            `reacted ${reaction_type} to your post`,
          ],
        });
      }
    }

    return Response.json({
      action,
      new_count: newCount,
      user_reaction: userReaction,
    });
  } catch (error) {
    console.error("Toggle reaction error:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid reaction type", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Failed to toggle reaction" },
      { status: 500 }
    );
  }
}

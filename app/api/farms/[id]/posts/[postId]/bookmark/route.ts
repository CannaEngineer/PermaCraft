import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * Toggle Bookmark API Route
 *
 * POST /api/farms/[id]/posts/[postId]/bookmark
 *
 * Toggles a bookmark on a post (add if doesn't exist, remove if exists).
 * Uses the saved_posts table with unique constraint on (user_id, post_id).
 *
 * Response:
 * {
 *   action: "added" | "removed",
 *   is_bookmarked: true | false
 * }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, postId } = params;

    // Check if post exists
    const postResult = await db.execute({
      sql: `SELECT p.id
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

    // Check if bookmark already exists
    const existingBookmark = await db.execute({
      sql: `SELECT id FROM saved_posts
            WHERE user_id = ? AND post_id = ?`,
      args: [session.user.id, postId],
    });

    let action: 'added' | 'removed';
    let isBookmarked: boolean;

    if (existingBookmark.rows.length > 0) {
      // Remove bookmark
      await db.execute({
        sql: `DELETE FROM saved_posts WHERE id = ?`,
        args: [(existingBookmark.rows[0] as any).id],
      });

      action = 'removed';
      isBookmarked = false;
    } else {
      // Add bookmark
      await db.execute({
        sql: `INSERT INTO saved_posts (id, user_id, post_id, created_at)
              VALUES (?, ?, ?, unixepoch())`,
        args: [crypto.randomUUID(), session.user.id, postId],
      });

      action = 'added';
      isBookmarked = true;
    }

    return Response.json({
      action,
      is_bookmarked: isBookmarked,
    });
  } catch (error) {
    console.error("Toggle bookmark error:", error);

    return Response.json(
      { error: "Failed to toggle bookmark" },
      { status: 500 }
    );
  }
}

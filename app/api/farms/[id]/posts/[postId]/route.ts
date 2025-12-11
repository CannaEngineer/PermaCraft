import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * DELETE /api/farms/[id]/posts/[postId]
 * Delete a post (author only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, postId } = params;

    // Get the post to check ownership
    const postResult = await db.execute({
      sql: `SELECT author_id, farm_id FROM farm_posts WHERE id = ?`,
      args: [postId],
    });

    const post = postResult.rows[0] as any;

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    // Verify the user is the author
    if (post.author_id !== session.user.id) {
      return Response.json(
        { error: "Only the post author can delete this post" },
        { status: 403 }
      );
    }

    // Verify the post belongs to the specified farm
    if (post.farm_id !== farmId) {
      return Response.json(
        { error: "Post does not belong to this farm" },
        { status: 400 }
      );
    }

    // Delete the post (CASCADE will handle related data)
    await db.execute({
      sql: `DELETE FROM farm_posts WHERE id = ?`,
      args: [postId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete post error:", error);
    return Response.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}

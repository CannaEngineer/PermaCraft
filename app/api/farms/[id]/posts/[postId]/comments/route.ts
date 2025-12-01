import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

/**
 * Comments API Route
 *
 * GET /api/farms/[id]/posts/[postId]/comments
 * Returns nested tree of comments for a post
 *
 * POST /api/farms/[id]/posts/[postId]/comments
 * Creates a new comment (top-level or reply)
 */

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_comment_id: z.string().optional(),
});

/**
 * Get Comments (with nested tree structure)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    const session = await requireAuth();
    const { postId } = params;

    // Fetch all comments for post
    const commentsResult = await db.execute({
      sql: `SELECT c.*,
                   u.name as author_name,
                   u.image as author_image,
                   (SELECT reaction_type FROM post_reactions
                    WHERE comment_id = c.id AND user_id = ?) as user_reaction
            FROM post_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.post_id = ? AND c.is_deleted = 0
            ORDER BY c.created_at ASC`,
      args: [session.user.id, postId],
    });

    // Build nested tree structure
    const commentMap = new Map();
    const rootComments: any[] = [];

    // First pass: create comment objects
    commentsResult.rows.forEach((row: any) => {
      const comment = {
        id: row.id,
        post_id: row.post_id,
        parent_comment_id: row.parent_comment_id,
        author: {
          id: row.author_id,
          name: row.author_name,
          image: row.author_image,
        },
        content: row.content,
        reaction_count: row.reaction_count,
        user_reaction: row.user_reaction,
        created_at: row.created_at,
        replies: [],
      };
      commentMap.set(row.id, comment);
    });

    // Second pass: build tree structure
    commentsResult.rows.forEach((row: any) => {
      const comment = commentMap.get(row.id);
      if (row.parent_comment_id) {
        // It's a reply - add to parent's replies
        const parent = commentMap.get(row.parent_comment_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        // Top-level comment
        rootComments.push(comment);
      }
    });

    return Response.json({
      comments: rootComments,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return Response.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

/**
 * Create Comment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; postId: string } }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, postId } = params;

    // Parse and validate request body
    const body = await request.json();
    const { content, parent_comment_id } = createCommentSchema.parse(body);

    // Check if post exists
    const postResult = await db.execute({
      sql: `SELECT p.*, u.name as author_name
            FROM farm_posts p
            JOIN users u ON p.author_id = u.id
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

    // If replying to a comment, verify it exists
    if (parent_comment_id) {
      const parentResult = await db.execute({
        sql: `SELECT * FROM post_comments WHERE id = ? AND post_id = ?`,
        args: [parent_comment_id, postId],
      });

      if (parentResult.rows.length === 0) {
        return Response.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    // Create comment
    const commentId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO post_comments (
              id, post_id, parent_comment_id, author_id,
              content, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      args: [
        commentId,
        postId,
        parent_comment_id || null,
        session.user.id,
        content,
      ],
    });

    // Increment comment count on post
    await db.execute({
      sql: `UPDATE farm_posts
            SET comment_count = comment_count + 1
            WHERE id = ?`,
      args: [postId],
    });

    // Create notification
    let notificationUserId: string;
    let notificationType: 'comment' | 'reply';

    if (parent_comment_id) {
      // Notify parent comment author
      const parentComment = await db.execute({
        sql: `SELECT author_id FROM post_comments WHERE id = ?`,
        args: [parent_comment_id],
      });
      notificationUserId = (parentComment.rows[0] as any).author_id;
      notificationType = 'reply';
    } else {
      // Notify post author
      notificationUserId = post.author_id;
      notificationType = 'comment';
    }

    // Don't notify if commenting on own post/comment
    if (notificationUserId !== session.user.id) {
      await db.execute({
        sql: `INSERT INTO notifications (
                id, user_id, notification_type, post_id, comment_id,
                triggered_by_user_id, content_preview, created_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())`,
        args: [
          crypto.randomUUID(),
          notificationUserId,
          notificationType,
          postId,
          commentId,
          session.user.id,
          content.substring(0, 100),
        ],
      });
    }

    // Fetch created comment with author info
    const createdComment = await db.execute({
      sql: `SELECT c.*,
                   u.name as author_name,
                   u.image as author_image
            FROM post_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.id = ?`,
      args: [commentId],
    });

    const comment = createdComment.rows[0] as any;

    return Response.json({
      comment: {
        id: comment.id,
        post_id: comment.post_id,
        parent_comment_id: comment.parent_comment_id,
        author: {
          id: comment.author_id,
          name: comment.author_name,
          image: comment.author_image,
        },
        content: comment.content,
        reaction_count: 0,
        user_reaction: null,
        created_at: comment.created_at,
        replies: [],
      },
      new_comment_count: post.comment_count + 1,
    });
  } catch (error) {
    console.error("Create comment error:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}

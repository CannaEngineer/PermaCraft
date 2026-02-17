import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const result = await db.execute({
      sql: `SELECT c.*, u.name as author_name, u.image as author_image
            FROM post_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.post_id = ? AND c.is_deleted = 0
            ORDER BY c.created_at ASC`,
      args: [params.postId]
    });
    return Response.json(result.rows);
  } catch (error) {
    console.error('Fetch comments failed:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await requireAuth();
    const { content, parent_comment_id } = await request.json();

    if (!content?.trim()) {
      return new Response('Comment content is required', { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `INSERT INTO post_comments (id, post_id, author_id, parent_comment_id, content, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, params.postId, session.user.id, parent_comment_id ?? null, content.trim(), now, now]
    });

    await db.execute({
      sql: `UPDATE farm_posts SET comment_count = comment_count + 1 WHERE id = ?`,
      args: [params.postId]
    });

    const created = await db.execute({
      sql: `SELECT c.*, u.name as author_name, u.image as author_image
            FROM post_comments c JOIN users u ON c.author_id = u.id WHERE c.id = ?`,
      args: [id]
    });

    return Response.json(created.rows[0], { status: 201 });
  } catch (error) {
    console.error('Create comment failed:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

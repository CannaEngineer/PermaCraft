import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const countsResult = await db.execute({
      sql: `SELECT reaction_type, COUNT(*) as count FROM post_reactions
            WHERE post_id = ? GROUP BY reaction_type`,
      args: [params.postId]
    });

    const counts: Record<string, number> = { like: 0, love: 0, insightful: 0, inspiring: 0 };
    for (const row of countsResult.rows) {
      counts[row.reaction_type as string] = Number(row.count);
    }

    return Response.json({ counts, userReaction: null });
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await requireAuth();
    const { reaction_type } = await request.json();

    const valid = ['like', 'love', 'insightful', 'inspiring'];
    if (!valid.includes(reaction_type)) {
      return new Response('Invalid reaction type', { status: 400 });
    }

    const existing = await db.execute({
      sql: 'SELECT id, reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ?',
      args: [params.postId, session.user.id]
    });

    let action: string;

    if (existing.rows.length > 0) {
      const currentType = existing.rows[0].reaction_type as string;
      if (currentType === reaction_type) {
        // Remove reaction
        await db.execute({
          sql: 'DELETE FROM post_reactions WHERE id = ?',
          args: [existing.rows[0].id]
        });
        await db.execute({
          sql: 'UPDATE farm_posts SET reaction_count = MAX(0, reaction_count - 1) WHERE id = ?',
          args: [params.postId]
        });
        action = 'removed';
      } else {
        // Change reaction
        await db.execute({
          sql: 'UPDATE post_reactions SET reaction_type = ? WHERE id = ?',
          args: [reaction_type, existing.rows[0].id]
        });
        action = 'changed';
      }
    } else {
      // Add reaction
      await db.execute({
        sql: 'INSERT INTO post_reactions (id, post_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, ?, unixepoch())',
        args: [crypto.randomUUID(), params.postId, session.user.id, reaction_type]
      });
      await db.execute({
        sql: 'UPDATE farm_posts SET reaction_count = reaction_count + 1 WHERE id = ?',
        args: [params.postId]
      });
      action = 'added';
    }

    const countsResult = await db.execute({
      sql: 'SELECT reaction_type, COUNT(*) as count FROM post_reactions WHERE post_id = ? GROUP BY reaction_type',
      args: [params.postId]
    });

    const counts: Record<string, number> = { like: 0, love: 0, insightful: 0, inspiring: 0 };
    for (const row of countsResult.rows) {
      counts[row.reaction_type as string] = Number(row.count);
    }

    const userReaction = action === 'removed' ? null : reaction_type;
    return Response.json({ action, reaction_type, counts, userReaction });
  } catch (error) {
    console.error('Reaction failed:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

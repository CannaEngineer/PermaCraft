import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const followResult = await db.execute({
      sql: 'SELECT 1 FROM user_follows WHERE follower_id = ? AND followed_id = ?',
      args: [session.user.id, id],
    });

    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM user_follows WHERE followed_id = ?',
      args: [id],
    });

    return Response.json({
      following: followResult.rows.length > 0,
      follower_count: (countResult.rows[0] as any).count,
    });
  } catch (error) {
    console.error('Check follow status error:', error);
    return Response.json({ error: 'Failed to check follow status' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    if (session.user.id === id) {
      return Response.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if user exists
    const userCheck = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [id],
    });
    if (userCheck.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Check current follow status
    const existingFollow = await db.execute({
      sql: 'SELECT id FROM user_follows WHERE follower_id = ? AND followed_id = ?',
      args: [session.user.id, id],
    });

    let following: boolean;

    if (existingFollow.rows.length > 0) {
      // Unfollow
      await db.execute({
        sql: 'DELETE FROM user_follows WHERE follower_id = ? AND followed_id = ?',
        args: [session.user.id, id],
      });
      following = false;
    } else {
      // Follow
      const followId = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO user_follows (id, follower_id, followed_id) VALUES (?, ?, ?)',
        args: [followId, session.user.id, id],
      });
      following = true;

      // Create notification for the followed user
      // Using 'mention' type as a fallback since 'follow' isn't in the current CHECK constraint
      try {
        const notificationId = crypto.randomUUID();
        await db.execute({
          sql: `INSERT INTO notifications (id, user_id, notification_type, triggered_by_user_id, content_preview)
                VALUES (?, ?, 'mention', ?, ?)`,
          args: [notificationId, id, session.user.id, `${session.user.name} started following you`],
        });
      } catch {
        // Non-critical: don't fail follow action if notification fails
      }
    }

    // Get updated follower count
    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM user_follows WHERE followed_id = ?',
      args: [id],
    });

    return Response.json({
      following,
      follower_count: (countResult.rows[0] as any).count,
    });
  } catch (error) {
    console.error('Toggle follow error:', error);
    return Response.json({ error: 'Failed to toggle follow' }, { status: 500 });
  }
}

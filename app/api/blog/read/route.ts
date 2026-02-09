import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { z } from 'zod';

const readSchema = z.object({
  postId: z.string(),
  action: z.enum(['start', 'complete']),
});

export async function POST(request: Request) {
  try {
    // Get current user
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { postId, action } = readSchema.parse(body);

    // Get blog post
    const postResult = await db.execute({
      sql: 'SELECT * FROM blog_posts WHERE id = ? AND is_published = 1',
      args: [postId],
    });

    if (postResult.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = postResult.rows[0] as any;

    if (action === 'start') {
      // Record read start (insert or ignore if already exists)
      await db.execute({
        sql: `
          INSERT OR IGNORE INTO blog_post_reads (id, user_id, blog_post_id, started_at)
          VALUES (?, ?, ?, unixepoch())
        `,
        args: [crypto.randomUUID(), userId, postId],
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'complete') {
      // Check if already completed
      const readResult = await db.execute({
        sql: 'SELECT * FROM blog_post_reads WHERE user_id = ? AND blog_post_id = ?',
        args: [userId, postId],
      });

      if (readResult.rows.length === 0) {
        // Create new read record with completion
        await db.execute({
          sql: `
            INSERT INTO blog_post_reads (id, user_id, blog_post_id, started_at, completed_at, xp_earned)
            VALUES (?, ?, ?, unixepoch(), unixepoch(), ?)
          `,
          args: [crypto.randomUUID(), userId, postId, post.xp_reward],
        });
      } else {
        const read = readResult.rows[0] as any;

        // If already completed, don't award XP again
        if (read.completed_at) {
          return NextResponse.json({ success: true, xpEarned: 0 });
        }

        // Mark as completed and record XP
        await db.execute({
          sql: `
            UPDATE blog_post_reads
            SET completed_at = unixepoch(), xp_earned = ?
            WHERE user_id = ? AND blog_post_id = ?
          `,
          args: [post.xp_reward, userId, postId],
        });
      }

      // Update blog post read count
      await db.execute({
        sql: 'UPDATE blog_posts SET read_count = read_count + 1 WHERE id = ?',
        args: [postId],
      });

      // Check for blog reading badges
      const badgesUnlocked = await checkBlogBadges(userId);

      return NextResponse.json({
        success: true,
        xpEarned: post.xp_reward,
        badgesUnlocked,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Blog read tracking error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track read' },
      { status: 500 }
    );
  }
}

async function checkBlogBadges(userId: string) {
  const badgesUnlocked = [];

  // Count completed blog reads
  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM blog_post_reads WHERE user_id = ? AND completed_at IS NOT NULL',
    args: [userId],
  });
  const readCount = (countResult.rows[0] as any).count;

  // Define blog badges
  const blogBadges = [
    { id: 'badge_blog_reader', threshold: 1 },
    { id: 'badge_avid_reader', threshold: 10 },
    { id: 'badge_blog_scholar', threshold: 25 },
    { id: 'badge_blog_master', threshold: 50 },
  ];

  // Check each badge
  for (const badge of blogBadges) {
    if (readCount >= badge.threshold) {
      // Check if user already has this badge
      const existingResult = await db.execute({
        sql: 'SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?',
        args: [userId, badge.id],
      });

      if (existingResult.rows.length === 0) {
        // Award badge
        await db.execute({
          sql: 'INSERT INTO user_badges (id, user_id, badge_id, earned_at) VALUES (?, ?, ?, unixepoch())',
          args: [crypto.randomUUID(), userId, badge.id],
        });

        // Get badge details
        const badgeResult = await db.execute({
          sql: 'SELECT * FROM badges WHERE id = ?',
          args: [badge.id],
        });

        if (badgeResult.rows.length > 0) {
          badgesUnlocked.push(badgeResult.rows[0]);
        }
      }
    }
  }

  return badgesUnlocked;
}

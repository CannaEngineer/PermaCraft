import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { checkAllBadges } from '@/lib/learning/badge-checker';

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get lesson by slug first
    const lessonLookup = await db.execute({
      sql: 'SELECT id, xp_reward FROM lessons WHERE slug = ?',
      args: [params.slug],
    });

    if (lessonLookup.rows.length === 0) {
      return Response.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const lesson = lessonLookup.rows[0] as any;
    const lessonId = lesson.id;

    // Check if already completed
    const completionCheck = await db.execute({
      sql: 'SELECT * FROM lesson_completions WHERE user_id = ? AND lesson_id = ?',
      args: [session.user.id, lessonId],
    });

    if (completionCheck.rows.length > 0) {
      return Response.json({ error: 'Lesson already completed' }, { status: 400 });
    }

    // Create lesson completion
    const completionId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO lesson_completions
            (id, user_id, lesson_id, xp_earned, quiz_score)
            VALUES (?, ?, ?, ?, ?)`,
      args: [completionId, session.user.id, lessonId, lesson.xp_reward, null],
    });

    // Update or create user progress
    const progressResult = await db.execute({
      sql: 'SELECT * FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });

    if (progressResult.rows.length === 0) {
      // Create new progress
      const progressId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO user_progress
              (id, user_id, current_level, total_xp)
              VALUES (?, ?, ?, ?)`,
        args: [progressId, session.user.id, 0, lesson.xp_reward],
      });
    } else {
      // Update existing progress
      const currentProgress = progressResult.rows[0] as any;
      const newTotalXp = currentProgress.total_xp + lesson.xp_reward;
      const newLevel = Math.floor(newTotalXp / 100); // Simple leveling: 100 XP per level

      await db.execute({
        sql: `UPDATE user_progress
              SET total_xp = ?, current_level = ?, updated_at = unixepoch()
              WHERE user_id = ?`,
        args: [newTotalXp, newLevel, session.user.id],
      });
    }

    // Get updated progress
    const updatedProgressResult = await db.execute({
      sql: 'SELECT * FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });

    // Check and award any new badges
    const newBadges = await checkAllBadges(session.user.id);

    return Response.json({
      success: true,
      xp_earned: lesson.xp_reward,
      progress: updatedProgressResult.rows[0],
      badges_earned: newBadges,
    });
  } catch (error) {
    console.error('Error completing lesson:', error);
    return Response.json(
      { error: 'Failed to complete lesson' },
      { status: 500 }
    );
  }
}

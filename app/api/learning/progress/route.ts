import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { UserProgress } from '@/lib/db/schema';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user progress
    const progressResult = await db.execute({
      sql: 'SELECT * FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });

    let progress: UserProgress | null = null;

    if (progressResult.rows.length === 0) {
      // Create initial progress
      const progressId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO user_progress
              (id, user_id, current_level, total_xp)
              VALUES (?, ?, ?, ?)`,
        args: [progressId, session.user.id, 0, 0],
      });

      progress = {
        id: progressId,
        user_id: session.user.id,
        learning_path_id: null,
        current_level: 0,
        total_xp: 0,
        created_at: Date.now() / 1000,
        updated_at: Date.now() / 1000,
      };
    } else {
      progress = progressResult.rows[0] as unknown as UserProgress;
    }

    // Get completed lessons count
    const completionsResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM lesson_completions WHERE user_id = ?',
      args: [session.user.id],
    });

    const completedCount = (completionsResult.rows[0] as any).count;

    return Response.json({
      ...progress,
      completed_lessons: completedCount,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return Response.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

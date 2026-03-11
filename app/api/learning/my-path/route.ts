import { db } from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user progress to find their learning path
    const progressResult = await db.execute({
      sql: 'SELECT learning_path_id FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });

    const learningPathId = progressResult.rows[0]?.learning_path_id as string | null;

    if (!learningPathId) {
      return Response.json({
        path: null,
        lessons: [],
        totalLessons: 0,
        completedLessons: 0,
        percentComplete: 0,
        nextLesson: null,
      });
    }

    // Get path info
    const pathResult = await db.execute({
      sql: 'SELECT id, name, slug, description, difficulty, icon_name, estimated_lessons FROM learning_paths WHERE id = ?',
      args: [learningPathId],
    });

    const path = pathResult.rows[0];
    if (!path) {
      return Response.json({
        path: null,
        lessons: [],
        totalLessons: 0,
        completedLessons: 0,
        percentComplete: 0,
        nextLesson: null,
      });
    }

    // Get all lessons in path with completion status
    const lessonsResult = await db.execute({
      sql: `
        SELECT l.id, l.title, l.slug, l.description, l.estimated_minutes, l.xp_reward, l.difficulty,
               t.name as topic_name, pl.order_index, pl.is_required,
               CASE WHEN lc.lesson_id IS NOT NULL THEN 1 ELSE 0 END as is_completed
        FROM path_lessons pl
        JOIN lessons l ON pl.lesson_id = l.id
        JOIN topics t ON l.topic_id = t.id
        LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id AND lc.user_id = ?
        WHERE pl.learning_path_id = ?
        ORDER BY pl.order_index ASC
      `,
      args: [session.user.id, learningPathId],
    });

    const lessons = lessonsResult.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      slug: row.slug as string,
      description: row.description as string,
      estimated_minutes: row.estimated_minutes as number,
      xp_reward: row.xp_reward as number,
      difficulty: row.difficulty as string,
      order_index: row.order_index as number,
      topic_name: row.topic_name as string,
      is_required: row.is_required as number,
      is_completed: row.is_completed as number,
    }));

    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l) => l.is_completed === 1).length;
    const percentComplete = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const nextLesson = lessons.find((l) => l.is_completed !== 1) ?? null;

    return Response.json({
      path: {
        id: path.id,
        name: path.name,
        slug: path.slug,
        description: path.description,
        difficulty: path.difficulty,
        icon_name: path.icon_name,
        estimated_lessons: path.estimated_lessons,
      },
      lessons,
      totalLessons,
      completedLessons,
      percentComplete,
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            title: nextLesson.title,
            slug: nextLesson.slug,
            estimated_minutes: nextLesson.estimated_minutes,
            xp_reward: nextLesson.xp_reward,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching user path:', error);
    return Response.json({ error: 'Failed to fetch learning path' }, { status: 500 });
  }
}

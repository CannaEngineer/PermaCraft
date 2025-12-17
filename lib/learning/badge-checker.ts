import { db } from '@/lib/db';
import { Badge } from '@/lib/db/schema';

interface BadgeCriteria {
  type: 'topic_complete' | 'lesson_count' | 'xp_threshold' | 'path_complete';
  topic_id?: string;
  path_id?: string;
  count?: number;
  xp?: number;
}

/**
 * Check if user meets criteria for a badge and award it if so
 */
export async function checkAndAwardBadge(
  userId: string,
  badge: Badge
): Promise<boolean> {
  const criteria: BadgeCriteria = JSON.parse(badge.unlock_criteria);

  // Check if already earned
  const existingResult = await db.execute({
    sql: 'SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?',
    args: [userId, badge.id],
  });

  if (existingResult.rows.length > 0) {
    return false; // Already earned
  }

  let meetsCriteria = false;

  switch (criteria.type) {
    case 'topic_complete': {
      // Check if all lessons in topic are completed
      const topicLessonsResult = await db.execute({
        sql: 'SELECT id FROM lessons WHERE topic_id = ?',
        args: [criteria.topic_id!],
      });
      const topicLessonIds = topicLessonsResult.rows.map((row: any) => row.id);

      if (topicLessonIds.length === 0) {
        break;
      }

      const completedResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM lesson_completions
              WHERE user_id = ? AND lesson_id IN (${topicLessonIds.map(() => '?').join(',')})`,
        args: [userId, ...topicLessonIds],
      });

      const completedCount = (completedResult.rows[0] as any).count;
      meetsCriteria = completedCount === topicLessonIds.length;
      break;
    }

    case 'lesson_count': {
      const completionsResult = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM lesson_completions WHERE user_id = ?',
        args: [userId],
      });
      const count = (completionsResult.rows[0] as any).count;
      meetsCriteria = count >= criteria.count!;
      break;
    }

    case 'xp_threshold': {
      const progressResult = await db.execute({
        sql: 'SELECT total_xp FROM user_progress WHERE user_id = ?',
        args: [userId],
      });
      if (progressResult.rows.length > 0) {
        const totalXp = (progressResult.rows[0] as any).total_xp;
        meetsCriteria = totalXp >= criteria.xp!;
      }
      break;
    }

    case 'path_complete': {
      // Get all lessons in path (when path_lessons table is populated)
      // For now, this will always be false since we don't have path_lessons data yet
      // TODO: Implement once path_lessons are seeded
      meetsCriteria = false;
      break;
    }
  }

  if (meetsCriteria) {
    // Award the badge
    const userBadgeId = crypto.randomUUID();
    await db.execute({
      sql: 'INSERT INTO user_badges (id, user_id, badge_id) VALUES (?, ?, ?)',
      args: [userBadgeId, userId, badge.id],
    });
    return true;
  }

  return false;
}

/**
 * Check all badges for a user and award any newly earned ones
 */
export async function checkAllBadges(userId: string): Promise<string[]> {
  // Get all badges
  const badgesResult = await db.execute('SELECT * FROM badges');
  const badges = badgesResult.rows as unknown as Badge[];

  const newlyEarned: string[] = [];

  for (const badge of badges) {
    const awarded = await checkAndAwardBadge(userId, badge);
    if (awarded) {
      newlyEarned.push(badge.id);
    }
  }

  return newlyEarned;
}

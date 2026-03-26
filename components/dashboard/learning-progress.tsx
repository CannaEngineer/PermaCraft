import { db } from '@/lib/db';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, BookOpen, Trophy, Sparkles, Target, Play, GraduationCap } from 'lucide-react';

interface LearningProgressProps {
  userId: string;
}

function getLevelName(level: number) {
  const levels = ['Seedling', 'Sprout', 'Sapling', 'Tree', 'Grove', 'Forest'];
  return levels[Math.min(level, levels.length - 1)];
}

function getLevelIcon(level: number) {
  const icons = ['🌱', '🌿', '🌲', '🌳', '🌲🌳', '🌲🌳🌲'];
  return icons[Math.min(level, icons.length - 1)];
}

async function fetchLearningData(userId: string) {
  try {
    const progressResult = await db.execute({
      sql: `
        SELECT
          up.*,
          lp.name as path_name,
          lp.slug as path_slug,
          lp.icon_name as path_icon
        FROM user_progress up
        LEFT JOIN learning_paths lp ON up.learning_path_id = lp.id
        WHERE up.user_id = ?
        LIMIT 1
      `,
      args: [userId],
    });

    const userProgress = progressResult.rows.length > 0 ? progressResult.rows[0] : null;
    const activePath = (userProgress as any)?.learning_path_id;

    let nextLessonsResult;
    if (activePath) {
      nextLessonsResult = await db.execute({
        sql: `
          SELECT
            l.id, l.title, l.slug, l.description,
            l.estimated_minutes, l.xp_reward,
            t.name as topic_name, pl.order_index
          FROM path_lessons pl
          JOIN lessons l ON pl.lesson_id = l.id
          JOIN topics t ON l.topic_id = t.id
          LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id AND lc.user_id = ?
          WHERE pl.learning_path_id = ? AND lc.lesson_id IS NULL
          ORDER BY pl.order_index ASC
          LIMIT 3
        `,
        args: [userId, activePath],
      });
    } else {
      nextLessonsResult = await db.execute({
        sql: `
          SELECT
            l.id, l.title, l.slug, l.description,
            l.estimated_minutes, l.xp_reward,
            t.name as topic_name
          FROM lessons l
          JOIN topics t ON l.topic_id = t.id
          LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id AND lc.user_id = ?
          WHERE lc.lesson_id IS NULL
          ORDER BY l.order_index ASC
          LIMIT 3
        `,
        args: [userId],
      });
    }

    let completedCountResult;
    let totalLessonsResult;
    if (activePath) {
      completedCountResult = await db.execute({
        sql: `
          SELECT COUNT(*) as count
          FROM lesson_completions lc
          JOIN path_lessons pl ON lc.lesson_id = pl.lesson_id
          WHERE lc.user_id = ? AND pl.learning_path_id = ?
        `,
        args: [userId, activePath],
      });
      totalLessonsResult = await db.execute({
        sql: `SELECT COUNT(*) as total FROM path_lessons WHERE learning_path_id = ?`,
        args: [activePath],
      });
    } else {
      completedCountResult = await db.execute({
        sql: `SELECT COUNT(*) as count FROM lesson_completions WHERE user_id = ?`,
        args: [userId],
      });
      totalLessonsResult = await db.execute({
        sql: `SELECT COUNT(*) as total FROM lessons`,
        args: [],
      });
    }

    const recentBadgesResult = await db.execute({
      sql: `
        SELECT b.*, ub.earned_at
        FROM badges b
        JOIN user_badges ub ON b.id = ub.badge_id
        WHERE ub.user_id = ?
        ORDER BY ub.earned_at DESC
        LIMIT 2
      `,
      args: [userId],
    });

    const completedCount = (completedCountResult.rows[0] as any)?.count || 0;
    const totalLessons = (totalLessonsResult.rows[0] as any)?.total || 0;
    const percentComplete = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

    return {
      userProgress,
      nextLessons: nextLessonsResult.rows,
      recentBadges: recentBadgesResult.rows,
      totalLessons,
      completedCount,
      percentComplete,
      hasActivePath: !!activePath,
    };
  } catch (error) {
    console.error('Error fetching learning data:', error);
    return {
      userProgress: null,
      nextLessons: [],
      recentBadges: [],
      totalLessons: 0,
      completedCount: 0,
      percentComplete: 0,
      hasActivePath: false,
    };
  }
}

export async function LearningProgress({ userId }: LearningProgressProps) {
  const data = await fetchLearningData(userId);
  const progress = data.userProgress as any;

  // No learning activity — show start CTA
  if (!data.userProgress && !data.hasActivePath && data.nextLessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Start Learning</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Choose a learning path to begin your permaculture journey
        </p>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all active:scale-[0.97]"
        >
          Choose Path
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <GraduationCap className="h-5 w-5 text-primary" />
        <div>
          <h4 className="text-sm font-semibold text-foreground tracking-tight">Learning Progress</h4>
          <p className="text-xs text-muted-foreground">
            {progress?.path_name || (data.hasActivePath ? 'Your Learning Path' : 'Permaculture Foundations')}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center rounded-xl bg-amber-500/10 p-2.5">
          <Trophy className="w-4 h-4 text-amber-500 mx-auto mb-1" />
          <p className="text-[11px] font-semibold text-foreground">
            {progress ? getLevelName(progress.current_level) : 'Seedling'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {progress ? getLevelIcon(progress.current_level) : '🌱'}
          </p>
        </div>
        <div className="text-center rounded-xl bg-sky-500/10 p-2.5">
          <Sparkles className="w-4 h-4 text-sky-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground tabular-nums">
            {progress?.total_xp || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">XP</p>
        </div>
        <div className="text-center rounded-xl bg-emerald-500/10 p-2.5">
          <Target className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground tabular-nums">
            {data.completedCount}/{data.totalLessons}
          </p>
          <p className="text-[10px] text-muted-foreground">Done</p>
        </div>
      </div>

      {/* Progress bar */}
      {(data.hasActivePath || data.completedCount > 0) && (
        <div className="mb-4">
          <Progress value={data.percentComplete} className="h-2" />
          <p className="text-[11px] text-muted-foreground text-center mt-1.5">
            {Math.round(data.percentComplete)}% complete
          </p>
        </div>
      )}

      {/* Next lessons */}
      {data.nextLessons.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Play className="w-3 h-3" />
              Next Lessons
            </h5>
            {data.hasActivePath && progress?.path_slug && (
              <Link
                href={`/learn/paths/${progress.path_slug}`}
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                View Path
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="space-y-1.5">
            {data.nextLessons.map((lesson: any, index: number) => (
              <Link
                key={lesson.id}
                href={`/learn/lessons/${lesson.slug}`}
                className={`block rounded-xl p-3 border transition-all duration-200 group ${
                  index === 0
                    ? 'border-primary/20 bg-primary/5 hover:bg-primary/10'
                    : 'border-border/30 bg-muted/20 hover:bg-muted/40'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {index === 0 ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                      <Play className="w-3 h-3 text-primary" />
                    </div>
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium line-clamp-1 ${index === 0 ? 'group-hover:text-primary text-foreground' : 'text-foreground/80'} transition-colors`}>
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span>{lesson.estimated_minutes} min</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{lesson.xp_reward} XP</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          {data.hasActivePath && data.totalLessons > 0 && data.completedCount === data.totalLessons ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Path Complete!</p>
              <p className="text-xs text-muted-foreground mb-3">
                You've mastered all {data.totalLessons} lessons
              </p>
              <Link
                href="/learn"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Choose New Path
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {data.hasActivePath ? 'All caught up! Check back for new lessons.' : 'Choose a path to start'}
              </p>
              <Link
                href="/learn"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all"
              >
                {data.hasActivePath ? 'View Path' : 'Browse Paths'}
              </Link>
            </>
          )}
        </div>
      )}

      {/* Recent badges */}
      {data.recentBadges.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Recent Achievements
          </h5>
          <div className="flex gap-2">
            {data.recentBadges.map((badge: any) => (
              <div
                key={badge.id}
                className="flex-1 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5"
              >
                <p className="text-xs font-medium truncate text-foreground">{badge.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

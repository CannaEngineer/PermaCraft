import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, BookOpen, Trophy, Target, Sparkles, Play } from 'lucide-react';

interface LearningProgressProps {
  userId: string;
}

function getLevelName(level: number) {
  const levels = ['Seedling 🌱', 'Sprout 🌿', 'Sapling 🌲', 'Tree 🌳', 'Grove 🌲🌳', 'Forest 🌲🌳🌲'];
  return levels[Math.min(level, levels.length - 1)];
}

async function fetchLearningData(userId: string) {
  try {
    // Get user progress with active learning path info
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

    // Get next lessons from active path if one is set, otherwise general
    let nextLessonsResult;
    if (activePath) {
      nextLessonsResult = await db.execute({
        sql: `
          SELECT
            l.id,
            l.title,
            l.slug,
            l.description,
            l.estimated_minutes,
            l.xp_reward,
            t.name as topic_name,
            pl.order_index
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
            l.id,
            l.title,
            l.slug,
            l.description,
            l.estimated_minutes,
            l.xp_reward,
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

    // Get completed lesson count (for active path or overall)
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

    // Get recent badges
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

  // No learning activity yet
  if (!data.userProgress && data.nextLessons.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-500/5 via-green-500/3 to-background border-green-500/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
            <BookOpen className="w-6 h-6 text-green-500" />
          </div>
          <h3 className="font-semibold mb-2">Start Learning</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Choose a learning path to begin
          </p>
          <Button asChild size="sm" className="rounded-xl">
            <Link href="/learn">
              Choose Path
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-500/5 via-green-500/3 to-background border-green-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle className="text-base">Learning Progress</CardTitle>
            <CardDescription className="text-xs">
              {data.hasActivePath && progress?.path_name ? progress.path_name : 'Permaculture Foundations'}
            </CardDescription>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Level */}
          <div className="text-center p-2 rounded-lg bg-amber-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-3 h-3 text-amber-500" />
            </div>
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">
              {progress ? getLevelName(progress.current_level) : 'Seedling 🌱'}
            </p>
          </div>

          {/* XP */}
          <div className="text-center p-2 rounded-lg bg-blue-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
            </div>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {progress?.total_xp || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">XP</p>
          </div>

          {/* Progress */}
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-3 h-3 text-green-500" />
            </div>
            <p className="text-lg font-bold text-green-900 dark:text-green-100">
              {data.completedCount}/{data.totalLessons}
            </p>
            <p className="text-[10px] text-muted-foreground">Complete</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {data.hasActivePath && (
          <div>
            <Progress value={data.percentComplete} className="h-2" />
            <p className="text-xs text-muted-foreground text-center mt-1">
              {Math.round(data.percentComplete)}% complete
            </p>
          </div>
        )}

        {/* Next Lessons List */}
        {data.nextLessons.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-1">
                <Play className="w-3 h-3 text-primary" />
                Next Lessons
              </h4>
              {data.hasActivePath && progress?.path_slug && (
                <Link href={`/learn/paths/${progress.path_slug}`}>
                  <Button variant="ghost" size="sm" className="h-6 text-xs rounded-lg">
                    View Path
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Lesson List */}
            <div className="space-y-2">
              {data.nextLessons.map((lesson: any, index: number) => (
                <Link
                  key={lesson.id}
                  href={`/learn/lessons/${lesson.slug}`}
                  className={`block p-3 rounded-lg border transition-all group ${
                    index === 0
                      ? 'border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/40'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    {index === 0 ? (
                      <Play className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm line-clamp-1 ${index === 0 ? 'group-hover:text-primary' : ''} transition-colors`}>
                        {lesson.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{lesson.estimated_minutes} min</span>
                        <span>•</span>
                        <span className="text-green-600">+{lesson.xp_reward} XP</span>
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
              // Actually completed the path
              <>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm font-semibold mb-1">Path Complete! 🎉</p>
                <p className="text-xs text-muted-foreground mb-3">
                  You've mastered all {data.totalLessons} lessons
                </p>
                <Button asChild size="sm" variant="outline" className="rounded-xl">
                  <Link href="/learn">Choose New Path</Link>
                </Button>
              </>
            ) : (
              // Just started or no lessons found
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  {data.hasActivePath ? 'Loading lessons...' : 'Choose a path to start'}
                </p>
                <Button asChild size="sm" className="rounded-xl">
                  <Link href="/learn">
                    {data.hasActivePath ? 'View Path' : 'Browse Paths'}
                  </Link>
                </Button>
              </>
            )}
          </div>
        )}

        {/* Recent Badges */}
        {data.recentBadges.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Recent Achievements</h4>
            <div className="flex gap-2">
              {data.recentBadges.map((badge: any) => (
                <div
                  key={badge.id}
                  className="flex-1 p-2 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-900"
                >
                  <p className="text-xs font-medium truncate text-amber-900 dark:text-amber-100">{badge.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

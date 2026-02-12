import { db } from '@/lib/db';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, BookOpen } from 'lucide-react';

interface LearningProgressProps {
  userId: string;
}

async function fetchLearningData(userId: string) {
  try {
    // Get user progress
    const progressResult = await db.execute({
      sql: `SELECT * FROM user_progress WHERE user_id = ? LIMIT 1`,
      args: [userId],
    });

    // Get completed lessons
    const completedResult = await db.execute({
      sql: `
        SELECT
          lc.lesson_id,
          lc.completed_at,
          l.title,
          l.slug,
          l.xp_reward
        FROM lesson_completions lc
        JOIN lessons l ON lc.lesson_id = l.id
        WHERE lc.user_id = ?
        ORDER BY lc.completed_at DESC
        LIMIT 3
      `,
      args: [userId],
    });

    // Get next recommended lessons
    const nextLessonsResult = await db.execute({
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

    // Get total lesson count
    const totalLessonsResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM lessons`,
      args: [],
    });

    const userProgress = progressResult.rows.length > 0 ? progressResult.rows[0] : null;
    const totalLessons = (totalLessonsResult.rows[0] as any)?.total || 0;
    const completedCount = completedResult.rows.length;
    const percentComplete = totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

    return {
      userProgress,
      completedLessons: completedResult.rows,
      nextLessons: nextLessonsResult.rows,
      totalLessons,
      completedCount,
      percentComplete,
    };
  } catch (error) {
    console.error('Error fetching learning data:', error);
    return {
      userProgress: null,
      completedLessons: [],
      nextLessons: [],
      totalLessons: 0,
      completedCount: 0,
      percentComplete: 0,
    };
  }
}

export async function LearningProgress({ userId }: LearningProgressProps) {
  const data = await fetchLearningData(userId);

  if (!data.userProgress && data.nextLessons.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-2">Start Learning</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Begin your permaculture journey
          </p>
          <Button asChild size="sm">
            <Link href="/learn">
              Browse Lessons
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Your Progress</CardTitle>
            <CardDescription>
              {data.completedCount} of {data.totalLessons} lessons completed
            </CardDescription>
          </div>
          {data.userProgress && (
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {(data.userProgress as any).total_xp || 0}
              </p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(data.percentComplete)}%
            </span>
          </div>
          <Progress value={data.percentComplete} className="h-2" />
        </div>

        {/* Continue Learning */}
        {data.nextLessons.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Continue Learning</h4>
            <div className="space-y-2">
              {data.nextLessons.slice(0, 2).map((lesson: any) => (
                <Link
                  key={lesson.id}
                  href={`/learn/lessons/${lesson.slug}`}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {lesson.topic_name} · {lesson.estimated_minutes} min · {lesson.xp_reward} XP
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recently Completed */}
        {data.completedLessons.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Recently Completed</h4>
            <div className="space-y-2">
              {data.completedLessons.slice(0, 2).map((lesson: any) => (
                <div
                  key={lesson.lesson_id}
                  className="flex items-start gap-3 p-2 rounded-lg text-muted-foreground"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">{lesson.title}</p>
                    <p className="text-xs">+{lesson.xp_reward} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

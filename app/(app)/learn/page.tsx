import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { Skeleton } from '@/components/ui/skeleton';
import { LearnPageHeader } from '@/components/learning/learn-page-header';
import { PathSelectionWizard } from '@/components/learning/path-selection-wizard';
import { PathDashboard } from '@/components/learning/path-dashboard';
import { PathCelebration } from '@/components/learning/path-celebration';

type PageState = 'wizard' | 'dashboard' | 'celebration';

interface LearnPageState {
  state: PageState;
  data: any;
}

async function getLearnPageState(userId: string): Promise<LearnPageState> {
  // Get user progress
  const progressResult = await db.execute({
    sql: 'SELECT * FROM user_progress WHERE user_id = ?',
    args: [userId]
  });
  const progress = progressResult.rows[0] as any;

  // State: No path → wizard
  if (!progress?.learning_path_id) {
    const pathsResult = await db.execute('SELECT * FROM learning_paths ORDER BY difficulty, name');
    return { state: 'wizard', data: { paths: pathsResult.rows } };
  }

  // State: Has path → fetch complete dashboard data
  const pathDetails = await getActivePathDetails(userId, progress.learning_path_id);

  // Check completion
  const isComplete = pathDetails.completedLessons === pathDetails.totalLessons && pathDetails.totalLessons > 0;

  return isComplete
    ? { state: 'celebration', data: pathDetails }
    : { state: 'dashboard', data: pathDetails };
}

async function getActivePathDetails(userId: string, pathId: string) {
  // Get path info
  const pathResult = await db.execute({
    sql: 'SELECT * FROM learning_paths WHERE id = ?',
    args: [pathId]
  });
  const path = pathResult.rows[0];

  // Get user progress
  const progressResult = await db.execute({
    sql: 'SELECT * FROM user_progress WHERE user_id = ?',
    args: [userId]
  });
  const userProgress = progressResult.rows[0];

  // Get all lessons in path with completion status
  const lessonsResult = await db.execute({
    sql: `
      SELECT
        l.*,
        t.id as topic_id,
        t.name as topic_name,
        t.slug as topic_slug,
        t.icon_name as topic_icon,
        pl.order_index,
        CASE WHEN lc.lesson_id IS NOT NULL THEN 1 ELSE 0 END as is_completed
      FROM path_lessons pl
      JOIN lessons l ON pl.lesson_id = l.id
      JOIN topics t ON l.topic_id = t.id
      LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id AND lc.user_id = ?
      WHERE pl.learning_path_id = ?
      ORDER BY pl.order_index ASC
    `,
    args: [userId, pathId]
  });

  const lessons = lessonsResult.rows as any[];

  // Calculate progress
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(l => l.is_completed === 1).length;
  const percentComplete = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Find next incomplete lesson
  const nextLesson = lessons.find(l => l.is_completed !== 1);

  // Group lessons by topic
  const topicsMap = new Map();
  for (const lesson of lessons) {
    if (!topicsMap.has(lesson.topic_id)) {
      topicsMap.set(lesson.topic_id, {
        topic: {
          id: lesson.topic_id,
          name: lesson.topic_name,
          slug: lesson.topic_slug,
          icon_name: lesson.topic_icon,
        },
        lessons: []
      });
    }
    topicsMap.get(lesson.topic_id).lessons.push({
      ...lesson,
      isCompleted: lesson.is_completed === 1
    });
  }
  const curriculumByTopic = Array.from(topicsMap.values());

  // Get earned badges
  const badgesResult = await db.execute({
    sql: `
      SELECT b.*, ub.earned_at
      FROM badges b
      JOIN user_badges ub ON b.id = ub.badge_id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
    `,
    args: [userId]
  });

  return {
    path,
    totalLessons,
    completedLessons,
    percentComplete,
    nextLesson,
    curriculumByTopic,
    earnedBadges: badgesResult.rows,
    userProgress,
  };
}

async function LearnContent() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const pageState = await getLearnPageState(session.user.id);

  return (
    <div className="min-h-screen">
      <LearnPageHeader
        hasActivePath={pageState.state === 'dashboard'}
        pathName={pageState.state === 'dashboard' ? pageState.data.path.name : null}
      />

      {pageState.state === 'wizard' && <PathSelectionWizard paths={pageState.data.paths} />}
      {pageState.state === 'dashboard' && <PathDashboard data={pageState.data} />}
      {pageState.state === 'celebration' && <PathCelebration data={pageState.data} />}
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<LearnPageSkeleton />}>
      <LearnContent />
    </Suspense>
  );
}

function LearnPageSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full max-w-4xl mx-auto" />
      </div>
    </div>
  );
}

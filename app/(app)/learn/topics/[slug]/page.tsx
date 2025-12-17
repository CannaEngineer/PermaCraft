import { Suspense } from 'react';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock, Award, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import * as Icons from 'lucide-react';

async function getTopic(slug: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM topics WHERE slug = ?',
    args: [slug],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as any;
}

async function getTopicLessons(topicId: string) {
  const result = await db.execute({
    sql: `
      SELECT * FROM lessons
      WHERE topic_id = ?
      ORDER BY order_index ASC
    `,
    args: [topicId],
  });

  return result.rows as any[];
}

async function getUserCompletedLessons(userId: string, topicId: string) {
  const result = await db.execute({
    sql: `
      SELECT lesson_id
      FROM lesson_completions lc
      JOIN lessons l ON lc.lesson_id = l.id
      WHERE lc.user_id = ? AND l.topic_id = ?
    `,
    args: [userId, topicId],
  });

  return new Set(result.rows.map((row: any) => row.lesson_id));
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.BookOpen;
  return Icon;
}

async function TopicContent({ slug }: { slug: string }) {
  const session = await getSession();
  const topic = await getTopic(slug);

  if (!topic) {
    notFound();
  }

  const lessons = await getTopicLessons(topic.id);
  const completedLessonIds = session
    ? await getUserCompletedLessons(session.user.id, topic.id)
    : new Set();

  const Icon = getIconComponent(topic.icon_name);
  const completedCount = completedLessonIds.size;
  const totalCount = lessons.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/learn" className="hover:text-foreground">
          Learn
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{topic.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="rounded-lg p-3 bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{topic.name}</h1>
            <p className="text-muted-foreground text-lg">{topic.description}</p>
          </div>
        </div>

        {/* Progress (if authenticated) */}
        {session && totalCount > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Progress</span>
                <span className="text-sm font-medium">
                  {completedCount} of {totalCount} lessons
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lessons List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">Lessons ({totalCount})</h2>

        {lessons.length === 0 && (
          <Card className="text-center py-8">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No lessons available for this topic yet.</p>
            </CardContent>
          </Card>
        )}

        {lessons.map((lesson, index) => {
          const isCompleted = completedLessonIds.has(lesson.id);

          return (
            <Link key={lesson.id} href={`/learn/lessons/${lesson.slug}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                        {isCompleted && (
                          <Badge variant="default" className="bg-green-600">
                            Completed ✓
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="ml-11">{lesson.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground ml-11">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{lesson.estimated_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      <span>{lesson.xp_reward} XP</span>
                    </div>
                    <Badge variant="outline">{lesson.difficulty}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Back Link */}
      <div className="mt-8">
        <Link
          href="/learn"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          ← Back to Learn
        </Link>
      </div>
    </div>
  );
}

export default function TopicPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<TopicPageSkeleton />}>
      <TopicContent slug={params.slug} />
    </Suspense>
  );
}

function TopicPageSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Skeleton className="h-6 w-64 mb-6" />
      <Skeleton className="h-12 w-full mb-2" />
      <Skeleton className="h-6 w-full mb-8" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

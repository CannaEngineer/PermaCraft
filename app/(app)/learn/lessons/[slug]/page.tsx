import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { Lesson, Topic } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, BookOpen, Award } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { LessonCompletionButton } from '@/components/learning/lesson-completion-button';
import { AITutorChat } from '@/components/learning/ai-tutor-chat';
import { LessonQuiz } from '@/components/learning/lesson-quiz';

async function getLesson(slug: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM lessons WHERE slug = ?',
    args: [slug],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const lesson = result.rows[0] as unknown as Lesson;
  return {
    ...lesson,
    content: JSON.parse(lesson.content),
  };
}

async function getTopic(topicId: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM topics WHERE id = ?',
    args: [topicId],
  });

  return result.rows[0] as unknown as Topic;
}

async function checkCompletion(userId: string, lessonId: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM lesson_completions WHERE user_id = ? AND lesson_id = ?',
    args: [userId, lessonId],
  });

  return result.rows.length > 0;
}

async function LessonContent({ slug }: { slug: string }) {
  const session = await getSession();
  const lesson = await getLesson(slug);

  if (!lesson) {
    notFound();
  }

  const topic = await getTopic(lesson.topic_id);
  const isCompleted = session ? await checkCompletion(session.user.id, lesson.id) : false;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto">
        <Link href="/learn" className="hover:text-foreground">
          Learn
        </Link>
        <span>/</span>
        <Link href={`/learn/topics/${topic.slug}`} className="hover:text-foreground">
          {topic.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{lesson.title}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{lesson.title}</h1>
            <p className="text-muted-foreground text-lg">{lesson.description}</p>
          </div>
          {isCompleted && (
            <Badge variant="default" className="bg-green-600 text-white">
              <Award className="h-4 w-4 mr-1" />
              Completed
            </Badge>
          )}
        </div>

        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{lesson.estimated_minutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            <span>{lesson.xp_reward} XP</span>
          </div>
          <Badge variant="secondary">{lesson.difficulty}</Badge>
        </div>
      </div>

      {/* Lesson Content */}
      <Card className="mb-8">
        <CardContent className="prose prose-lg max-w-none dark:prose-invert pt-6">
          <ReactMarkdown>{lesson.content.core_content}</ReactMarkdown>
        </CardContent>
      </Card>

      {/* Quiz Section */}
      {lesson.content.quiz && lesson.content.quiz.length > 0 && (
        <LessonQuiz quiz={lesson.content.quiz} />
      )}

      {/* Attribution */}
      {lesson.content.source_attribution && (
        <div className="text-sm text-muted-foreground mb-8">
          <p>
            <strong>Source:</strong> {lesson.content.source_attribution}
          </p>
          {lesson.content.license && (
            <p>
              <strong>License:</strong> {lesson.content.license}
            </p>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
        {session && (
          <LessonCompletionButton
            lessonSlug={slug}
            xpReward={lesson.xp_reward}
            isCompleted={isCompleted}
          />
        )}
        {isCompleted && (
          <Link href="/learn" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full min-h-[44px] touch-manipulation">
              <BookOpen className="h-5 w-5 mr-2" />
              Back to Learn
            </Button>
          </Link>
        )}
        {!session && (
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full min-h-[44px] touch-manipulation">
              Log in to track progress
            </Button>
          </Link>
        )}
      </div>

      {/* AI Tutor Chat (authenticated users only) */}
      {session && (
        <AITutorChat lessonId={lesson.id} lessonTitle={lesson.title} />
      )}
    </div>
  );
}

export default function LessonPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<LessonPageSkeleton />}>
      <LessonContent slug={params.slug} />
    </Suspense>
  );
}

function LessonPageSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Skeleton className="h-10 w-96 mb-6" />
      <Skeleton className="h-6 w-full mb-8" />
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

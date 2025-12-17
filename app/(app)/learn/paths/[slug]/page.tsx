import { Suspense } from 'react';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ChevronRight, MapPin, Target } from 'lucide-react';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { PathEnrollmentButton } from '@/components/learning/path-enrollment-button';

async function getLearningPath(slug: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM learning_paths WHERE slug = ?',
    args: [slug],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as any;
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.BookOpen;
  return Icon;
}

async function LearningPathContent({ slug }: { slug: string }) {
  const session = await getSession();
  const path = await getLearningPath(slug);

  if (!path) {
    notFound();
  }

  const Icon = getIconComponent(path.icon_name);

  // Get user's current learning path
  let currentPathId: string | null = null;
  if (session) {
    const progressResult = await db.execute({
      sql: 'SELECT learning_path_id FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });
    if (progressResult.rows.length > 0) {
      currentPathId = (progressResult.rows[0] as any).learning_path_id;
    }
  }

  const isCurrentPath = currentPathId === path.id;

  // Get all topics
  const topicsResult = await db.execute('SELECT * FROM topics ORDER BY name');
  const topics = topicsResult.rows as any[];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/learn" className="hover:text-foreground">
          Learn
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{path.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="rounded-lg p-4 bg-primary/10">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{path.name}</h1>
              <Badge variant="secondary">{path.difficulty}</Badge>
            </div>
            <p className="text-muted-foreground text-lg mb-3">{path.description}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Target className="h-4 w-4" />
              <span>{path.target_audience}</span>
            </div>
            <PathEnrollmentButton
              pathSlug={path.slug}
              pathName={path.name}
              isCurrentPath={isCurrentPath}
              isAuthenticated={!!session}
            />
          </div>
        </div>

        {/* Path Info Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardHeader>
            <CardTitle className="text-lg">About This Learning Path</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>
                  <strong>Estimated Lessons:</strong> {path.estimated_lessons}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>
                  <strong>Difficulty:</strong> {path.difficulty.charAt(0).toUpperCase() + path.difficulty.slice(1)}
                </span>
              </div>
              <p className="mt-4 text-muted-foreground">
                This learning path is designed for {path.target_audience.toLowerCase()}. It combines
                foundational permaculture concepts with specialized topics relevant to your context.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topics to Explore */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Explore Topics</h2>
        <p className="text-muted-foreground mb-6">
          While this learning path provides a structured journey, you can explore any topic that
          interests you. Topics contain lessons organized by concept.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => {
            const TopicIcon = getIconComponent(topic.icon_name);
            return (
              <Link key={topic.id} href={`/learn/topics/${topic.slug}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <TopicIcon className="h-5 w-5 text-primary flex-shrink-0" />
                      <CardTitle className="text-base">{topic.name}</CardTitle>
                    </div>
                    <CardDescription className="text-sm mt-2">
                      {topic.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Path Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Structured Progression:</strong> Lessons build on each other, starting with
                foundations and progressing to advanced topics
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Practical Application:</strong> Create practice farms to test your knowledge
                and get AI feedback
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Earn Badges:</strong> Complete topics to unlock achievement badges and track
                your progress
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                <strong>Flexible Learning:</strong> You can explore topics in any order that makes
                sense for your goals
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

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

export default function LearningPathPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={<LearningPathPageSkeleton />}>
      <LearningPathContent slug={params.slug} />
    </Suspense>
  );
}

function LearningPathPageSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Skeleton className="h-6 w-64 mb-6" />
      <Skeleton className="h-12 w-full mb-2" />
      <Skeleton className="h-6 w-full mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { LearningPath, Topic, UserProgress } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeGrid } from '@/components/learning/badge-grid';
import Link from 'next/link';
import * as Icons from 'lucide-react';

async function getUserProgress(userId: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM user_progress WHERE user_id = ?',
    args: [userId],
  });

  return result.rows[0] as unknown as UserProgress | undefined;
}

async function getLearningPaths() {
  const result = await db.execute('SELECT * FROM learning_paths ORDER BY name');
  return result.rows as unknown as LearningPath[];
}

async function getTopics() {
  const result = await db.execute('SELECT * FROM topics ORDER BY name');
  return result.rows as unknown as Topic[];
}

async function getBadgesWithStatus(userId?: string) {
  const badgesResult = await db.execute('SELECT * FROM badges ORDER BY tier, name');
  const allBadges = badgesResult.rows as any[];

  if (!userId) {
    return allBadges.map((badge: any) => ({
      ...badge,
      unlock_criteria: JSON.parse(badge.unlock_criteria),
      earned: false,
    }));
  }

  const userBadgesResult = await db.execute({
    sql: 'SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?',
    args: [userId],
  });
  const earnedBadgeIds = new Set(userBadgesResult.rows.map((row: any) => row.badge_id));

  return allBadges.map((badge: any) => ({
    ...badge,
    unlock_criteria: JSON.parse(badge.unlock_criteria),
    earned: earnedBadgeIds.has(badge.id),
    earned_at: userBadgesResult.rows.find((row: any) => row.badge_id === badge.id)?.earned_at,
  }));
}

async function getRecentlyEarnedBadges(userId: string) {
  const result = await db.execute({
    sql: `
      SELECT b.*, ub.earned_at
      FROM badges b
      JOIN user_badges ub ON b.id = ub.badge_id
      WHERE ub.user_id = ?
      ORDER BY ub.earned_at DESC
      LIMIT 5
    `,
    args: [userId],
  });

  return result.rows.map((badge: any) => ({
    ...badge,
    unlock_criteria: JSON.parse(badge.unlock_criteria),
  }));
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.BookOpen;
  return Icon;
}

function getLevelName(level: number) {
  const levels = ['Seedling', 'Sprout', 'Sapling', 'Tree', 'Grove', 'Forest'];
  return levels[Math.min(level, levels.length - 1)];
}

async function LearnContent() {
  const session = await getSession();
  const paths = await getLearningPaths();
  const topics = await getTopics();
  const progress = session ? await getUserProgress(session.user.id) : null;
  const badges = await getBadgesWithStatus(session?.user.id);
  const recentBadges = session ? await getRecentlyEarnedBadges(session.user.id) : [];

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">PermaCraft Learn</h1>
        <p className="text-muted-foreground text-lg">
          Master permaculture design through hands-on lessons and AI-guided practice
        </p>
      </div>

      {/* User Progress (if authenticated) */}
      {session && progress && (
        <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-4">
              <div>
                <div className="text-3xl font-bold">{getLevelName(progress.current_level)}</div>
                <div className="text-sm text-muted-foreground">Level {progress.current_level}</div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Total XP</span>
                  <span className="text-sm font-medium">{progress.total_xp}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 transition-all"
                    style={{ width: `${(progress.total_xp % 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {100 - (progress.total_xp % 100)} XP to next level
                </div>
              </div>
            </div>

            {/* Recently Earned Badges */}
            {recentBadges.length > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Recently Earned</h3>
                  <Link href="/learn?tab=badges" className="text-xs text-primary hover:underline">
                    View all badges →
                  </Link>
                </div>
                <div className="flex gap-2">
                  {recentBadges.map((badge: any) => {
                    const Icon = getIconComponent(badge.icon_name);
                    return (
                      <div
                        key={badge.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border border-yellow-200 dark:border-yellow-800"
                        title={badge.description}
                      >
                        <div className="rounded-full p-1.5 bg-yellow-100 dark:bg-yellow-900">
                          <Icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <span className="text-xs font-medium">{badge.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Learning Paths */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Learning Paths</h2>
        <p className="text-muted-foreground mb-6">
          Choose a path tailored to your context and goals
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map((path) => {
            const Icon = getIconComponent(path.icon_name);
            return (
              <Link key={path.id} href={`/learn/paths/${path.slug}`}>
                <Card className="h-full hover-lift transition-smooth cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <CardTitle className="text-lg">{path.name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{path.difficulty}</Badge>
                          <Badge variant="outline">{path.estimated_lessons} lessons</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{path.description}</p>
                    <p className="text-xs text-muted-foreground italic">
                      {path.target_audience}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Topics and Badges Tabs */}
      <section>
        <Tabs defaultValue="topics" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="topics">Browse by Topic</TabsTrigger>
            <TabsTrigger value="badges">
              Badges
              {session && (
                <Badge variant="secondary" className="ml-2">
                  {badges.filter(b => b.earned).length}/{badges.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics">
            <p className="text-muted-foreground mb-6">
              Explore lessons organized by permaculture concepts
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => {
                const Icon = getIconComponent(topic.icon_name);
                return (
                  <Link key={topic.id} href={`/learn/topics/${topic.slug}`}>
                    <Card className="hover-lift transition-smooth cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{topic.name}</CardTitle>
                        </div>
                        <CardDescription className="text-sm">{topic.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="badges">
            <p className="text-muted-foreground mb-6">
              Earn badges by completing lessons and reaching milestones
            </p>
            <BadgeGrid badges={badges} />
          </TabsContent>
        </Tabs>
      </section>
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
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <Skeleton className="h-12 w-64 mb-2" />
      <Skeleton className="h-6 w-96 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

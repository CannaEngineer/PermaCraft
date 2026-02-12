import { Suspense } from 'react';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { LearningPath, Topic, UserProgress } from '@/lib/db/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { BadgeGrid } from '@/components/learning/badge-grid';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { GraduationCap, BookOpen, Trophy, Target, Sparkles, ArrowRight, Play, CheckCircle2 } from 'lucide-react';

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

async function getNextLessons(userId: string, limit: number = 3) {
  const result = await db.execute({
    sql: `
      SELECT
        l.id,
        l.title,
        l.slug,
        l.description,
        l.estimated_minutes,
        l.xp_reward,
        t.name as topic_name,
        t.icon_name as topic_icon
      FROM lessons l
      JOIN topics t ON l.topic_id = t.id
      LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id AND lc.user_id = ?
      WHERE lc.lesson_id IS NULL
      ORDER BY l.order_index ASC
      LIMIT ?
    `,
    args: [userId, limit],
  });

  return result.rows;
}

async function getCompletedLessonsCount(userId: string) {
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM lesson_completions WHERE user_id = ?`,
    args: [userId],
  });
  return (result.rows[0] as any)?.count || 0;
}

async function getTotalLessonsCount() {
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM lessons`,
    args: [],
  });
  return (result.rows[0] as any)?.count || 0;
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.BookOpen;
  return Icon;
}

function getLevelName(level: number) {
  const levels = ['Seedling 🌱', 'Sprout 🌿', 'Sapling 🌲', 'Tree 🌳', 'Grove 🌲🌳', 'Forest 🌲🌳🌲'];
  return levels[Math.min(level, levels.length - 1)];
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-600 border-green-200',
  intermediate: 'bg-blue-500/10 text-blue-600 border-blue-200',
  advanced: 'bg-purple-500/10 text-purple-600 border-purple-200',
};

async function LearnContent() {
  const session = await getSession();
  const paths = await getLearningPaths();
  const topics = await getTopics();
  const progress = session ? await getUserProgress(session.user.id) : null;
  const badges = await getBadgesWithStatus(session?.user.id);
  const recentBadges = session ? await getRecentlyEarnedBadges(session.user.id) : [];
  const nextLessons = session ? await getNextLessons(session.user.id, 3) : [];
  const completedCount = session ? await getCompletedLessonsCount(session.user.id) : 0;
  const totalCount = await getTotalLessonsCount();
  const completionPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
                  Permaculture Learning Center
                </h1>
                <p className="text-muted-foreground text-lg">
                  Master regenerative design through guided lessons and hands-on practice
                </p>
              </div>
            </div>

            {/* User Progress Card */}
            {session && progress && (
              <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-background border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Level & XP */}
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h3 className="font-semibold">Your Level</h3>
                      </div>
                      <div className="text-3xl font-bold text-primary">
                        {getLevelName(progress.current_level)}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total XP</span>
                          <span className="font-semibold">{progress.total_xp.toLocaleString()}</span>
                        </div>
                        <Progress value={progress.total_xp % 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {100 - (progress.total_xp % 100)} XP to level {progress.current_level + 1}
                        </p>
                      </div>
                    </div>

                    {/* Completion Stats */}
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold">Progress</h3>
                      </div>
                      <div className="text-3xl font-bold">
                        {completedCount} <span className="text-lg text-muted-foreground">/ {totalCount}</span>
                      </div>
                      <div className="space-y-2">
                        <Progress value={completionPercent} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {Math.round(completionPercent)}% of lessons completed
                        </p>
                      </div>
                    </div>

                    {/* Recent Badges */}
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '300ms' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <h3 className="font-semibold">Achievements</h3>
                      </div>
                      {recentBadges.length > 0 ? (
                        <div className="space-y-2">
                          {recentBadges.slice(0, 2).map((badge: any) => {
                            const Icon = getIconComponent(badge.icon_name);
                            return (
                              <div
                                key={badge.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-200"
                              >
                                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                                  <Icon className="w-4 h-4 text-amber-600" />
                                </div>
                                <span className="text-sm font-medium flex-1 truncate">{badge.name}</span>
                              </div>
                            );
                          })}
                          <Link href="/learn?tab=badges">
                            <Button variant="ghost" size="sm" className="w-full rounded-xl group">
                              View all badges
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-all" />
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Complete lessons to earn badges
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Continue Learning Section */}
            {session && nextLessons.length > 0 && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '400ms' }}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  Continue Learning
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {nextLessons.map((lesson: any, index: number) => {
                    const Icon = getIconComponent(lesson.topic_icon);
                    return (
                      <Link key={lesson.id} href={`/learn/lessons/${lesson.slug}`}>
                        <Card
                          className="hover:shadow-lg transition-all hover:scale-[1.02] h-full border-2 hover:border-primary/50 animate-in fade-in slide-in-from-bottom-2 duration-500"
                          style={{ animationDelay: `${450 + index * 50}ms` }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-2">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base line-clamp-2">{lesson.title}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">{lesson.topic_name}</p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Icons.Clock className="w-3 h-3" />
                                {lesson.estimated_minutes} min
                              </span>
                              <span className="flex items-center gap-1">
                                <Icons.Star className="w-3 h-3" />
                                {lesson.xp_reward} XP
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Learning Paths */}
          <section className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
                  <Icons.Map className="w-5 h-5 text-primary" />
                  Learning Paths
                </h2>
                <p className="text-sm text-muted-foreground">
                  Structured journeys tailored to your goals
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {paths.map((path, index) => {
                const Icon = getIconComponent(path.icon_name);
                const difficultyClass = difficultyColors[path.difficulty] || difficultyColors.beginner;

                return (
                  <Link key={path.id} href={`/learn/paths/${path.slug}`}>
                    <Card
                      className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-[1.02] border-2 hover:border-primary/50 animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${150 + index * 50}ms` }}
                    >
                      {/* Header with gradient */}
                      <div className="h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden border-b">
                        <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-5" />
                        <div className="absolute bottom-3 left-4 flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                      </div>

                      <CardHeader className="pt-4">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {path.name}
                        </CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className={difficultyClass}>
                            {path.difficulty}
                          </Badge>
                          <Badge variant="outline">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {path.estimated_lessons} lessons
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {path.description}
                        </p>
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground italic">
                            👤 {path.target_audience}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>

          <Separator className="my-8" />

          {/* Topics and Badges Tabs */}
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
            <Tabs defaultValue="topics" className="w-full">
              <TabsList className="mb-6 grid w-full max-w-md grid-cols-2 rounded-xl">
                <TabsTrigger value="topics" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Topics
                </TabsTrigger>
                <TabsTrigger value="badges" className="gap-2">
                  <Trophy className="w-4 h-4" />
                  Badges
                  {session && (
                    <Badge variant="secondary" className="ml-2">
                      {badges.filter(b => b.earned).length}/{badges.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="topics" className="space-y-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Browse by Topic</h3>
                    <p className="text-sm text-muted-foreground">
                      Explore lessons organized by permaculture concepts
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {topics.map((topic, index) => {
                    const Icon = getIconComponent(topic.icon_name);
                    return (
                      <Link key={topic.id} href={`/learn/topics/${topic.slug}`}>
                        <Card
                          className="hover:shadow-lg transition-all cursor-pointer group h-full border-2 hover:border-primary/50 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2 duration-500"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <CardHeader>
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-6 h-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
                                  {topic.name}
                                </CardTitle>
                                <CardDescription className="text-sm line-clamp-2 mt-1">
                                  {topic.description}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="badges" className="space-y-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Achievement Badges</h3>
                    <p className="text-sm text-muted-foreground">
                      Earn badges by completing lessons and reaching milestones
                    </p>
                  </div>
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <BadgeGrid badges={badges} />
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-16 w-full mb-4" />
          <Skeleton className="h-32 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
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
      </div>
    </div>
  );
}

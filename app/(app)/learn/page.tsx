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
import { PathSelector } from '@/components/learning/path-selector';
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

async function getActivePathDetails(userId: string, pathId: string) {
  // Get path info
  const pathResult = await db.execute({
    sql: 'SELECT * FROM learning_paths WHERE id = ?',
    args: [pathId],
  });
  const path = pathResult.rows[0];

  // Get all lessons in this path
  const lessonsResult = await db.execute({
    sql: `
      SELECT
        l.*,
        pl.order_index,
        t.name as topic_name,
        CASE WHEN lc.lesson_id IS NOT NULL THEN 1 ELSE 0 END as is_completed
      FROM path_lessons pl
      JOIN lessons l ON pl.lesson_id = l.id
      JOIN topics t ON l.topic_id = t.id
      LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id AND lc.user_id = ?
      WHERE pl.learning_path_id = ?
      ORDER BY pl.order_index ASC
    `,
    args: [userId, pathId],
  });

  // Calculate progress
  const totalLessons = lessonsResult.rows.length;
  const completedLessons = lessonsResult.rows.filter((l: any) => l.is_completed === 1).length;
  const percentComplete = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Find next incomplete lesson
  const nextLesson = lessonsResult.rows.find((l: any) => l.is_completed !== 1);

  return {
    path,
    lessons: lessonsResult.rows,
    totalLessons,
    completedLessons,
    percentComplete,
    nextLesson,
  };
}

async function LearnContent() {
  const session = await getSession();
  const paths = await getLearningPaths();
  const topics = await getTopics();
  const progress = session ? await getUserProgress(session.user.id) : null;
  const badges = await getBadgesWithStatus(session?.user.id);

  // Get active path details if user has one
  const activePathId = (progress as any)?.learning_path_id;
  const activePathDetails = session && activePathId
    ? await getActivePathDetails(session.user.id, activePathId)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section - Engaging & Directive */}
      <div className="border-b bg-gradient-to-br from-green-500/5 via-primary/5 to-background backdrop-blur-sm">
        <div className="container mx-auto p-6 md:p-8 lg:p-12">
          <div className="max-w-4xl mx-auto text-center">
            {activePathDetails ? (
              // Has Active Path - Celebrate Progress
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {activePathDetails.completedLessons} of {activePathDetails.totalLessons} lessons complete
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
                  Keep Going! 🌱
                </h1>
                <p className="text-xl text-muted-foreground mb-2">
                  You're mastering <span className="font-semibold text-foreground">{(activePathDetails.path as any)?.name}</span>
                </p>
                <p className="text-muted-foreground">
                  {activePathDetails.nextLesson
                    ? `Next up: ${(activePathDetails.nextLesson as any).title}`
                    : 'You've completed this path! Time to celebrate 🎉'}
                </p>
              </>
            ) : (
              // No Active Path - Inspire Action
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 animate-in fade-in slide-in-from-top duration-500">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Start Your Journey</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6 bg-gradient-to-r from-green-600 via-primary to-blue-600 bg-clip-text text-transparent animate-in fade-in slide-in-from-top duration-500" style={{ animationDelay: '100ms' }}>
                  Master Permaculture Design
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-top duration-500" style={{ animationDelay: '200ms' }}>
                  Learn to create regenerative systems through expert-guided lessons and hands-on practice
                </p>
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground animate-in fade-in slide-in-from-top duration-500" style={{ animationDelay: '300ms' }}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Step-by-step guidance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Earn badges & XP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Apply to real projects</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Active Learning Path Section */}
          {activePathDetails && (
            <section className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-background border-2 border-primary/20 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icons.BookOpen className="w-5 h-5 text-primary" />
                        <CardTitle className="text-xl">Your Learning Path</CardTitle>
                      </div>
                      <CardDescription className="text-base">
                        {(activePathDetails.path as any)?.name}
                      </CardDescription>
                    </div>
                    <Link href="/learn#browse-paths">
                      <Button variant="ghost" size="sm" className="rounded-xl">
                        Switch Path
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {activePathDetails.completedLessons} of {activePathDetails.totalLessons} lessons
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(activePathDetails.percentComplete)}%
                      </span>
                    </div>
                    <Progress value={activePathDetails.percentComplete} className="h-3" />
                  </div>

                  {/* Next Lesson CTA */}
                  {activePathDetails.nextLesson ? (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Play className="w-4 h-4 text-primary" />
                        Continue with Lesson {(activePathDetails.nextLesson as any).order_index + 1}
                      </h3>
                      <Link href={`/learn/lessons/${(activePathDetails.nextLesson as any).slug}`}>
                        <Card className="border-2 border-primary hover:border-primary/70 hover:shadow-lg transition-all cursor-pointer group">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {(activePathDetails.nextLesson as any).title}
                            </CardTitle>
                            <CardDescription>
                              {(activePathDetails.nextLesson as any).description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Icons.Clock className="w-4 h-4" />
                                  {(activePathDetails.nextLesson as any).estimated_minutes} min
                                </span>
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  +{(activePathDetails.nextLesson as any).xp_reward} XP
                                </Badge>
                              </div>
                              <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Path Complete! 🎉</h3>
                      <p className="text-muted-foreground mb-4">
                        You've finished all lessons in this path
                      </p>
                      <Button asChild className="rounded-xl">
                        <Link href="#browse-paths">Choose New Path</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {/* No Active Path - Featured Recommended Path */}
          {session && !activePathDetails && paths.length > 0 && (
            <section className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="text-center mb-6">
                <Badge className="mb-3 bg-gradient-to-r from-green-600 to-primary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Recommended For You
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Start Here</h2>
                <p className="text-muted-foreground">
                  Most learners begin with this path
                </p>
              </div>

              {/* Featured Path Card - First beginner path */}
              {(() => {
                const featuredPath = paths.find(p => p.difficulty === 'beginner') || paths[0];
                const Icon = getIconComponent(featuredPath.icon_name);
                return (
                  <Card className="max-w-3xl mx-auto bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/30 overflow-hidden">
                    {/* Visual Header */}
                    <div className="h-40 bg-gradient-to-br from-green-500 via-primary to-blue-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('/patterns/topography.svg')] opacity-20" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 mb-1">
                              {featuredPath.difficulty.charAt(0).toUpperCase() + featuredPath.difficulty.slice(1)}
                            </Badge>
                            <h3 className="text-2xl font-bold text-white">{featuredPath.name}</h3>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6">
                      <p className="text-lg mb-4">{featuredPath.description}</p>

                      <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex items-center gap-2 text-sm">
                          <Icons.BookOpen className="w-4 h-4 text-primary" />
                          <span className="font-medium">{featuredPath.estimated_lessons} lessons</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Icons.Users className="w-4 h-4 text-primary" />
                          <span>{featuredPath.target_audience}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span>Earn certificates & badges</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          size="lg"
                          className="flex-1 rounded-xl h-12 text-base"
                          onClick={async () => {
                            const response = await fetch('/api/learning/set-path', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ learning_path_id: featuredPath.id }),
                            });
                            if (response.ok) window.location.reload();
                          }}
                        >
                          <Play className="w-5 h-5 mr-2" />
                          Start This Path
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="rounded-xl h-12"
                          asChild
                        >
                          <Link href="#browse-paths">
                            See All Paths
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </section>
          )}

          <Separator className="my-8" id="browse-paths" />

          {/* Learning Paths */}
          <section className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                {activePathDetails ? 'Explore Other Learning Paths' : 'All Learning Paths'}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {activePathDetails
                  ? 'Want to switch directions? Choose a new path to follow'
                  : 'Each path is a structured journey designed to build your skills step-by-step'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {paths.map((path, index) => {
                const difficultyClass = difficultyColors[path.difficulty] || difficultyColors.beginner;
                const isActive = activePathId === path.id;

                return (
                  <div
                    key={path.id}
                    className="animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${150 + index * 50}ms` }}
                  >
                    <PathSelector
                      path={path}
                      isActive={isActive}
                      iconName={path.icon_name}
                      difficultyClass={difficultyClass}
                    />
                  </div>
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

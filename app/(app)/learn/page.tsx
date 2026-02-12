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
  const completedLessons = lessonsResult.rows.filter((l: any) => l.is_completed).length;
  const percentComplete = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Find next incomplete lesson
  const nextLesson = lessonsResult.rows.find((l: any) => !l.is_completed);

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
      {/* Hero Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
                  Permaculture Learning
                </h1>
                <p className="text-muted-foreground text-lg">
                  {activePathDetails ? 'Follow your path, one lesson at a time' : 'Choose a learning path to begin your journey'}
                </p>
              </div>
            </div>
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

          {/* No Active Path - Prompt to Choose */}
          {session && !activePathDetails && (
            <section className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="bg-gradient-to-br from-green-500/5 via-green-500/3 to-background border-2 border-dashed border-green-500/30">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <Icons.Map className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Choose Your Learning Path</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Follow a structured journey tailored to your goals. Focus on one path at a time for best results.
                  </p>
                  <Button asChild size="lg" className="rounded-xl">
                    <Link href="#browse-paths">
                      Browse Learning Paths
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

          <Separator className="my-8" id="browse-paths" />

          {/* Learning Paths */}
          <section className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
            <div className="mb-5">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-1">
                <Icons.Map className="w-5 h-5 text-primary" />
                {activePathDetails ? 'Switch to a Different Path' : 'Choose Your Learning Path'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activePathDetails ? 'Change direction and start a new journey' : 'Select a structured journey tailored to your goals'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {paths.map((path, index) => {
                const Icon = getIconComponent(path.icon_name);
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
                      iconComponent={Icon}
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

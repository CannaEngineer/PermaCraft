import Link from 'next/link';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Sparkles, Play, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';

interface PathDashboardProps {
  data: PathDashboardData;
}

interface PathDashboardData {
  path: any;
  totalLessons: number;
  completedLessons: number;
  percentComplete: number;
  nextLesson: any;
  curriculumByTopic: Array<{
    topic: any;
    lessons: Array<any & { isCompleted: boolean }>;
  }>;
  earnedBadges: any[];
  userProgress: any;
}

function getLevelName(level: number) {
  const levels = ['Seedling 🌱', 'Sprout 🌿', 'Sapling 🌲', 'Tree 🌳', 'Grove 🌲🌳', 'Forest 🌲🌳🌲'];
  return levels[Math.min(level, levels.length - 1)];
}

function getIconComponent(iconName: string) {
  const Icon = (Icons as any)[iconName] || Icons.BookOpen;
  return Icon;
}

export async function PathDashboard({ data }: PathDashboardProps) {
  const {
    path,
    totalLessons,
    completedLessons,
    percentComplete,
    nextLesson,
    curriculumByTopic,
    earnedBadges,
    userProgress,
  } = data;

  const PathIcon = getIconComponent(path.icon_name);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            {/* Path Name */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <PathIcon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold">{path.name}</h2>
                <p className="text-muted-foreground">{path.description}</p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm text-muted-foreground mb-1">Level</p>
                  <p className="font-bold">{getLevelName(userProgress?.current_level || 0)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-muted-foreground mb-1">Total XP</p>
                  <p className="text-2xl font-bold">{userProgress?.total_xp || 0}</p>
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1">
                <CardContent className="p-4 text-center">
                  <Target className="w-5 h-5 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-muted-foreground mb-1">Progress</p>
                  <p className="text-2xl font-bold">{completedLessons}/{totalLessons}</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Path Completion</span>
                <span className="text-sm text-muted-foreground">{Math.round(percentComplete)}%</span>
              </div>
              <Progress value={percentComplete} className="h-3" />
            </div>

            {/* Continue Button */}
            {nextLesson && (
              <Button asChild size="lg" className="w-full md:w-auto">
                <Link href={`/learn/lessons/${nextLesson.slug}`}>
                  <Play className="mr-2 h-5 w-5" />
                  Continue Learning: {nextLesson.title}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Curriculum Section */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Icons.BookOpen className="w-5 h-5 text-primary" />
              Your Learning Path
            </h3>

            <div className="space-y-4">
              {curriculumByTopic.map((topicGroup) => {
                const TopicIcon = getIconComponent(topicGroup.topic.icon_name);
                const topicCompleted = topicGroup.lessons.filter(l => l.isCompleted).length;
                const topicTotal = topicGroup.lessons.length;
                const topicProgress = (topicCompleted / topicTotal) * 100;

                return (
                  <Card key={topicGroup.topic.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <TopicIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{topicGroup.topic.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {topicCompleted} of {topicTotal} lessons
                            </p>
                          </div>
                        </div>
                        <Badge variant={topicCompleted === topicTotal ? 'default' : 'secondary'}>
                          {Math.round(topicProgress)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress value={topicProgress} className="h-2 mb-4" />

                      <div className="space-y-2">
                        {topicGroup.lessons.map((lesson, index) => {
                          const isNext = !lesson.isCompleted &&
                            (index === 0 || topicGroup.lessons[index - 1].isCompleted);

                          return (
                            <Link
                              key={lesson.id}
                              href={`/learn/lessons/${lesson.slug}`}
                              className={`block p-3 rounded-lg border transition-all group ${
                                isNext
                                  ? 'border-2 border-primary bg-primary/5 hover:bg-primary/10'
                                  : lesson.isCompleted
                                  ? 'bg-muted/30 hover:bg-muted/50'
                                  : 'hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {lesson.isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : isNext ? (
                                    <Play className="w-5 h-5 text-primary" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium ${isNext ? 'group-hover:text-primary' : ''} transition-colors`}>
                                    {lesson.title}
                                  </p>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                    <span>{lesson.estimated_minutes} min</span>
                                    <span>•</span>
                                    <span className="text-green-600">+{lesson.xp_reward} XP</span>
                                  </div>
                                </div>
                                {isNext && (
                                  <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Badges Section */}
          {earnedBadges.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Your Badges
              </h3>

              <div className="flex gap-4 overflow-x-auto pb-4">
                {earnedBadges.map((badge) => {
                  const BadgeIcon = getIconComponent(badge.icon_name);
                  return (
                    <Card key={badge.id} className="flex-shrink-0 w-40">
                      <CardContent className="p-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                          <BadgeIcon className="w-6 h-6 text-amber-500" />
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{badge.name}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

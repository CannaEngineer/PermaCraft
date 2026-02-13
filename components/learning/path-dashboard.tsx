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
          {/* Curriculum Section - placeholder for now */}
          <div>
            <h3 className="text-xl font-bold mb-4">Your Learning Path</h3>
            <p className="text-muted-foreground">Curriculum will be rendered here</p>
          </div>

          {/* Badges Section - placeholder for now */}
          {earnedBadges.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-4">Your Badges</h3>
              <p className="text-muted-foreground">{earnedBadges.length} badges earned</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

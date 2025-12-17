import { Suspense } from 'react';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MapPin, Calendar, Award, Trash2 } from 'lucide-react';
import Link from 'next/link';

async function getPracticeFarms(userId: string) {
  const result = await db.execute({
    sql: `
      SELECT pf.*, l.title as lesson_title, l.slug as lesson_slug
      FROM practice_farms pf
      LEFT JOIN lessons l ON pf.lesson_id = l.id
      WHERE pf.user_id = ?
      ORDER BY pf.created_at DESC
    `,
    args: [userId],
  });

  return result.rows as any[];
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

async function PracticeFarmsContent() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const farms = await getPracticeFarms(session.user.id);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Practice Farms</h1>
          <p className="text-muted-foreground text-lg">
            Your sandbox farms for learning and experimentation
          </p>
        </div>
        <Link href="/learn/practice-farms/new" className="sm:flex-shrink-0">
          <Button size="lg" className="w-full sm:w-auto">
            <Plus className="h-5 w-5 mr-2" />
            New Practice Farm
          </Button>
        </Link>
      </div>

      {/* Empty State */}
      {farms.length === 0 && (
        <Card className="text-center py-12">
          <CardContent className="pt-6">
            <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No practice farms yet</h3>
            <p className="text-muted-foreground mb-6">
              Create a practice farm to experiment with permaculture designs in a safe sandbox environment.
              Get AI feedback on your designs!
            </p>
            <Link href="/learn/practice-farms/new">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Practice Farm
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Practice Farms Grid */}
      {farms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <Card key={farm.id} className="hover-lift transition-smooth">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-1 truncate">{farm.name}</CardTitle>
                    {farm.lesson_title && (
                      <Link
                        href={`/learn/lessons/${farm.lesson_slug}`}
                        className="text-xs text-primary hover:underline block truncate"
                      >
                        For lesson: {farm.lesson_title}
                      </Link>
                    )}
                  </div>
                  {farm.ai_grade !== null && (
                    <Badge
                      variant={farm.ai_grade >= 80 ? 'default' : 'secondary'}
                      className={
                        farm.ai_grade >= 80
                          ? 'bg-green-600 flex-shrink-0'
                          : farm.ai_grade >= 60
                          ? 'bg-yellow-600 flex-shrink-0'
                          : 'bg-orange-600 flex-shrink-0'
                      }
                    >
                      {farm.ai_grade}%
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {farm.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {farm.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(farm.created_at)}</span>
                  </div>
                  {farm.submitted_for_review === 1 && (
                    <div className="flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      <span>Reviewed</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link href={`/learn/practice-farms/${farm.id}`} className="flex-1">
                    <Button variant="outline" className="w-full min-h-[44px] touch-manipulation">
                      Open
                    </Button>
                  </Link>
                  {farm.submitted_for_review === 0 && (
                    <Link href={`/learn/practice-farms/${farm.id}?submit=true`} className="flex-shrink-0">
                      <Button variant="default" className="min-h-[44px] touch-manipulation">
                        Submit
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle>About Practice Farms</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                Practice farms are sandbox environments where you can experiment without affecting your real farm designs
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                Submit your practice farm for AI review to get personalized feedback on your design
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                Earn 100-500 XP based on your design score (higher scores = more XP!)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>
                High-scoring practice farms (90%+) can unlock special mastery badges
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PracticeFarmsPage() {
  return (
    <Suspense fallback={<PracticeFarmsPageSkeleton />}>
      <PracticeFarmsContent />
    </Suspense>
  );
}

function PracticeFarmsPageSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <Skeleton className="h-12 w-64 mb-2" />
      <Skeleton className="h-6 w-96 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-11 flex-1" />
                <Skeleton className="h-11 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

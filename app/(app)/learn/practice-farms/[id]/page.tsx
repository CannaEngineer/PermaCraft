import { Suspense } from 'react';
import { getSession } from '@/lib/auth/session';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Award, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { PracticeFarmSubmitButton } from '@/components/learning/practice-farm-submit-button';
import { PracticeFarmEditorClient } from '@/components/learning/practice-farm-editor-client';

async function getPracticeFarm(id: string, userId: string) {
  const result = await db.execute({
    sql: `
      SELECT pf.*, l.title as lesson_title, l.slug as lesson_slug
      FROM practice_farms pf
      LEFT JOIN lessons l ON pf.lesson_id = l.id
      WHERE pf.id = ? AND pf.user_id = ?
    `,
    args: [id, userId],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const farm = result.rows[0] as any;

  // Get zones
  const zonesResult = await db.execute({
    sql: 'SELECT * FROM practice_zones WHERE practice_farm_id = ? ORDER BY created_at ASC',
    args: [id],
  });

  const zones = zonesResult.rows.map((zone: any) => ({
    id: zone.id,
    farm_id: farm.id, // For compatibility with FarmMap component
    name: zone.name,
    zone_type: zone.zone_type,
    geometry: zone.geometry,
    properties: zone.properties,
    created_at: zone.created_at,
    updated_at: zone.updated_at,
  }));

  // Add farm boundary as a special zone if it exists
  if (farm.boundary_geometry) {
    zones.unshift({
      id: `${farm.id}-boundary`,
      farm_id: farm.id,
      name: 'Farm Boundary',
      zone_type: 'farm_boundary',
      geometry: farm.boundary_geometry,
      properties: JSON.stringify({ user_zone_type: 'farm_boundary' }),
      created_at: farm.created_at,
      updated_at: farm.updated_at,
    });
  }

  farm.zones = zones;
  farm.zones_count = zones.length;

  // Get plantings count
  const plantingsResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM practice_plantings WHERE practice_farm_id = ?',
    args: [id],
  });
  farm.plantings_count = (plantingsResult.rows[0] as any).count;

  return farm;
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function PracticeFarmContent({ id }: { id: string }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const farm = await getPracticeFarm(id, session.user.id);

  if (!farm) {
    notFound();
  }

  const feedback = farm.ai_feedback ? JSON.parse(farm.ai_feedback) : null;

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/learn" className="hover:text-foreground">
          Learn
        </Link>
        <span>/</span>
        <Link href="/learn/practice-farms" className="hover:text-foreground">
          Practice Farms
        </Link>
        <span>/</span>
        <span className="text-foreground">{farm.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{farm.name}</h1>
          {farm.description && (
            <p className="text-muted-foreground text-lg">{farm.description}</p>
          )}
          {farm.lesson_title && (
            <Link
              href={`/learn/lessons/${farm.lesson_slug}`}
              className="text-sm text-primary hover:underline inline-block mt-2"
            >
              For lesson: {farm.lesson_title}
            </Link>
          )}
        </div>
        {farm.ai_grade !== null && (
          <Badge
            variant="default"
            className={`text-lg px-4 py-2 ${
              farm.ai_grade >= 80
                ? 'bg-green-600'
                : farm.ai_grade >= 60
                ? 'bg-yellow-600'
                : 'bg-orange-600'
            }`}
          >
            <Award className="h-5 w-5 mr-2" />
            Score: {farm.ai_grade}%
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{farm.zones_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plantings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{farm.plantings_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{formatDate(farm.created_at)}</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Feedback */}
      {feedback && (
        <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              AI Feedback
            </CardTitle>
            <CardDescription>
              Evaluated on {formatDate(farm.updated_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strengths */}
            <div>
              <h3 className="font-semibold mb-2 text-green-700 dark:text-green-400">
                ✓ Strengths
              </h3>
              <ul className="space-y-1">
                {feedback.strengths?.map((strength: string, idx: number) => (
                  <li key={idx} className="text-sm">
                    • {strength}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            {feedback.improvements && feedback.improvements.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-orange-700 dark:text-orange-400">
                  → Areas for Improvement
                </h3>
                <ul className="space-y-1">
                  {feedback.improvements.map((improvement: string, idx: number) => (
                    <li key={idx} className="text-sm">
                      • {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specific Suggestions */}
            {feedback.specific_suggestions && feedback.specific_suggestions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-blue-700 dark:text-blue-400">
                  💡 Specific Suggestions
                </h3>
                <ul className="space-y-1">
                  {feedback.specific_suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx} className="text-sm">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Principle Scores */}
            {feedback.principle_scores && (
              <div>
                <h3 className="font-semibold mb-3">Principle Scores</h3>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(feedback.principle_scores).map(([principle, score]) => {
                    const scoreValue = Number(score);
                    return (
                      <div key={principle}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">
                            {principle.replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold">{scoreValue}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              scoreValue >= 80
                                ? 'bg-green-600'
                                : scoreValue >= 60
                                ? 'bg-yellow-600'
                                : 'bg-orange-600'
                            }`}
                            style={{ width: `${scoreValue}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Map Editor */}
      <div className="mb-8 h-[600px] rounded-lg overflow-hidden border">
        <PracticeFarmEditorClient practiceFarm={farm} initialZones={farm.zones} />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
        <Link href="/learn/practice-farms" className="order-2 sm:order-1">
          <Button variant="outline" className="w-full sm:w-auto min-h-[44px] touch-manipulation">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Practice Farms
          </Button>
        </Link>
        {farm.submitted_for_review === 0 && (
          <div className="order-1 sm:order-2">
            <PracticeFarmSubmitButton practiceFarmId={farm.id} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PracticeFarmPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<PracticeFarmPageSkeleton />}>
      <PracticeFarmContent id={params.id} />
    </Suspense>
  );
}

function PracticeFarmPageSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Skeleton className="h-6 w-96 mb-6" />
      <Skeleton className="h-12 w-full mb-2" />
      <Skeleton className="h-6 w-full mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

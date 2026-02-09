import { Suspense } from 'react';
import { db } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { PlusCircle, FileText, CheckCircle, Clock, Trash2 } from 'lucide-react';

async function getContentStats() {
  const [lessonsResult, generationsResult, topicsResult] = await Promise.all([
    db.execute('SELECT COUNT(*) as count FROM lessons'),
    db.execute('SELECT COUNT(*) as count FROM content_generations WHERE status = ?', ['draft']),
    db.execute('SELECT id, name, slug FROM topics ORDER BY name'),
  ]);

  const lessonsByTopic = await db.execute(`
    SELECT t.name, t.slug, COUNT(l.id) as lesson_count
    FROM topics t
    LEFT JOIN lessons l ON t.id = l.topic_id
    GROUP BY t.id, t.name, t.slug
    ORDER BY t.name
  `);

  return {
    totalLessons: (lessonsResult.rows[0] as any).count,
    draftGenerations: (generationsResult.rows[0] as any).count,
    topics: topicsResult.rows,
    lessonsByTopic: lessonsByTopic.rows,
  };
}

async function getRecentGenerations() {
  const result = await db.execute({
    sql: `
      SELECT cg.*, t.name as topic_name, u.name as user_name
      FROM content_generations cg
      LEFT JOIN topics t ON cg.topic_id = t.id
      LEFT JOIN users u ON cg.generated_by_user_id = u.id
      ORDER BY cg.created_at DESC
      LIMIT 10
    `,
    args: [],
  });

  return result.rows;
}

async function ContentDashboard() {
  const stats = await getContentStats();
  const recentGenerations = await getRecentGenerations();

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              Published and live
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft Generations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftGenerations}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topics</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.topics.length}</div>
            <p className="text-xs text-muted-foreground">
              Content categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Generate and manage lesson content</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Link href="/admin/content/generate">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Generate New Lesson
            </Button>
          </Link>
          <Link href="/admin/content/library">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Content Library
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Lessons by Topic */}
      <Card>
        <CardHeader>
          <CardTitle>Lessons by Topic</CardTitle>
          <CardDescription>Content distribution across topics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.lessonsByTopic.map((topic: any) => (
              <div key={topic.slug} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="font-medium">{topic.name}</div>
                  <Badge variant="secondary">{topic.lesson_count} lessons</Badge>
                </div>
                <Link href={`/admin/content/generate?topic=${topic.slug}`}>
                  <Button size="sm" variant="ghost">
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Generations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Generations</CardTitle>
          <CardDescription>Latest AI-generated content</CardDescription>
        </CardHeader>
        <CardContent>
          {recentGenerations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No generations yet. Create your first lesson!</p>
          ) : (
            <div className="space-y-3">
              {recentGenerations.map((gen: any) => (
                <div key={gen.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{gen.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {gen.topic_name} • {gen.user_name} • {new Date(gen.created_at * 1000).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={gen.status === 'published' ? 'default' : 'secondary'}>
                      {gen.status}
                    </Badge>
                    {gen.status === 'draft' && (
                      <Link href={`/admin/content/generations/${gen.id}`}>
                        <Button size="sm" variant="outline">Review</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContentDashboard />
    </Suspense>
  );
}

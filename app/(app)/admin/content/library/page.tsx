import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Edit, Eye, TrendingUp } from 'lucide-react';

export default async function ContentLibraryPage() {
  await requireAdmin();

  const lessonsResult = await db.execute(`
    SELECT
      l.id, l.title, l.slug, l.difficulty,
      l.estimated_minutes, l.xp_reward,
      t.name as topic_name
    FROM lessons l
    LEFT JOIN topics t ON l.topic_id = t.id
    ORDER BY t.name, l.order_index
  `);
  const lessons = lessonsResult.rows as any[];

  const statsResult = await db.execute(`
    SELECT COUNT(*) as total_lessons FROM lessons
  `);
  const stats = statsResult.rows[0] as any;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Library</h1>
          <p className="text-muted-foreground">
            Manage all {stats.total_lessons} lessons
          </p>
        </div>
        <Link href="/admin/content">
          <Button>Generate New Lesson</Button>
        </Link>
      </div>

      <div className="rounded-lg border">
        <div className="p-4 space-y-2">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/learn/lessons/${lesson.slug}`}
                    className="font-medium hover:underline"
                    target="_blank"
                  >
                    {lesson.title}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {lesson.topic_name}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {lesson.difficulty}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {lesson.estimated_minutes} min • {lesson.xp_reward} XP
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/content/library/${lesson.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/learn/lessons/${lesson.slug}`} target="_blank">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

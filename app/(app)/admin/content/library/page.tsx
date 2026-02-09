import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BookOpen, Edit, Eye, Image, TrendingUp } from 'lucide-react';

export default async function ContentLibraryPage() {
  await requireAdmin();

  // Get all lessons with stats
  const lessonsResult = await db.execute(`
    SELECT
      l.id,
      l.title,
      l.slug,
      l.difficulty,
      l.estimated_minutes,
      l.xp_reward,
      l.order_index,
      t.name as topic_name,
      t.slug as topic_slug,
      COUNT(DISTINCT lc.id) as completion_count
    FROM lessons l
    LEFT JOIN topics t ON l.topic_id = t.id
    LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id
    GROUP BY l.id, l.title, l.slug, l.difficulty, l.estimated_minutes,
             l.xp_reward, l.order_index, t.name, t.slug
    ORDER BY t.name, l.order_index
  `);
  const lessons = lessonsResult.rows as any[];

  // Get overall stats
  const statsResult = await db.execute(`
    SELECT
      COUNT(DISTINCT l.id) as total_lessons,
      COUNT(DISTINCT lc.user_id) as active_learners,
      AVG(l.estimated_minutes) as avg_duration,
      SUM(CASE WHEN l.difficulty = 'beginner' THEN 1 ELSE 0 END) as beginner_count,
      SUM(CASE WHEN l.difficulty = 'intermediate' THEN 1 ELSE 0 END) as intermediate_count,
      SUM(CASE WHEN l.difficulty = 'advanced' THEN 1 ELSE 0 END) as advanced_count
    FROM lessons l
    LEFT JOIN lesson_completions lc ON l.id = lc.lesson_id
  `);
  const stats = statsResult.rows[0] as any;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Library</h1>
          <p className="text-muted-foreground">
            Manage all lessons, add images, and track engagement
          </p>
        </div>
        <Link href="/admin/content">
          <Button>Generate New Lesson</Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Lessons</span>
          </div>
          <p className="text-2xl font-bold">{stats.total_lessons}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Active Learners</span>
          </div>
          <p className="text-2xl font-bold">{stats.active_learners || 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold">{Math.round(stats.avg_duration || 0)} min</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">By Difficulty</span>
            <div className="flex gap-2 text-xs">
              <span>B: {stats.beginner_count}</span>
              <span>I: {stats.intermediate_count}</span>
              <span>A: {stats.advanced_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lessons Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead className="text-right">Completions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No lessons found
                </TableCell>
              </TableRow>
            ) : (
              lessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/learn/lessons/${lesson.slug}`}
                      className="hover:underline"
                      target="_blank"
                    >
                      {lesson.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lesson.topic_name}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        lesson.difficulty === 'beginner'
                          ? 'default'
                          : lesson.difficulty === 'intermediate'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {lesson.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{lesson.estimated_minutes} min</TableCell>
                  <TableCell className="text-right">{lesson.xp_reward} XP</TableCell>
                  <TableCell className="text-right">{lesson.completion_count || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/content/library/${lesson.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/content/library/${lesson.id}/images`}>
                        <Button variant="ghost" size="sm">
                          <Image className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/learn/lessons/${lesson.slug}`} target="_blank">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

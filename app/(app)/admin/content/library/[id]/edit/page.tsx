import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { LessonEditorForm } from '@/components/admin/lesson-editor-form';

interface PageProps {
  params: { id: string };
}

export default async function EditLessonPage({ params }: PageProps) {
  await requireAdmin();

  // Get lesson details
  const lessonResult = await db.execute({
    sql: `
      SELECT
        l.*,
        t.id as topic_id,
        t.name as topic_name
      FROM lessons l
      LEFT JOIN topics t ON l.topic_id = t.id
      WHERE l.id = ?
    `,
    args: [params.id],
  });

  if (lessonResult.rows.length === 0) {
    notFound();
  }

  const lesson = lessonResult.rows[0] as any;

  // Parse content
  const content = JSON.parse(lesson.content as string);

  // Get all topics for dropdown
  const topicsResult = await db.execute('SELECT id, name, slug FROM topics ORDER BY name');
  const topics = topicsResult.rows as any[];

  return (
    <div className="container mx-auto py-8">
      <LessonEditorForm
        lesson={{
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          difficulty: lesson.difficulty,
          estimated_minutes: lesson.estimated_minutes,
          xp_reward: lesson.xp_reward,
          topic_id: lesson.topic_id,
          content: content,
        }}
        topics={topics}
      />
    </div>
  );
}

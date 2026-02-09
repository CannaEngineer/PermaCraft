import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';

// POST /api/admin/content/publish/[id] - Publish a generation as a lesson
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin();

    // Get the generation
    const genResult = await db.execute({
      sql: 'SELECT * FROM content_generations WHERE id = ?',
      args: [params.id],
    });

    if (genResult.rows.length === 0) {
      return Response.json({ error: 'Generation not found' }, { status: 404 });
    }

    const generation = genResult.rows[0] as any;

    // Check if already published
    if (generation.status === 'published') {
      return Response.json({ error: 'Already published' }, { status: 400 });
    }

    // Use edited content if available, otherwise use raw output
    const content = generation.edited_output
      ? JSON.parse(generation.edited_output)
      : JSON.parse(generation.raw_output);

    // Check if slug already exists
    const existingLessonResult = await db.execute({
      sql: 'SELECT id FROM lessons WHERE slug = ?',
      args: [generation.slug],
    });

    if (existingLessonResult.rows.length > 0) {
      // Slug collision - append timestamp
      generation.slug = `${generation.slug}-${Date.now()}`;
    }

    // Get max order_index for this topic to append to end
    const maxOrderResult = await db.execute({
      sql: 'SELECT MAX(order_index) as max_order FROM lessons WHERE topic_id = ?',
      args: [generation.topic_id],
    });
    const maxOrder = (maxOrderResult.rows[0] as any)?.max_order || 0;
    const orderIndex = maxOrder + 1;

    // Create the lesson
    const lessonId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `INSERT INTO lessons
            (id, topic_id, title, slug, description, content, content_type,
             estimated_minutes, difficulty, prerequisite_lesson_ids, xp_reward, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        lessonId,
        generation.topic_id,
        generation.title,
        generation.slug,
        `Learn about ${generation.title.toLowerCase()}`,
        JSON.stringify(content),
        'text',
        generation.estimated_minutes,
        generation.difficulty,
        null,
        generation.xp_reward,
        orderIndex,
      ],
    });

    // Update generation status
    await db.execute({
      sql: 'UPDATE content_generations SET status = ?, lesson_id = ?, updated_at = ? WHERE id = ?',
      args: ['published', lessonId, now, params.id],
    });

    // Create version record
    const versionId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO lesson_versions
            (id, lesson_id, version_number, content, edited_by_user_id, change_notes)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        versionId,
        lessonId,
        1,
        JSON.stringify(content),
        session.user.id,
        'Initial publication from AI generation',
      ],
    });

    return Response.json({
      success: true,
      lesson_id: lessonId,
      slug: generation.slug,
    });
  } catch (error: any) {
    console.error('Publish error:', error);
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return Response.json(
      { error: 'Failed to publish lesson', details: error.message },
      { status: 500 }
    );
  }
}

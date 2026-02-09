import { requireAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      title,
      description,
      difficulty,
      estimated_minutes,
      xp_reward,
      topic_id,
      content,
    } = body;

    // Generate new slug if title changed
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Update lesson
    await db.execute({
      sql: `
        UPDATE lessons
        SET
          title = ?,
          slug = ?,
          description = ?,
          difficulty = ?,
          estimated_minutes = ?,
          xp_reward = ?,
          topic_id = ?,
          content = ?
        WHERE id = ?
      `,
      args: [
        title,
        slug,
        description,
        difficulty,
        estimated_minutes,
        xp_reward,
        topic_id,
        JSON.stringify(content),
        params.id,
      ],
    });

    return NextResponse.json({ success: true, slug });
  } catch (error: any) {
    console.error('Failed to update lesson:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

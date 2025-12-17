import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';

// POST /api/learning/paths/[slug]/enroll - Set as user's active learning path
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getSession();

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const pathSlug = params.slug;

  try {
    // Get the learning path by slug
    const pathResult = await db.execute({
      sql: 'SELECT * FROM learning_paths WHERE slug = ?',
      args: [pathSlug],
    });

    if (pathResult.rows.length === 0) {
      return Response.json({ error: 'Learning path not found' }, { status: 404 });
    }

    const learningPath = pathResult.rows[0] as any;
    const now = Math.floor(Date.now() / 1000);

    // Check if user already has progress record
    const progressResult = await db.execute({
      sql: 'SELECT * FROM user_progress WHERE user_id = ?',
      args: [session.user.id],
    });

    if (progressResult.rows.length === 0) {
      // Create new progress record
      await db.execute({
        sql: `
          INSERT INTO user_progress (id, user_id, learning_path_id, current_level, total_xp, created_at, updated_at)
          VALUES (?, ?, ?, 0, 0, ?, ?)
        `,
        args: [
          crypto.randomUUID(),
          session.user.id,
          learningPath.id,
          now,
          now,
        ],
      });
    } else {
      // Update existing progress to new path
      await db.execute({
        sql: `
          UPDATE user_progress
          SET learning_path_id = ?, updated_at = ?
          WHERE user_id = ?
        `,
        args: [learningPath.id, now, session.user.id],
      });
    }

    return Response.json({
      success: true,
      path: learningPath,
      message: `Successfully enrolled in ${learningPath.name}`,
    });
  } catch (error: any) {
    console.error('Error enrolling in learning path:', error);
    return Response.json(
      { error: 'Failed to enroll in learning path', details: error.message },
      { status: 500 }
    );
  }
}

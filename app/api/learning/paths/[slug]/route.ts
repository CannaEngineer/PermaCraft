import { db } from '@/lib/db';
import { LearningPath, Lesson, PathLesson } from '@/lib/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Get the learning path
    const pathResult = await db.execute({
      sql: 'SELECT * FROM learning_paths WHERE slug = ?',
      args: [slug],
    });

    if (pathResult.rows.length === 0) {
      return Response.json({ error: 'Learning path not found' }, { status: 404 });
    }

    const path = pathResult.rows[0] as unknown as LearningPath;

    // Get lessons for this path (when we add path_lessons data)
    // For now, return the path with empty lessons array
    const pathWithLessons = {
      ...path,
      lessons: [],
    };

    return Response.json(pathWithLessons);
  } catch (error) {
    console.error('Error fetching learning path:', error);
    return Response.json(
      { error: 'Failed to fetch learning path' },
      { status: 500 }
    );
  }
}

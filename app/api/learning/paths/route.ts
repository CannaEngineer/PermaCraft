import { db } from '@/lib/db';
import { LearningPath } from '@/lib/db/schema';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM learning_paths ORDER BY name');
    const paths = result.rows as unknown as LearningPath[];

    return Response.json(paths);
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    return Response.json(
      { error: 'Failed to fetch learning paths' },
      { status: 500 }
    );
  }
}

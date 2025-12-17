import { db } from '@/lib/db';
import { Lesson } from '@/lib/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Get the lesson
    const lessonResult = await db.execute({
      sql: 'SELECT * FROM lessons WHERE slug = ?',
      args: [slug],
    });

    if (lessonResult.rows.length === 0) {
      return Response.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const lesson = lessonResult.rows[0] as unknown as Lesson;

    // Parse the content JSON string
    const lessonWithParsedContent = {
      ...lesson,
      content: JSON.parse(lesson.content),
    };

    return Response.json(lessonWithParsedContent);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return Response.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
    );
  }
}

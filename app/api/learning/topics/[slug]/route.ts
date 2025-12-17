import { db } from '@/lib/db';
import { Topic, Lesson } from '@/lib/db/schema';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Get the topic
    const topicResult = await db.execute({
      sql: 'SELECT * FROM topics WHERE slug = ?',
      args: [slug],
    });

    if (topicResult.rows.length === 0) {
      return Response.json({ error: 'Topic not found' }, { status: 404 });
    }

    const topic = topicResult.rows[0] as unknown as Topic;

    // Get lessons for this topic
    const lessonsResult = await db.execute({
      sql: 'SELECT * FROM lessons WHERE topic_id = ? ORDER BY order_index',
      args: [topic.id],
    });

    const lessons = lessonsResult.rows as unknown as Lesson[];

    const topicWithLessons = {
      ...topic,
      lessons,
    };

    return Response.json(topicWithLessons);
  } catch (error) {
    console.error('Error fetching topic:', error);
    return Response.json(
      { error: 'Failed to fetch topic' },
      { status: 500 }
    );
  }
}

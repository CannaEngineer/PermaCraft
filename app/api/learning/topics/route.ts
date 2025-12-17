import { db } from '@/lib/db';
import { Topic } from '@/lib/db/schema';

export async function GET() {
  try {
    const result = await db.execute('SELECT * FROM topics ORDER BY name');
    const topics = result.rows as unknown as Topic[];

    return Response.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    return Response.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await requireAuth();

    const result = await db.execute({
      sql: `
        SELECT c.*, COUNT(ci.id) as item_count
        FROM collections c
        LEFT JOIN collection_items ci ON c.id = ci.collection_id
        WHERE c.curator_id = ?
        GROUP BY c.id
        ORDER BY c.updated_at DESC
      `,
      args: [session.user.id],
    });

    return Response.json(result.rows);
  } catch (error) {
    console.error('My collections error:', error);
    return Response.json({ error: 'Failed to load collections' }, { status: 500 });
  }
}

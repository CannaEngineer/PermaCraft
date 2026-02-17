import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await db.execute({
      sql: `SELECT c.*, COUNT(ci.id) as item_count
            FROM collections c
            LEFT JOIN collection_items ci ON c.id = ci.collection_id
            WHERE c.is_public = 1
            GROUP BY c.id
            ORDER BY c.is_featured DESC, c.created_at DESC
            LIMIT 20`,
      args: []
    });
    return Response.json(result.rows);
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

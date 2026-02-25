import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return new Response('Unauthorized', { status: 401 });

    const result = await db.execute({
      sql: `
        SELECT id, farm_id, label, source_url, processing_status,
               tile_url_template, bounds, created_at
        FROM custom_imagery
        WHERE farm_id = ?
        ORDER BY created_at DESC
      `,
      args: [params.id],
    });

    const imagery = result.rows.map((row: any) => ({
      ...row,
      bounds: row.bounds ? JSON.parse(row.bounds) : null,
    }));

    return Response.json({ imagery });
  } catch (error) {
    console.error('Failed to get imagery:', error);
    return Response.json({ imagery: [] });
  }
}

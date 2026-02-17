import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const farmsResult = await db.execute({
      sql: `
        SELECT f.*,
               COUNT(DISTINCT p.id) as post_count,
               COUNT(DISTINCT z.id) as zone_count,
               COUNT(DISTINCT pl.id) as planting_count
        FROM farms f
        LEFT JOIN farm_posts p ON p.farm_id = f.id AND p.is_published = 1
        LEFT JOIN zones z ON z.farm_id = f.id
        LEFT JOIN plantings pl ON pl.farm_id = f.id
        WHERE f.user_id = ? AND f.is_public = 1
        GROUP BY f.id
        ORDER BY f.updated_at DESC
      `,
      args: [id],
    });

    return Response.json({
      farms: farmsResult.rows,
    });
  } catch (error) {
    console.error('User farms error:', error);
    return Response.json({ error: 'Failed to load user farms' }, { status: 500 });
  }
}

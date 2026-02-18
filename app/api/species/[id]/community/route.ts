import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Count farms using this species (via plantings)
    const countResult = await db.execute({
      sql: `SELECT COUNT(DISTINCT p.farm_id) as farm_count
            FROM plantings p
            WHERE p.species_id = ?`,
      args: [params.id],
    });
    const farmCount = (countResult.rows[0] as any)?.farm_count || 0;

    // Get farm names (public farms only)
    const farmsResult = await db.execute({
      sql: `SELECT DISTINCT f.id, f.name
            FROM farms f
            JOIN plantings p ON p.farm_id = f.id
            WHERE p.species_id = ? AND f.is_public = 1
            ORDER BY f.name ASC
            LIMIT 10`,
      args: [params.id],
    });

    return Response.json({
      farm_count: farmCount,
      farms: farmsResult.rows,
    });
  } catch (error) {
    console.error('Species community API error:', error);
    return Response.json({ farm_count: 0, farms: [] });
  }
}

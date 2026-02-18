import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await db.execute({
      sql: `SELECT p.*, f.name as farm_name
            FROM shop_products p
            JOIN farms f ON f.id = p.farm_id
            WHERE p.species_id = ? AND p.is_published = 1
            ORDER BY p.is_featured DESC, p.rating_avg DESC
            LIMIT 20`,
      args: [params.id],
    });

    return Response.json({ products: result.rows });
  } catch (error) {
    console.error('Species products API error:', error);
    return Response.json({ products: [] });
  }
}

// app/api/shops/route.ts
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const search = searchParams.get('q');

  let sql = `
    SELECT
      f.id, f.name, f.description, f.center_lat, f.center_lng, f.climate_zone,
      f.shop_headline, f.shop_banner_url,
      COUNT(DISTINCT p.id) as product_count,
      COALESCE(AVG(p.rating_avg), 0) as avg_rating
    FROM farms f
    LEFT JOIN shop_products p ON p.farm_id = f.id AND p.is_published = 1
    WHERE f.is_shop_enabled = 1 AND f.is_public = 1
  `;
  const args: (string | number)[] = [];

  if (category) {
    sql += ' AND EXISTS (SELECT 1 FROM shop_products WHERE farm_id = f.id AND category = ? AND is_published = 1)';
    args.push(category);
  }
  if (search) {
    sql += ' AND (f.name LIKE ? OR f.shop_headline LIKE ?)';
    args.push(`%${search}%`, `%${search}%`);
  }

  sql += ' GROUP BY f.id ORDER BY product_count DESC LIMIT 50';

  const result = await db.execute({ sql, args });
  return Response.json(result.rows);
}

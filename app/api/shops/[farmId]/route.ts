// app/api/shops/[farmId]/route.ts
import { db } from '@/lib/db';

export async function GET(
  _req: Request,
  context: { params: Promise<{ farmId: string }> }
) {
  const { farmId } = await context.params;

  const farmResult = await db.execute({
    sql: `SELECT id, name, description, center_lat, center_lng, climate_zone,
                 is_shop_enabled, shop_headline, shop_banner_url, shop_policy,
                 accepts_pickup, accepts_shipping, accepts_delivery
          FROM farms WHERE id = ? AND is_shop_enabled = 1 AND is_public = 1`,
    args: [farmId],
  });
  if (!farmResult.rows[0]) return new Response('Shop not found', { status: 404 });

  const productsResult = await db.execute({
    sql: `SELECT * FROM shop_products
          WHERE farm_id = ? AND is_published = 1
          ORDER BY is_featured DESC, sort_order ASC, created_at DESC`,
    args: [farmId],
  });

  return Response.json({ shop: farmResult.rows[0], products: productsResult.rows });
}

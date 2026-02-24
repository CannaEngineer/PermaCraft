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
                 accepts_pickup, accepts_shipping, accepts_delivery,
                 story_published, story_theme, user_id
          FROM farms WHERE id = ? AND is_shop_enabled = 1 AND is_public = 1`,
    args: [farmId],
  });
  if (!farmResult.rows[0]) return new Response('Shop not found', { status: 404 });

  const farm = farmResult.rows[0] as any;

  const productsResult = await db.execute({
    sql: `SELECT * FROM shop_products
          WHERE farm_id = ? AND is_published = 1
          ORDER BY is_featured DESC, sort_order ASC, created_at DESC`,
    args: [farmId],
  });

  // Fetch story sections if story is published
  let storySections: any[] = [];
  if (farm.story_published === 1) {
    const storyResult = await db.execute({
      sql: `SELECT * FROM farm_story_sections
            WHERE farm_id = ? AND is_visible = 1
            ORDER BY display_order ASC`,
      args: [farmId],
    });
    storySections = storyResult.rows as any[];
  }

  // Fetch plantings summary
  const plantingsResult = await db.execute({
    sql: `SELECT s.common_name, s.scientific_name, s.layer, s.is_native, COUNT(*) as count
          FROM plantings p JOIN species s ON p.species_id = s.id
          WHERE p.farm_id = ?
          GROUP BY s.id
          ORDER BY s.layer, s.common_name`,
    args: [farmId],
  });

  // Fetch farm owner info
  const ownerResult = await db.execute({
    sql: 'SELECT name, image FROM users WHERE id = ?',
    args: [farm.user_id],
  });

  // Fetch latest screenshot
  let latestScreenshot = null;
  const screenshotResult = await db.execute({
    sql: `SELECT screenshot_data FROM ai_analyses
          WHERE farm_id = ? AND screenshot_data IS NOT NULL
          ORDER BY created_at DESC LIMIT 1`,
    args: [farmId],
  });
  if (screenshotResult.rows.length > 0) {
    try {
      const urls = JSON.parse((screenshotResult.rows[0] as any).screenshot_data);
      latestScreenshot = Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
    } catch { /* ignore */ }
  }

  return Response.json({
    shop: farm,
    products: productsResult.rows,
    storySections,
    plantingsSummary: plantingsResult.rows,
    farmOwner: ownerResult.rows[0] || { name: 'Farmer', image: null },
    latestScreenshot,
  });
}

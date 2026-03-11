import { NextRequest } from 'next/server';
import { getTourConfigBySlug, getTourPois, getTourRoutes } from '@/lib/tour/queries';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/tour/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = checkRateLimit(`tour-farm:${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const config = await getTourConfigBySlug(slug);
    if (!config || !config.published) {
      return Response.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Fetch farm info
    const farmResult = await db.execute({
      sql: 'SELECT id, name, description, acres, center_lat, center_lng, zoom_level, climate_zone FROM farms WHERE id = ?',
      args: [config.farm_id],
    });
    const farm = farmResult.rows[0];
    if (!farm) {
      return Response.json({ error: 'Farm not found' }, { status: 404 });
    }

    const [pois, routes] = await Promise.all([
      getTourPois(config.farm_id, true),
      getTourRoutes(config.farm_id),
    ]);

    return Response.json({
      config: {
        slug: config.slug,
        primary_color: config.primary_color,
        default_route_id: config.default_route_id,
      },
      farm: {
        id: farm.id,
        name: farm.name,
        description: farm.description,
        acres: farm.acres,
        center_lat: farm.center_lat,
        center_lng: farm.center_lng,
        zoom_level: farm.zoom_level,
        climate_zone: farm.climate_zone,
      },
      pois,
      routes,
    });
  } catch (error) {
    console.error('Failed to fetch tour data:', error);
    return Response.json({ error: 'Failed to fetch tour' }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { getTourPois, createTourPoi } from '@/lib/tour/queries';
import { generateQrCodeId } from '@/lib/tour/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const farmId = request.nextUrl.searchParams.get('farm_id');
    if (!farmId) return Response.json({ error: 'farm_id required' }, { status: 400 });

    const admin = await isAdmin();
    if (!admin) {
      const farmResult = await db.execute({
        sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
        args: [farmId, session.user.id],
      });
      if (farmResult.rows.length === 0) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const pois = await getTourPois(farmId, false);
    return Response.json({ pois });
  } catch (error) {
    console.error('Failed to get tour POIs:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { farm_id, name, category, lat, lng, description, media_urls, species_list } = body;

    if (!farm_id || !name || lat === undefined || lng === undefined) {
      return Response.json({ error: 'farm_id, name, lat, and lng are required' }, { status: 400 });
    }

    const admin = await isAdmin();
    if (!admin) {
      const farmResult = await db.execute({
        sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
        args: [farm_id, session.user.id],
      });
      if (farmResult.rows.length === 0) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get next sort order
    const orderResult = await db.execute({
      sql: 'SELECT MAX(sort_order) as max_order FROM tour_pois WHERE farm_id = ?',
      args: [farm_id],
    });
    const nextOrder = Number((orderResult.rows[0] as any)?.max_order ?? -1) + 1;

    const poi = await createTourPoi({
      id: crypto.randomUUID(),
      farm_id,
      name,
      category: category || 'general',
      lat,
      lng,
      qr_code_id: generateQrCodeId(),
      description: description || null,
      media_urls: media_urls ? JSON.stringify(media_urls) : null,
      species_list: species_list ? JSON.stringify(species_list) : null,
      active: 1,
      sort_order: nextOrder,
    });

    return Response.json({ poi });
  } catch (error) {
    console.error('Failed to create tour POI:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

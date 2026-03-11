import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { getTourPoiById, updateTourPoi, deleteTourPoi } from '@/lib/tour/queries';

async function verifyAccess(farmId: string, userId: string): Promise<boolean> {
  const admin = await isAdmin();
  if (admin) return true;
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const poi = await getTourPoiById(id);
    if (!poi) return Response.json({ error: 'Not found' }, { status: 404 });

    const hasAccess = await verifyAccess(poi.farm_id, session.user.id);
    if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });

    return Response.json({ poi });
  } catch (error) {
    console.error('Failed to get tour POI:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const poi = await getTourPoiById(id);
    if (!poi) return Response.json({ error: 'Not found' }, { status: 404 });

    const hasAccess = await verifyAccess(poi.farm_id, session.user.id);
    if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    await updateTourPoi(id, {
      name: body.name,
      category: body.category,
      lat: body.lat,
      lng: body.lng,
      description: body.description,
      media_urls: body.media_urls ? JSON.stringify(body.media_urls) : undefined,
      species_list: body.species_list ? JSON.stringify(body.species_list) : undefined,
      active: body.active,
      sort_order: body.sort_order,
    });

    const updated = await getTourPoiById(id);
    return Response.json({ poi: updated });
  } catch (error) {
    console.error('Failed to update tour POI:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const poi = await getTourPoiById(id);
    if (!poi) return Response.json({ error: 'Not found' }, { status: 404 });

    const hasAccess = await verifyAccess(poi.farm_id, session.user.id);
    if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });

    await deleteTourPoi(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tour POI:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

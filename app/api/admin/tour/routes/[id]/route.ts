import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { getTourRouteById, updateTourRoute, deleteTourRoute } from '@/lib/tour/queries';

async function verifyAccess(farmId: string, userId: string): Promise<boolean> {
  const admin = await isAdmin();
  if (admin) return true;
  const result = await db.execute({
    sql: 'SELECT id FROM farms WHERE id = ? AND user_id = ?',
    args: [farmId, userId],
  });
  return result.rows.length > 0;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const route = await getTourRouteById(id);
    if (!route) return Response.json({ error: 'Not found' }, { status: 404 });

    const hasAccess = await verifyAccess(route.farm_id, session.user.id);
    if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    await updateTourRoute(id, {
      name: body.name,
      duration_minutes: body.duration_minutes,
      distance_meters: body.distance_meters,
      poi_sequence: body.poi_sequence ? JSON.stringify(body.poi_sequence) : undefined,
      cached_route_geojson: body.cached_route_geojson,
      difficulty: body.difficulty,
      is_default: body.is_default,
    });

    const updated = await getTourRouteById(id);
    return Response.json({ route: updated });
  } catch (error) {
    console.error('Failed to update tour route:', error);
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
    const route = await getTourRouteById(id);
    if (!route) return Response.json({ error: 'Not found' }, { status: 404 });

    const hasAccess = await verifyAccess(route.farm_id, session.user.id);
    if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });

    await deleteTourRoute(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tour route:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

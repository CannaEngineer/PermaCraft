import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { getTourRoutes, createTourRoute } from '@/lib/tour/queries';

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

    const routes = await getTourRoutes(farmId);
    return Response.json({ routes });
  } catch (error) {
    console.error('Failed to get tour routes:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { farm_id, name, duration_minutes, distance_meters, poi_sequence, difficulty, is_default } = body;

    if (!farm_id || !name) {
      return Response.json({ error: 'farm_id and name are required' }, { status: 400 });
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

    const route = await createTourRoute({
      id: crypto.randomUUID(),
      farm_id,
      name,
      duration_minutes: duration_minutes || null,
      distance_meters: distance_meters || null,
      poi_sequence: JSON.stringify(poi_sequence || []),
      cached_route_geojson: null,
      difficulty: difficulty || 'easy',
      is_default: is_default ? 1 : 0,
    });

    return Response.json({ route });
  } catch (error) {
    console.error('Failed to create tour route:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

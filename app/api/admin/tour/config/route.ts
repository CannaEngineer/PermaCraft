import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { getTourConfigByFarmId, upsertTourConfig } from '@/lib/tour/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const farmId = request.nextUrl.searchParams.get('farm_id');
    if (!farmId) return Response.json({ error: 'farm_id required' }, { status: 400 });

    // Verify ownership or admin
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

    const config = await getTourConfigByFarmId(farmId);
    return Response.json({ config });
  } catch (error) {
    console.error('Failed to get tour config:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { farm_id, slug, published, ai_system_prompt, primary_color, default_route_id } = body;

    if (!farm_id) return Response.json({ error: 'farm_id required' }, { status: 400 });

    // Verify ownership or admin
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

    const config = await upsertTourConfig(farm_id, {
      slug,
      published,
      ai_system_prompt,
      primary_color,
      default_route_id,
    });

    return Response.json({ config });
  } catch (error) {
    console.error('Failed to update tour config:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

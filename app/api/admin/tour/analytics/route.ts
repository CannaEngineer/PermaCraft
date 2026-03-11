import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/admin';
import { db } from '@/lib/db';
import { getTourAnalytics } from '@/lib/tour/queries';

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

    const analytics = await getTourAnalytics(farmId);
    return Response.json({ analytics });
  } catch (error) {
    console.error('Failed to get tour analytics:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

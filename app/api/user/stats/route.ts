import { requireAuth } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireAuth();

    const [farmsResult, plantingsResult, analysesResult] = await Promise.all([
      db.execute({
        sql: 'SELECT COUNT(*) as count FROM farms WHERE user_id = ?',
        args: [session.user.id],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM plantings p
              JOIN farms f ON p.farm_id = f.id
              WHERE f.user_id = ?`,
        args: [session.user.id],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM ai_analyses a
              JOIN farms f ON a.farm_id = f.id
              WHERE f.user_id = ?`,
        args: [session.user.id],
      }),
    ]);

    return Response.json({
      farmCount: Number(farmsResult.rows[0]?.count ?? 0),
      plantingCount: Number(plantingsResult.rows[0]?.count ?? 0),
      analysisCount: Number(analysesResult.rows[0]?.count ?? 0),
    });
  } catch (error) {
    console.error('User stats error:', error);
    return Response.json({ error: 'Failed to get stats' }, { status: 500 });
  }
}

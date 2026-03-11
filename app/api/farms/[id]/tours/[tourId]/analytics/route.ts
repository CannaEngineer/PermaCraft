import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';

// GET /api/farms/[id]/tours/[tourId]/analytics — owner-only analytics
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string; tourId: string }> }
) {
  const session = await requireAuth();
  const { id: farmId, tourId } = await context.params;

  // Verify ownership
  const farmResult = await db.execute({
    sql: 'SELECT user_id FROM farms WHERE id = ?',
    args: [farmId],
  });
  const farm = farmResult.rows[0] as any;
  if (!farm || farm.user_id !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30');
  const sinceTimestamp = Math.floor(Date.now() / 1000) - days * 86400;

  // Total visits
  const totalResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM tour_visits WHERE tour_id = ?',
    args: [tourId],
  });

  // Visits in period
  const periodResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM tour_visits WHERE tour_id = ? AND started_at >= ?',
    args: [tourId, sinceTimestamp],
  });

  // Completion rate
  const completedResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM tour_visits WHERE tour_id = ? AND completed_at IS NOT NULL',
    args: [tourId],
  });

  // Average rating
  const ratingResult = await db.execute({
    sql: 'SELECT AVG(rating) as avg_rating, COUNT(rating) as rating_count FROM tour_visits WHERE tour_id = ? AND rating IS NOT NULL',
    args: [tourId],
  });

  // Visits by day (last N days)
  const dailyResult = await db.execute({
    sql: `SELECT date(started_at, 'unixepoch') as visit_date, COUNT(*) as count
          FROM tour_visits WHERE tour_id = ? AND started_at >= ?
          GROUP BY visit_date ORDER BY visit_date ASC`,
    args: [tourId, sinceTimestamp],
  });

  // Device breakdown
  const deviceResult = await db.execute({
    sql: `SELECT device_type, COUNT(*) as count FROM tour_visits
          WHERE tour_id = ? AND started_at >= ? AND device_type IS NOT NULL
          GROUP BY device_type ORDER BY count DESC`,
    args: [tourId, sinceTimestamp],
  });

  // Recent feedback
  const feedbackResult = await db.execute({
    sql: `SELECT visitor_name, rating, feedback, completed_at, started_at
          FROM tour_visits WHERE tour_id = ? AND feedback IS NOT NULL
          ORDER BY started_at DESC LIMIT 20`,
    args: [tourId],
  });

  // Stop popularity (which stops get visited most)
  const stopVisitsResult = await db.execute({
    sql: `SELECT stops_visited FROM tour_visits WHERE tour_id = ? AND stops_visited IS NOT NULL`,
    args: [tourId],
  });

  const stopCounts: Record<string, number> = {};
  for (const row of stopVisitsResult.rows) {
    try {
      const visited = JSON.parse((row as any).stops_visited);
      if (Array.isArray(visited)) {
        for (const stopId of visited) {
          stopCounts[stopId] = (stopCounts[stopId] || 0) + 1;
        }
      }
    } catch { /* ignore */ }
  }

  const totalVisits = (totalResult.rows[0] as any)?.total || 0;
  const completedCount = (completedResult.rows[0] as any)?.total || 0;
  const ratingRow = ratingResult.rows[0] as any;

  return Response.json({
    total_visits: totalVisits,
    period_visits: (periodResult.rows[0] as any)?.total || 0,
    completion_rate: totalVisits > 0 ? Math.round((completedCount / totalVisits) * 100) : 0,
    avg_rating: ratingRow?.avg_rating ? Math.round(ratingRow.avg_rating * 10) / 10 : null,
    rating_count: ratingRow?.rating_count || 0,
    daily_visits: dailyResult.rows,
    device_breakdown: deviceResult.rows,
    recent_feedback: feedbackResult.rows,
    stop_popularity: stopCounts,
    period_days: days,
  });
}

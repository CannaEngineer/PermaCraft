/**
 * PermaTour AI database queries
 */
import { db } from '@/lib/db';
import type {
  TourConfig,
  TourPoi,
  TourRoute,
  TourSession,
  TourEvent,
  TourComment,
} from '@/lib/db/schema';

// ─── Tour Config ─────────────────────────────────────────────────────────────

export async function getTourConfigBySlug(slug: string): Promise<TourConfig | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM tour_configs WHERE slug = ?',
    args: [slug],
  });
  return (result.rows[0] as unknown as TourConfig) || null;
}

export async function getTourConfigByFarmId(farmId: string): Promise<TourConfig | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM tour_configs WHERE farm_id = ?',
    args: [farmId],
  });
  return (result.rows[0] as unknown as TourConfig) || null;
}

export async function upsertTourConfig(
  farmId: string,
  data: Partial<Pick<TourConfig, 'slug' | 'published' | 'ai_system_prompt' | 'primary_color' | 'default_route_id'>>
): Promise<TourConfig> {
  const existing = await getTourConfigByFarmId(farmId);

  if (existing) {
    const sets: string[] = [];
    const args: any[] = [];

    if (data.slug !== undefined) { sets.push('slug = ?'); args.push(data.slug); }
    if (data.published !== undefined) { sets.push('published = ?'); args.push(data.published); }
    if (data.ai_system_prompt !== undefined) { sets.push('ai_system_prompt = ?'); args.push(data.ai_system_prompt); }
    if (data.primary_color !== undefined) { sets.push('primary_color = ?'); args.push(data.primary_color); }
    if (data.default_route_id !== undefined) { sets.push('default_route_id = ?'); args.push(data.default_route_id); }

    sets.push('updated_at = unixepoch()');
    args.push(existing.id);

    await db.execute({
      sql: `UPDATE tour_configs SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    return { ...existing, ...data, updated_at: Math.floor(Date.now() / 1000) };
  }

  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO tour_configs (id, farm_id, slug, published, ai_system_prompt, primary_color, default_route_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      farmId,
      data.slug || '',
      data.published ?? 0,
      data.ai_system_prompt ?? null,
      data.primary_color ?? '#16a34a',
      data.default_route_id ?? null,
    ],
  });

  const result = await db.execute({ sql: 'SELECT * FROM tour_configs WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as TourConfig;
}

// ─── POIs ────────────────────────────────────────────────────────────────────

export async function getTourPois(farmId: string, activeOnly = true): Promise<TourPoi[]> {
  const sql = activeOnly
    ? 'SELECT * FROM tour_pois WHERE farm_id = ? AND active = 1 ORDER BY sort_order ASC'
    : 'SELECT * FROM tour_pois WHERE farm_id = ? ORDER BY sort_order ASC';
  const result = await db.execute({ sql, args: [farmId] });
  return result.rows as unknown as TourPoi[];
}

export async function getTourPoiById(id: string): Promise<TourPoi | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM tour_pois WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as TourPoi) || null;
}

export async function createTourPoi(data: Omit<TourPoi, 'created_at' | 'updated_at'>): Promise<TourPoi> {
  await db.execute({
    sql: `INSERT INTO tour_pois (id, farm_id, name, category, lat, lng, qr_code_id, description, media_urls, species_list, active, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.id, data.farm_id, data.name, data.category,
      data.lat, data.lng, data.qr_code_id,
      data.description, data.media_urls, data.species_list,
      data.active, data.sort_order,
    ],
  });
  const result = await db.execute({ sql: 'SELECT * FROM tour_pois WHERE id = ?', args: [data.id] });
  return result.rows[0] as unknown as TourPoi;
}

export async function updateTourPoi(
  id: string,
  data: Partial<Pick<TourPoi, 'name' | 'category' | 'lat' | 'lng' | 'description' | 'media_urls' | 'species_list' | 'active' | 'sort_order'>>
): Promise<void> {
  const sets: string[] = [];
  const args: any[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); args.push(data.name); }
  if (data.category !== undefined) { sets.push('category = ?'); args.push(data.category); }
  if (data.lat !== undefined) { sets.push('lat = ?'); args.push(data.lat); }
  if (data.lng !== undefined) { sets.push('lng = ?'); args.push(data.lng); }
  if (data.description !== undefined) { sets.push('description = ?'); args.push(data.description); }
  if (data.media_urls !== undefined) { sets.push('media_urls = ?'); args.push(data.media_urls); }
  if (data.species_list !== undefined) { sets.push('species_list = ?'); args.push(data.species_list); }
  if (data.active !== undefined) { sets.push('active = ?'); args.push(data.active); }
  if (data.sort_order !== undefined) { sets.push('sort_order = ?'); args.push(data.sort_order); }

  if (sets.length === 0) return;
  sets.push('updated_at = unixepoch()');
  args.push(id);

  await db.execute({
    sql: `UPDATE tour_pois SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });
}

export async function deleteTourPoi(id: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM tour_pois WHERE id = ?', args: [id] });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export async function getTourRoutes(farmId: string): Promise<TourRoute[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM tour_routes WHERE farm_id = ? ORDER BY is_default DESC, name ASC',
    args: [farmId],
  });
  return result.rows as unknown as TourRoute[];
}

export async function getTourRouteById(id: string): Promise<TourRoute | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM tour_routes WHERE id = ?',
    args: [id],
  });
  return (result.rows[0] as unknown as TourRoute) || null;
}

export async function createTourRoute(data: Omit<TourRoute, 'created_at' | 'updated_at'>): Promise<TourRoute> {
  await db.execute({
    sql: `INSERT INTO tour_routes (id, farm_id, name, duration_minutes, distance_meters, poi_sequence, cached_route_geojson, difficulty, is_default)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      data.id, data.farm_id, data.name,
      data.duration_minutes, data.distance_meters,
      data.poi_sequence, data.cached_route_geojson,
      data.difficulty, data.is_default,
    ],
  });
  const result = await db.execute({ sql: 'SELECT * FROM tour_routes WHERE id = ?', args: [data.id] });
  return result.rows[0] as unknown as TourRoute;
}

export async function updateTourRoute(
  id: string,
  data: Partial<Pick<TourRoute, 'name' | 'duration_minutes' | 'distance_meters' | 'poi_sequence' | 'cached_route_geojson' | 'difficulty' | 'is_default'>>
): Promise<void> {
  const sets: string[] = [];
  const args: any[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); args.push(data.name); }
  if (data.duration_minutes !== undefined) { sets.push('duration_minutes = ?'); args.push(data.duration_minutes); }
  if (data.distance_meters !== undefined) { sets.push('distance_meters = ?'); args.push(data.distance_meters); }
  if (data.poi_sequence !== undefined) { sets.push('poi_sequence = ?'); args.push(data.poi_sequence); }
  if (data.cached_route_geojson !== undefined) { sets.push('cached_route_geojson = ?'); args.push(data.cached_route_geojson); }
  if (data.difficulty !== undefined) { sets.push('difficulty = ?'); args.push(data.difficulty); }
  if (data.is_default !== undefined) { sets.push('is_default = ?'); args.push(data.is_default); }

  if (sets.length === 0) return;
  sets.push('updated_at = unixepoch()');
  args.push(id);

  await db.execute({
    sql: `UPDATE tour_routes SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });
}

export async function deleteTourRoute(id: string): Promise<void> {
  await db.execute({ sql: 'DELETE FROM tour_routes WHERE id = ?', args: [id] });
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createTourSession(data: {
  id: string;
  farm_id: string;
  route_id: string | null;
  device_type: string | null;
}): Promise<TourSession> {
  await db.execute({
    sql: `INSERT INTO tour_sessions (id, farm_id, route_id, device_type) VALUES (?, ?, ?, ?)`,
    args: [data.id, data.farm_id, data.route_id, data.device_type],
  });
  const result = await db.execute({ sql: 'SELECT * FROM tour_sessions WHERE id = ?', args: [data.id] });
  return result.rows[0] as unknown as TourSession;
}

export async function updateTourSession(
  id: string,
  data: Partial<Pick<TourSession, 'ended_at' | 'pois_visited_count' | 'shares_count' | 'completion_percentage'>>
): Promise<void> {
  const sets: string[] = [];
  const args: any[] = [];

  if (data.ended_at !== undefined) { sets.push('ended_at = ?'); args.push(data.ended_at); }
  if (data.pois_visited_count !== undefined) { sets.push('pois_visited_count = ?'); args.push(data.pois_visited_count); }
  if (data.shares_count !== undefined) { sets.push('shares_count = ?'); args.push(data.shares_count); }
  if (data.completion_percentage !== undefined) { sets.push('completion_percentage = ?'); args.push(data.completion_percentage); }

  if (sets.length === 0) return;
  args.push(id);

  await db.execute({
    sql: `UPDATE tour_sessions SET ${sets.join(', ')} WHERE id = ?`,
    args,
  });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function createTourEvents(events: Array<{
  session_id: string;
  farm_id: string;
  poi_id?: string | null;
  event_type: string;
  payload?: string | null;
}>): Promise<void> {
  for (const event of events) {
    await db.execute({
      sql: `INSERT INTO tour_events (id, session_id, farm_id, poi_id, event_type, payload) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        event.session_id,
        event.farm_id,
        event.poi_id ?? null,
        event.event_type,
        event.payload ?? null,
      ],
    });
  }
}

// ─── Comments ────────────────────────────────────────────────────────────────

export async function getTourComments(poiId: string, status?: string): Promise<TourComment[]> {
  const sql = status
    ? 'SELECT * FROM tour_comments WHERE poi_id = ? AND status = ? ORDER BY created_at DESC'
    : 'SELECT * FROM tour_comments WHERE poi_id = ? ORDER BY created_at DESC';
  const args = status ? [poiId, status] : [poiId];
  const result = await db.execute({ sql, args });
  return result.rows as unknown as TourComment[];
}

export async function createTourComment(data: {
  poi_id: string;
  farm_id: string;
  session_id: string | null;
  content: string;
}): Promise<TourComment> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO tour_comments (id, poi_id, farm_id, session_id, content) VALUES (?, ?, ?, ?, ?)`,
    args: [id, data.poi_id, data.farm_id, data.session_id, data.content],
  });
  const result = await db.execute({ sql: 'SELECT * FROM tour_comments WHERE id = ?', args: [id] });
  return result.rows[0] as unknown as TourComment;
}

export async function updateTourCommentStatus(id: string, status: string): Promise<void> {
  await db.execute({
    sql: 'UPDATE tour_comments SET status = ? WHERE id = ?',
    args: [status, id],
  });
}

// ─── Analytics Queries ───────────────────────────────────────────────────────

export async function getTourAnalytics(farmId: string) {
  const [
    sessionsResult,
    avgPoisResult,
    sharesResult,
    topPoiResult,
    recentSessionsResult,
  ] = await Promise.all([
    db.execute({
      sql: 'SELECT COUNT(*) as total FROM tour_sessions WHERE farm_id = ?',
      args: [farmId],
    }),
    db.execute({
      sql: 'SELECT AVG(pois_visited_count) as avg_pois FROM tour_sessions WHERE farm_id = ?',
      args: [farmId],
    }),
    db.execute({
      sql: 'SELECT SUM(shares_count) as total_shares FROM tour_sessions WHERE farm_id = ?',
      args: [farmId],
    }),
    db.execute({
      sql: `SELECT poi_id, COUNT(*) as visits
            FROM tour_events
            WHERE farm_id = ? AND event_type = 'poi_arrived' AND poi_id IS NOT NULL
            GROUP BY poi_id
            ORDER BY visits DESC
            LIMIT 1`,
      args: [farmId],
    }),
    db.execute({
      sql: `SELECT * FROM tour_sessions WHERE farm_id = ? ORDER BY started_at DESC LIMIT 20`,
      args: [farmId],
    }),
  ]);

  const totalSessions = Number((sessionsResult.rows[0] as any)?.total ?? 0);
  const avgPoisVisited = Number((avgPoisResult.rows[0] as any)?.avg_pois ?? 0);
  const totalShares = Number((sharesResult.rows[0] as any)?.total_shares ?? 0);
  const topPoiId = (topPoiResult.rows[0] as any)?.poi_id ?? null;
  const topPoiVisits = Number((topPoiResult.rows[0] as any)?.visits ?? 0);

  return {
    totalSessions,
    avgPoisVisited: Math.round(avgPoisVisited * 10) / 10,
    totalShares,
    shareRate: totalSessions > 0 ? Math.round((totalShares / totalSessions) * 100) : 0,
    topPoi: topPoiId ? { poiId: topPoiId, visits: topPoiVisits } : null,
    recentSessions: recentSessionsResult.rows as unknown as TourSession[],
  };
}

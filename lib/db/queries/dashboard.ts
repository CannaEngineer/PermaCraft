import { db } from '@/lib/db';
import { Task } from '@/lib/db/schema';

export interface DashboardFarm {
  id: string;
  name: string;
  description: string | null;
  acres: number | null;
  climate_zone: string | null;
  center_lat: number | null;
  center_lng: number | null;
  updated_at: number;
  planting_count: number;
  eco_health_score: number;
  latest_screenshot: string | null;
}

export async function getDashboardFarms(userId: string): Promise<DashboardFarm[]> {
  const result = await db.execute({
    sql: `
      SELECT
        f.id, f.name, f.description, f.acres, f.climate_zone,
        f.center_lat, f.center_lng, f.updated_at,
        COUNT(DISTINCT p.id) as planting_count,
        (SELECT screenshot_data FROM ai_analyses
         WHERE farm_id = f.id ORDER BY created_at DESC LIMIT 1) as latest_screenshot_json
      FROM farms f
      LEFT JOIN plantings p ON p.farm_id = f.id
      WHERE f.user_id = ?
      GROUP BY f.id
      ORDER BY f.updated_at DESC
    `,
    args: [userId],
  });

  return result.rows.map((row) => {
    let latest_screenshot: string | null = null;
    if (row.latest_screenshot_json) {
      const raw = row.latest_screenshot_json as string;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          latest_screenshot = typeof parsed[0] === 'string' ? parsed[0] : null;
        } else if (typeof parsed === 'string') {
          latest_screenshot = parsed;
        }
      } catch {
        if (/^(https?:|data:image\/|\/)/.test(raw)) {
          latest_screenshot = raw;
        }
      }
    }
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      acres: row.acres as number | null,
      climate_zone: row.climate_zone as string | null,
      center_lat: row.center_lat as number | null,
      center_lng: row.center_lng as number | null,
      updated_at: row.updated_at as number,
      planting_count: row.planting_count as number,
      eco_health_score: 0,
      latest_screenshot,
    };
  });
}

export async function getEcoHealthScore(farmId: string): Promise<{ score: number; functions: Record<string, number> }> {
  return (await getBatchEcoHealthScores([farmId]))[farmId] ?? { score: 0, functions: {} };
}

const ECO_FUNCTIONS = [
  'nitrogen_fixer', 'pollinator', 'dynamic_accumulator',
  'wildlife_habitat', 'edible', 'medicinal', 'erosion_control', 'water_management',
] as const;

export async function getBatchEcoHealthScores(
  farmIds: string[]
): Promise<Record<string, { score: number; functions: Record<string, number> }>> {
  if (farmIds.length === 0) return {};

  const placeholders = farmIds.map(() => '?').join(',');
  const result = await db.execute({
    sql: `
      SELECT p.farm_id, s.permaculture_functions
      FROM plantings p
      JOIN species s ON s.id = p.species_id
      WHERE p.farm_id IN (${placeholders})
        AND s.permaculture_functions IS NOT NULL
    `,
    args: farmIds,
  });

  const byFarm = new Map<string, Record<string, number>>();
  for (const id of farmIds) {
    const counts: Record<string, number> = {};
    ECO_FUNCTIONS.forEach((f) => (counts[f] = 0));
    byFarm.set(id, counts);
  }

  for (const row of result.rows) {
    const fid = row.farm_id as string;
    const counts = byFarm.get(fid);
    if (!counts) continue;
    try {
      const fns: string[] = JSON.parse(row.permaculture_functions as string);
      for (const fn of fns) {
        if (fn in counts) counts[fn]++;
      }
    } catch {}
  }

  const out: Record<string, { score: number; functions: Record<string, number> }> = {};
  for (const [fid, counts] of byFarm) {
    const covered = ECO_FUNCTIONS.filter((f) => counts[f] > 0).length;
    out[fid] = { score: Math.round((covered / ECO_FUNCTIONS.length) * 100), functions: counts };
  }
  return out;
}

export async function getFarmTasks(farmId: string): Promise<Task[]> {
  const result = await db.execute({
    sql: `
      SELECT * FROM tasks
      WHERE farm_id = ?
        AND status NOT IN ('completed', 'skipped')
      ORDER BY priority DESC, created_at DESC
      LIMIT 20
    `,
    args: [farmId],
  });
  return result.rows as unknown as Task[];
}

export async function getUrgentTaskCount(farmId: string): Promise<number> {
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM tasks WHERE farm_id = ? AND priority = 4 AND status = 'pending'`,
    args: [farmId],
  });
  return (result.rows[0]?.count as number) ?? 0;
}

export async function getRecentAiInsights(farmId: string) {
  const result = await db.execute({
    sql: `
      SELECT id, ai_response, created_at, user_query
      FROM ai_analyses
      WHERE farm_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `,
    args: [farmId],
  });
  return result.rows;
}

export async function getRecentActivity(farmId: string) {
  return (await getBatchRecentActivity([farmId]))[farmId] ?? [];
}

export async function getBatchRecentActivity(
  farmIds: string[]
): Promise<Record<string, any[]>> {
  if (farmIds.length === 0) return {};

  const placeholders = farmIds.map(() => '?').join(',');
  const perSubqueryLimit = farmIds.length * 15;
  const result = await db.execute({
    sql: `
      SELECT * FROM (
        SELECT 'ai' as type, a.id, a.farm_id, COALESCE(a.user_query, 'AI Analysis') as title, a.created_at
        FROM ai_analyses a WHERE a.farm_id IN (${placeholders})
        ORDER BY a.created_at DESC LIMIT ${perSubqueryLimit}
      )
      UNION ALL
      SELECT * FROM (
        SELECT 'planting' as type, p.id, p.farm_id,
          COALESCE(p.name, s.common_name, 'New planting') as title,
          p.created_at
        FROM plantings p
        LEFT JOIN species s ON s.id = p.species_id
        WHERE p.farm_id IN (${placeholders})
        ORDER BY p.created_at DESC LIMIT ${perSubqueryLimit}
      )
      UNION ALL
      SELECT * FROM (
        SELECT 'zone' as type, z.id, z.farm_id, COALESCE(z.name, z.zone_type, 'New zone') as title, z.created_at
        FROM zones z WHERE z.farm_id IN (${placeholders})
        ORDER BY z.created_at DESC LIMIT ${perSubqueryLimit}
      )
      UNION ALL
      SELECT * FROM (
        SELECT 'task' as type, t.id, t.farm_id,
          CASE WHEN t.status = 'completed' THEN 'Completed: ' || t.title ELSE t.title END as title,
          COALESCE(t.completed_at, t.created_at) as created_at
        FROM tasks t WHERE t.farm_id IN (${placeholders})
          AND (t.status = 'completed' OR t.created_at > unixepoch() - 604800)
        ORDER BY created_at DESC LIMIT ${perSubqueryLimit}
      )
      ORDER BY created_at DESC
    `,
    args: [...farmIds, ...farmIds, ...farmIds, ...farmIds],
  });

  const out: Record<string, any[]> = {};
  for (const id of farmIds) out[id] = [];

  for (const row of result.rows) {
    const fid = row.farm_id as string;
    if (out[fid] && out[fid].length < 10) {
      out[fid].push(row);
    }
  }
  return out;
}

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
      try {
        const parsed = JSON.parse(row.latest_screenshot_json as string);
        latest_screenshot = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {}
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
      eco_health_score: 0, // computed separately
      latest_screenshot,
    };
  });
}

export async function getEcoHealthScore(farmId: string): Promise<{ score: number; functions: Record<string, number> }> {
  const FUNCTIONS = [
    'nitrogen_fixer', 'pollinator', 'dynamic_accumulator',
    'wildlife_habitat', 'edible', 'medicinal', 'erosion_control', 'water_management',
  ];

  const result = await db.execute({
    sql: `
      SELECT s.permaculture_functions
      FROM plantings p
      JOIN species s ON s.id = p.species_id
      WHERE p.farm_id = ?
        AND s.permaculture_functions IS NOT NULL
    `,
    args: [farmId],
  });

  const counts: Record<string, number> = {};
  FUNCTIONS.forEach((f) => (counts[f] = 0));

  for (const row of result.rows) {
    try {
      const fns: string[] = JSON.parse(row.permaculture_functions as string);
      fns.forEach((fn) => {
        if (fn in counts) counts[fn]++;
      });
    } catch {}
  }

  const covered = FUNCTIONS.filter((f) => counts[f] > 0).length;
  const score = Math.round((covered / FUNCTIONS.length) * 100);
  return { score, functions: counts };
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
  const result = await db.execute({
    sql: `
      SELECT 'ai' as type, id, user_query as title, created_at FROM ai_analyses WHERE farm_id = ?
      UNION ALL
      SELECT 'planting' as type, id, name as title, created_at FROM plantings WHERE farm_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `,
    args: [farmId, farmId],
  });
  return result.rows;
}

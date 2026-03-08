import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;

    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as any;

    // Parallel queries for all report data
    const [
      zonesResult,
      plantingsResult,
      speciesDiversityResult,
      layerDistributionResult,
      harvestResult,
      taskStatsResult,
      cropPlanResult,
    ] = await Promise.all([
      // Zone stats
      db.execute({
        sql: `SELECT zone_type, COUNT(*) as count, properties FROM zones WHERE farm_id = ? GROUP BY zone_type`,
        args: [farmId],
      }),
      // Planting stats
      db.execute({
        sql: `SELECT p.*, s.common_name, s.scientific_name, s.layer, s.is_native, s.permaculture_functions
              FROM plantings p
              JOIN species s ON p.species_id = s.id
              WHERE p.farm_id = ?`,
        args: [farmId],
      }),
      // Species diversity (unique species count)
      db.execute({
        sql: `SELECT COUNT(DISTINCT species_id) as unique_species,
              COUNT(*) as total_plantings
              FROM plantings WHERE farm_id = ?`,
        args: [farmId],
      }),
      // Layer distribution
      db.execute({
        sql: `SELECT s.layer, COUNT(*) as count
              FROM plantings p
              JOIN species s ON p.species_id = s.id
              WHERE p.farm_id = ?
              GROUP BY s.layer
              ORDER BY count DESC`,
        args: [farmId],
      }),
      // Harvest totals by month
      db.execute({
        sql: `SELECT
              strftime('%Y-%m', harvest_date, 'unixepoch') as month,
              SUM(quantity) as total_quantity,
              unit,
              AVG(quality_rating) as avg_quality,
              COUNT(*) as harvest_count
              FROM harvest_logs
              WHERE farm_id = ?
              GROUP BY month, unit
              ORDER BY month DESC`,
        args: [farmId],
      }),
      // Task completion stats
      db.execute({
        sql: `SELECT status, COUNT(*) as count FROM tasks WHERE farm_id = ? GROUP BY status`,
        args: [farmId],
      }),
      // Active crop plans
      db.execute({
        sql: `SELECT cp.*,
              (SELECT COUNT(*) FROM crop_plan_items WHERE crop_plan_id = cp.id) as total_items,
              (SELECT COUNT(*) FROM crop_plan_items WHERE crop_plan_id = cp.id AND status = 'done') as completed_items
              FROM crop_plans cp
              WHERE cp.farm_id = ? AND cp.status IN ('active', 'draft')
              ORDER BY cp.year DESC, cp.created_at DESC`,
        args: [farmId],
      }),
    ]);

    // Compute permaculture function coverage
    const functionCounts: Record<string, number> = {};
    let nativeCount = 0;
    let totalPlantings = 0;

    for (const p of plantingsResult.rows as any[]) {
      totalPlantings++;
      if (p.is_native) nativeCount++;
      if (p.permaculture_functions) {
        try {
          const fns = JSON.parse(p.permaculture_functions);
          for (const fn of fns) {
            functionCounts[fn] = (functionCounts[fn] || 0) + 1;
          }
        } catch { /* skip parse errors */ }
      }
    }

    // Compute zone area from farm_boundary
    let totalAcres = farm.acres || 0;
    for (const z of zonesResult.rows as any[]) {
      if (z.zone_type === "farm_boundary" && z.properties) {
        try {
          const props = JSON.parse(z.properties);
          if (props.area_acres) totalAcres = props.area_acres;
        } catch { /* skip */ }
      }
    }

    const taskStats = Object.fromEntries(
      (taskStatsResult.rows as any[]).map((r) => [r.status, r.count])
    );

    return Response.json({
      farm,
      overview: {
        total_acres: totalAcres,
        total_plantings: totalPlantings,
        unique_species: (speciesDiversityResult.rows[0] as any)?.unique_species || 0,
        native_percentage: totalPlantings > 0 ? Math.round((nativeCount / totalPlantings) * 100) : 0,
        zone_count: zonesResult.rows.length,
      },
      zones: zonesResult.rows,
      layer_distribution: layerDistributionResult.rows,
      permaculture_functions: Object.entries(functionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      harvest_summary: harvestResult.rows,
      task_stats: {
        pending: taskStats.pending || 0,
        in_progress: taskStats.in_progress || 0,
        completed: taskStats.completed || 0,
        skipped: taskStats.skipped || 0,
      },
      crop_plans: cropPlanResult.rows,
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return Response.json({ error: "Failed to generate reports" }, { status: 500 });
  }
}

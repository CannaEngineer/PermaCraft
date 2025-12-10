import { db } from "@/lib/db";

/**
 * Filter Options API
 *
 * Returns available filter values (climate zones, soil types)
 * from public farms that have posts
 */
export async function GET() {
  try {
    // Get distinct climate zones from farms with public posts
    const climateResult = await db.execute({
      sql: `
        SELECT DISTINCT f.climate_zone
        FROM farms f
        JOIN farm_posts p ON p.farm_id = f.id
        WHERE f.is_public = 1
          AND p.is_published = 1
          AND f.climate_zone IS NOT NULL
          AND f.climate_zone != ''
        ORDER BY f.climate_zone
      `,
      args: [],
    });

    // Get distinct soil types
    const soilResult = await db.execute({
      sql: `
        SELECT DISTINCT f.soil_type
        FROM farms f
        JOIN farm_posts p ON p.farm_id = f.id
        WHERE f.is_public = 1
          AND p.is_published = 1
          AND f.soil_type IS NOT NULL
          AND f.soil_type != ''
        ORDER BY f.soil_type
      `,
      args: [],
    });

    const climateZones = climateResult.rows.map((row: any) => row.climate_zone);
    const soilTypes = soilResult.rows.map((row: any) => row.soil_type);

    return Response.json({
      climateZones,
      soilTypes,
    });
  } catch (error) {
    console.error("Filter options error:", error);
    return Response.json(
      { error: "Failed to load filter options" },
      { status: 500 }
    );
  }
}

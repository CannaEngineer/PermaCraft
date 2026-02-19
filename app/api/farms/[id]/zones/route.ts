import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";
import { calculateCatchmentCapture, calculateSwaleCapacity, calculateAreaFromGeometry, calculateLengthFromGeometry } from "@/lib/water/calculations";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    // Verify farm ownership or public access
    const farmResult = await db.execute({
      sql: "SELECT id, user_id, is_public FROM farms WHERE id = ?",
      args: [farmId],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as any;
    if (farm.user_id !== session.user.id && !farm.is_public) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const zonesResult = await db.execute({
      sql: "SELECT * FROM zones WHERE farm_id = ? ORDER BY created_at ASC",
      args: [farmId],
    });

    return Response.json({ zones: zonesResult.rows });
  } catch (error) {
    console.error("Get zones error:", error);
    return Response.json({ error: "Failed to get zones" }, { status: 500 });
  }
}

const saveZonesSchema = z.object({
  zones: z.array(z.object({
    id: z.string().optional(),
    type: z.literal("Feature"),
    geometry: z.any(),
    properties: z.record(z.any()).optional(),
  })),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;
    const body = await request.json();
    const { zones } = saveZonesSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Get existing farm_boundary zones before deletion (to preserve their IDs and zone_type)
    const farmBoundaryResult = await db.execute({
      sql: "SELECT id FROM zones WHERE farm_id = ? AND zone_type = 'farm_boundary'",
      args: [farmId],
    });
    const farmBoundaryIds = new Set(farmBoundaryResult.rows.map(row => row.id as string));

    // Delete all existing zones for this farm first
    await db.execute({
      sql: "DELETE FROM zones WHERE farm_id = ?",
      args: [farmId],
    });

    // Insert new zones using batch transaction
    if (zones.length > 0) {
      const statements = zones.map((zone) => {
        const zoneId = zone.id || crypto.randomUUID();
        const geometry = JSON.stringify(zone.geometry);
        const properties = JSON.stringify(zone.properties || {});

        // Preserve farm_boundary zone_type - if this zone ID was a farm_boundary, keep it as farm_boundary
        // Otherwise, extract zone_type from properties
        const isFarmBoundary = farmBoundaryIds.has(zoneId);
        const zoneType = isFarmBoundary ? "farm_boundary" : (zone.properties?.user_zone_type || "other");

        console.log(`Saving zone ${zoneId}:`, {
          zoneType,
          properties: zone.properties,
          hasUserZoneType: !!zone.properties?.user_zone_type,
          isFarmBoundary
        });

        // Compute water properties from embedded zone props
        const props = zone.properties || {};
        const waterZoneTypes = ['pond', 'swale', 'water_body', 'water_flow'];
        let catchmentPropertiesJson: string | null = null;
        let swalePropertiesJson: string | null = null;

        if (waterZoneTypes.includes(zoneType) && props.water_rainfall_inches) {
          let areaSqFt = 0;
          try {
            areaSqFt = calculateAreaFromGeometry(zone.geometry);
          } catch { /* ignore */ }
          const capture = areaSqFt > 0
            ? calculateCatchmentCapture({ catchmentAreaSqFt: areaSqFt, annualRainfallInches: props.water_rainfall_inches })
            : 0;
          catchmentPropertiesJson = JSON.stringify({
            is_catchment: true,
            rainfall_inches_per_year: props.water_rainfall_inches,
            estimated_capture_gallons: capture,
          });
        }

        if (zoneType === 'swale' && props.water_swale_depth_feet) {
          let lengthFt = 0;
          try {
            lengthFt = calculateLengthFromGeometry(zone.geometry);
          } catch { /* ignore */ }
          const capacity = lengthFt > 0
            ? calculateSwaleCapacity({ lengthFeet: lengthFt, widthFeet: 3, depthFeet: props.water_swale_depth_feet })
            : 0;
          swalePropertiesJson = JSON.stringify({
            is_swale: true,
            length_feet: lengthFt,
            cross_section_depth_feet: props.water_swale_depth_feet,
            estimated_volume_gallons: capacity,
          });
        }

        return {
          sql: `INSERT INTO zones (id, farm_id, zone_type, geometry, properties, catchment_properties, swale_properties)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [zoneId, farmId, zoneType, geometry, properties, catchmentPropertiesJson, swalePropertiesJson],
        };
      });

      await db.batch(statements);
    }

    // Update farm timestamp
    await db.execute({
      sql: "UPDATE farms SET updated_at = unixepoch() WHERE id = ?",
      args: [farmId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Save zones error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Failed to save zones" }, { status: 500 });
  }
}

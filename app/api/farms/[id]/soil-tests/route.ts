import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const soilTestSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number(),
  altitude: z.number().nullable(),
  ph: z.number().min(0).max(14).nullable(),
  texture: z.string().nullable(),
  organic_matter: z.number().nullable(),
  drainage: z.string().nullable(),
  nitrogen: z.string().nullable(),
  phosphorus: z.string().nullable(),
  potassium: z.string().nullable(),
  depth_inches: z.number().nullable(),
  color: z.string().nullable(),
  moisture: z.string().nullable(),
  notes: z.string(),
  label: z.string(),
  tested_at: z.string(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

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

    // Soil tests are stored as zone point features with marker_type='soil_test'
    const result = await db.execute({
      sql: `SELECT * FROM zones
            WHERE farm_id = ? AND zone_type = 'feature'
            AND json_extract(properties, '$.marker_type') = 'soil_test'
            ORDER BY created_at DESC`,
      args: [farmId],
    });

    return Response.json({ soilTests: result.rows });
  } catch (error) {
    console.error("Get soil tests error:", error);
    return Response.json({ error: "Failed to get soil tests" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;
    const body = await request.json();
    const data = soilTestSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const zoneId = crypto.randomUUID();
    const geometry = JSON.stringify({
      type: 'Point',
      coordinates: [data.lng, data.lat],
    });

    const properties = JSON.stringify({
      name: data.label,
      zone_type: 'feature',
      marker_type: 'soil_test',
      gps_accuracy: data.accuracy,
      gps_altitude: data.altitude,
      dropped_at: data.tested_at,
      // Soil test specific data
      soil_ph: data.ph,
      soil_texture: data.texture,
      soil_organic_matter: data.organic_matter,
      soil_drainage: data.drainage,
      soil_nitrogen: data.nitrogen,
      soil_phosphorus: data.phosphorus,
      soil_potassium: data.potassium,
      soil_depth_inches: data.depth_inches,
      soil_color: data.color,
      soil_moisture: data.moisture,
      soil_notes: data.notes,
    });

    await db.execute({
      sql: `INSERT INTO zones (id, farm_id, zone_type, geometry, properties)
            VALUES (?, ?, 'feature', ?, ?)`,
      args: [zoneId, farmId, geometry, properties],
    });

    // Update farm timestamp
    await db.execute({
      sql: "UPDATE farms SET updated_at = unixepoch() WHERE id = ?",
      args: [farmId],
    });

    return Response.json({ success: true, id: zoneId });
  } catch (error) {
    console.error("Save soil test error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return Response.json({ error: "Failed to save soil test" }, { status: 500 });
  }
}

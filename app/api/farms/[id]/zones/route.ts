import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

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

    // Upsert zones using batch transaction
    const statements = zones.map((zone) => {
      const zoneId = zone.id || crypto.randomUUID();
      const geometry = JSON.stringify(zone.geometry);
      const properties = JSON.stringify(zone.properties || {});

      return {
        sql: `INSERT INTO zones (id, farm_id, zone_type, geometry, properties)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                geometry = excluded.geometry,
                properties = excluded.properties,
                updated_at = unixepoch()`,
        args: [zoneId, farmId, "polygon", geometry, properties],
      };
    });

    // Execute all upserts in a batch transaction
    if (statements.length > 0) {
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

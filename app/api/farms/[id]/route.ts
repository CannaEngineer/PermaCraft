import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

// GET /api/farms/[id] — fetch farm details
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json(
        { error: "Farm not found or you don't have permission" },
        { status: 404 }
      );
    }

    return Response.json(farmResult.rows[0]);
  } catch (error) {
    console.error("Farm fetch error:", error);
    return Response.json(
      { error: "Failed to fetch farm" },
      { status: 500 }
    );
  }
}

const updateFarmSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  acres: z.number().positive().max(100000).nullable().optional(),
  climate_zone: z.string().max(10).nullable().optional(),
  soil_type: z.string().max(100).nullable().optional(),
  is_public: z.union([z.literal(0), z.literal(1)]).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json(
        { error: "Farm not found or you don't have permission" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const validationResult = updateFarmSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { error: "Invalid input", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const setClauses: string[] = [];
    const args: (string | number | null)[] = [];

    if (data.name !== undefined) { setClauses.push("name = ?"); args.push(data.name); }
    if (data.description !== undefined) { setClauses.push("description = ?"); args.push(data.description); }
    if (data.acres !== undefined) { setClauses.push("acres = ?"); args.push(data.acres); }
    if (data.climate_zone !== undefined) { setClauses.push("climate_zone = ?"); args.push(data.climate_zone); }
    if (data.soil_type !== undefined) { setClauses.push("soil_type = ?"); args.push(data.soil_type); }
    if (data.is_public !== undefined) { setClauses.push("is_public = ?"); args.push(data.is_public); }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    setClauses.push("updated_at = unixepoch()");
    args.push(farmId);

    await db.execute({
      sql: `UPDATE farms SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Farm update error:", error);
    return Response.json(
      { error: "Failed to update farm" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id, user_id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found or access denied" }, { status: 404 });
    }

    // Delete all related data in correct order (respecting foreign key constraints)
    // 1. Delete AI analyses
    await db.execute({
      sql: "DELETE FROM ai_analyses WHERE farm_id = ?",
      args: [farmId],
    });

    // 2. Delete AI conversations
    await db.execute({
      sql: "DELETE FROM ai_conversations WHERE farm_id = ?",
      args: [farmId],
    });

    // 3. Delete map snapshots
    await db.execute({
      sql: "DELETE FROM map_snapshots WHERE farm_id = ?",
      args: [farmId],
    });

    // 4. Delete plantings
    await db.execute({
      sql: "DELETE FROM plantings WHERE farm_id = ?",
      args: [farmId],
    });

    // 5. Delete zones
    await db.execute({
      sql: "DELETE FROM zones WHERE farm_id = ?",
      args: [farmId],
    });

    // 6. Delete farm collaborators
    await db.execute({
      sql: "DELETE FROM farm_collaborators WHERE farm_id = ?",
      args: [farmId],
    });

    // 7. Finally delete the farm itself
    await db.execute({
      sql: "DELETE FROM farms WHERE id = ?",
      args: [farmId],
    });

    return Response.json({ success: true, message: "Farm deleted successfully" });
  } catch (error) {
    console.error("Delete farm error:", error);
    return Response.json({ error: "Failed to delete farm" }, { status: 500 });
  }
}

import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const result = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [id, session.user.id],
    });

    if (result.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    return Response.json(result.rows[0]);
  } catch (error) {
    return Response.json({ error: "Failed to fetch farm" }, { status: 500 });
  }
}

const updateFarmSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  is_public: z.number().min(0).max(1).optional(),
  climate_zone: z.string().nullable().optional(),
  rainfall_inches: z.number().positive().nullable().optional(),
  soil_type: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const body = await request.json();
    const updates = updateFarmSchema.parse(body);

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    // Verify ownership
    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [id, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Build update query
    const updateFields = Object.entries(updates)
      .map(([key, _]) => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(updates), id];

    await db.execute({
      sql: `UPDATE farms SET ${updateFields}, updated_at = unixepoch() WHERE id = ?`,
      args: values,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Update farm error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Failed to update farm" }, { status: 500 });
  }
}

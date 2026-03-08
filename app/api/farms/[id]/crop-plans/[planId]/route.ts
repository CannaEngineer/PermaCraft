import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const updatePlanSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  season: z.enum(["spring", "summer", "fall", "winter", "year-round"]).optional(),
  year: z.number().min(2020).max(2100).optional(),
  status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, planId } = await params;

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const planResult = await db.execute({
      sql: "SELECT * FROM crop_plans WHERE id = ? AND farm_id = ?",
      args: [planId, farmId],
    });
    if (planResult.rows.length === 0) {
      return Response.json({ error: "Crop plan not found" }, { status: 404 });
    }

    const itemsResult = await db.execute({
      sql: `SELECT cpi.*, s.common_name as species_name, s.scientific_name, s.layer as species_layer
            FROM crop_plan_items cpi
            LEFT JOIN species s ON cpi.species_id = s.id
            WHERE cpi.crop_plan_id = ?
            ORDER BY cpi.planned_sow_date ASC NULLS LAST, cpi.name ASC`,
      args: [planId],
    });

    return Response.json({
      plan: planResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching crop plan:", error);
    return Response.json({ error: "Failed to fetch crop plan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, planId } = await params;
    const body = await request.json();

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const validated = updatePlanSchema.parse(body);

    const setClauses: string[] = [];
    const args: any[] = [];

    if (validated.name !== undefined) { setClauses.push("name = ?"); args.push(validated.name); }
    if (validated.season !== undefined) { setClauses.push("season = ?"); args.push(validated.season); }
    if (validated.year !== undefined) { setClauses.push("year = ?"); args.push(validated.year); }
    if (validated.status !== undefined) { setClauses.push("status = ?"); args.push(validated.status); }
    if (validated.notes !== undefined) { setClauses.push("notes = ?"); args.push(validated.notes); }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    setClauses.push("updated_at = unixepoch()");
    args.push(planId, farmId);

    await db.execute({
      sql: `UPDATE crop_plans SET ${setClauses.join(", ")} WHERE id = ? AND farm_id = ?`,
      args,
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error updating crop plan:", error);
    return Response.json({ error: "Failed to update crop plan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, planId } = await params;

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    await db.execute({
      sql: "DELETE FROM crop_plans WHERE id = ? AND farm_id = ?",
      args: [planId, farmId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting crop plan:", error);
    return Response.json({ error: "Failed to delete crop plan" }, { status: 500 });
  }
}

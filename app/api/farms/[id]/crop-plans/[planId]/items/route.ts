import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const itemSchema = z.object({
  species_id: z.string().optional().nullable(),
  variety_id: z.string().optional().nullable(),
  zone_id: z.string().optional().nullable(),
  name: z.string().min(1).max(200),
  planned_sow_date: z.number().optional().nullable(),
  planned_transplant_date: z.number().optional().nullable(),
  planned_harvest_date: z.number().optional().nullable(),
  quantity: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  expected_yield: z.number().optional().nullable(),
  expected_yield_unit: z.string().optional().nullable(),
  status: z.enum(["planned", "sown", "transplanted", "growing", "harvesting", "done"]).default("planned"),
  notes: z.string().max(2000).optional().nullable(),
});

const updateItemSchema = itemSchema.partial().extend({
  actual_yield: z.number().optional().nullable(),
  actual_yield_unit: z.string().optional().nullable(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; planId: string }> }) {
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

    const planResult = await db.execute({
      sql: "SELECT id FROM crop_plans WHERE id = ? AND farm_id = ?",
      args: [planId, farmId],
    });
    if (planResult.rows.length === 0) {
      return Response.json({ error: "Crop plan not found" }, { status: 404 });
    }

    const validated = itemSchema.parse(body);
    const itemId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO crop_plan_items (id, crop_plan_id, species_id, variety_id, zone_id, name, planned_sow_date, planned_transplant_date, planned_harvest_date, quantity, unit, expected_yield, expected_yield_unit, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      args: [
        itemId, planId,
        validated.species_id || null, validated.variety_id || null, validated.zone_id || null,
        validated.name,
        validated.planned_sow_date || null, validated.planned_transplant_date || null, validated.planned_harvest_date || null,
        validated.quantity || null, validated.unit || null,
        validated.expected_yield || null, validated.expected_yield_unit || null,
        validated.status, validated.notes || null,
      ],
    });

    const result = await db.execute({
      sql: `SELECT cpi.*, s.common_name as species_name, s.scientific_name
            FROM crop_plan_items cpi
            LEFT JOIN species s ON cpi.species_id = s.id
            WHERE cpi.id = ?`,
      args: [itemId],
    });

    return Response.json({ item: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error creating crop plan item:", error);
    return Response.json({ error: "Failed to create item" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, planId } = await params;
    const body = await request.json();
    const { itemId, ...updates } = body;

    if (!itemId) {
      return Response.json({ error: "itemId required" }, { status: 400 });
    }

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const validated = updateItemSchema.parse(updates);

    const setClauses: string[] = [];
    const args: any[] = [];

    const fields = [
      "species_id", "variety_id", "zone_id", "name",
      "planned_sow_date", "planned_transplant_date", "planned_harvest_date",
      "quantity", "unit", "expected_yield", "expected_yield_unit",
      "actual_yield", "actual_yield_unit", "status", "notes",
    ] as const;

    for (const field of fields) {
      if ((validated as any)[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        args.push((validated as any)[field] ?? null);
      }
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    setClauses.push("updated_at = unixepoch()");
    args.push(itemId, planId);

    await db.execute({
      sql: `UPDATE crop_plan_items SET ${setClauses.join(", ")} WHERE id = ? AND crop_plan_id = ?`,
      args,
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error updating crop plan item:", error);
    return Response.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; planId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, planId } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return Response.json({ error: "itemId required" }, { status: 400 });
    }

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    await db.execute({
      sql: "DELETE FROM crop_plan_items WHERE id = ? AND crop_plan_id = ?",
      args: [itemId, planId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting crop plan item:", error);
    return Response.json({ error: "Failed to delete item" }, { status: 500 });
  }
}

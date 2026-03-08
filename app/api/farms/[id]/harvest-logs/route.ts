import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const harvestLogSchema = z.object({
  crop_plan_item_id: z.string().optional().nullable(),
  planting_id: z.string().optional().nullable(),
  species_id: z.string().optional().nullable(),
  harvest_date: z.number(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  quality_rating: z.number().min(1).max(5).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  photo_url: z.string().optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const result = await db.execute({
      sql: `SELECT hl.*, s.common_name as species_name, s.scientific_name
            FROM harvest_logs hl
            LEFT JOIN species s ON hl.species_id = s.id
            WHERE hl.farm_id = ?
            ORDER BY hl.harvest_date DESC`,
      args: [farmId],
    });

    return Response.json({ logs: result.rows });
  } catch (error) {
    console.error("Error fetching harvest logs:", error);
    return Response.json({ error: "Failed to fetch harvest logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;
    const body = await request.json();

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const validated = harvestLogSchema.parse(body);
    const logId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO harvest_logs (id, farm_id, crop_plan_item_id, planting_id, species_id, harvest_date, quantity, unit, quality_rating, notes, photo_url, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      args: [
        logId, farmId,
        validated.crop_plan_item_id || null,
        validated.planting_id || null,
        validated.species_id || null,
        validated.harvest_date,
        validated.quantity,
        validated.unit,
        validated.quality_rating || null,
        validated.notes || null,
        validated.photo_url || null,
        session.user.id,
      ],
    });

    // If linked to a crop plan item, update its actual_yield
    if (validated.crop_plan_item_id) {
      const totalResult = await db.execute({
        sql: `SELECT SUM(quantity) as total, unit
              FROM harvest_logs
              WHERE crop_plan_item_id = ?
              GROUP BY unit
              LIMIT 1`,
        args: [validated.crop_plan_item_id],
      });
      if (totalResult.rows.length > 0) {
        const total = totalResult.rows[0] as any;
        await db.execute({
          sql: "UPDATE crop_plan_items SET actual_yield = ?, actual_yield_unit = ?, updated_at = unixepoch() WHERE id = ?",
          args: [total.total, total.unit, validated.crop_plan_item_id],
        });
      }
    }

    const result = await db.execute({
      sql: `SELECT hl.*, s.common_name as species_name
            FROM harvest_logs hl
            LEFT JOIN species s ON hl.species_id = s.id
            WHERE hl.id = ?`,
      args: [logId],
    });

    return Response.json({ log: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error creating harvest log:", error);
    return Response.json({ error: "Failed to create harvest log" }, { status: 500 });
  }
}

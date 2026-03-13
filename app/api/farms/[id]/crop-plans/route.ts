import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const cropPlanSchema = z.object({
  name: z.string().min(1).max(200),
  season: z.enum(["spring", "summer", "fall", "winter", "year-round"]).optional().default("year-round"),
  year: z.number().min(2020).max(2100).optional().default(new Date().getFullYear()),
  status: z.enum(["draft", "active", "completed", "archived"]).default("draft"),
  notes: z.string().max(2000).optional().nullable(),
  zone_id: z.string().uuid().optional().nullable(),
  start_date: z.number().int().optional().nullable(),
  end_date: z.number().int().optional().nullable(),
  variety: z.string().max(500).optional().nullable(),
  expected_yield: z.string().max(500).optional().nullable(),
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

    const plansResult = await db.execute({
      sql: `SELECT cp.*,
            (SELECT COUNT(*) FROM crop_plan_items WHERE crop_plan_id = cp.id) as item_count
            FROM crop_plans cp
            WHERE cp.farm_id = ?
            ORDER BY cp.year DESC, CASE cp.season
              WHEN 'spring' THEN 1 WHEN 'summer' THEN 2
              WHEN 'fall' THEN 3 WHEN 'winter' THEN 4
              ELSE 5 END`,
      args: [farmId],
    });

    return Response.json({ plans: plansResult.rows });
  } catch (error) {
    console.error("Error fetching crop plans:", error);
    return Response.json({ error: "Failed to fetch crop plans" }, { status: 500 });
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

    const validated = cropPlanSchema.parse(body);
    const planId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO crop_plans (id, farm_id, name, season, year, status, notes, zone_id, start_date, end_date, variety, expected_yield, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      args: [
        planId, farmId, validated.name, validated.season, validated.year, validated.status,
        validated.notes || null, validated.zone_id || null, validated.start_date || null,
        validated.end_date || null, validated.variety || null, validated.expected_yield || null,
        session.user.id,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM crop_plans WHERE id = ?", args: [planId] });
    return Response.json({ plan: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error creating crop plan:", error);
    return Response.json({ error: "Failed to create crop plan" }, { status: 500 });
  }
}

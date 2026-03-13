import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const timelineEntrySchema = z.object({
  label: z.string().min(1).max(500),
  entry_date: z.number(),
  type: z.enum(["crop_plan", "task", "phase", "manual"]),
  source_id: z.string().max(500).optional().nullable(),
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
      sql: `SELECT * FROM timeline_entries WHERE farm_id = ? ORDER BY entry_date ASC, created_at ASC`,
      args: [farmId],
    });

    return Response.json({ entries: result.rows });
  } catch (error) {
    console.error("Error fetching timeline entries:", error);
    return Response.json({ error: "Failed to fetch timeline entries" }, { status: 500 });
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

    const validated = timelineEntrySchema.parse(body);
    const entryId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO timeline_entries (id, farm_id, label, entry_date, type, source_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
      args: [
        entryId,
        farmId,
        validated.label,
        validated.entry_date,
        validated.type,
        validated.source_id || null,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM timeline_entries WHERE id = ?", args: [entryId] });
    return Response.json({ entry: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error creating timeline entry:", error);
    return Response.json({ error: "Failed to create timeline entry" }, { status: 500 });
  }
}

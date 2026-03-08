import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  task_type: z.enum(["planting", "watering", "harvesting", "maintenance", "observation", "pruning", "mulching", "custom"]).default("custom"),
  priority: z.number().min(1).max(4).default(2),
  due_date: z.number().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  related_planting_id: z.string().optional().nullable(),
  related_zone_id: z.string().optional().nullable(),
  recurrence: z.object({
    pattern: z.enum(["daily", "weekly", "biweekly", "monthly", "seasonal"]),
    interval: z.number().min(1).default(1),
    end_date: z.number().optional(),
  }).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;
    const { searchParams } = new URL(request.url);

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const status = searchParams.get("status");
    const type = searchParams.get("type");

    let sql = "SELECT * FROM tasks WHERE farm_id = ?";
    const args: any[] = [farmId];

    if (status && status !== "all") {
      sql += " AND status = ?";
      args.push(status);
    }
    if (type && type !== "all") {
      sql += " AND task_type = ?";
      args.push(type);
    }

    sql += " ORDER BY CASE WHEN status = 'completed' THEN 1 WHEN status = 'skipped' THEN 2 ELSE 0 END, priority DESC, due_date ASC NULLS LAST, created_at DESC";

    const result = await db.execute({ sql, args });

    const tasks = result.rows.map((row: any) => ({
      ...row,
      recurrence: row.recurrence ? JSON.parse(row.recurrence) : null,
      tags: row.tags ? JSON.parse(row.tags) : [],
    }));

    return Response.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return Response.json({ error: "Failed to fetch tasks" }, { status: 500 });
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

    const validated = taskSchema.parse(body);
    const taskId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO tasks (id, farm_id, title, description, task_type, priority, due_date, assigned_to, related_planting_id, related_zone_id, recurrence, tags, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      args: [
        taskId,
        farmId,
        validated.title,
        validated.description || null,
        validated.task_type,
        validated.priority,
        validated.due_date || null,
        validated.assigned_to || null,
        validated.related_planting_id || null,
        validated.related_zone_id || null,
        validated.recurrence ? JSON.stringify(validated.recurrence) : null,
        validated.tags ? JSON.stringify(validated.tags) : null,
        session.user.id,
      ],
    });

    const created = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ?",
      args: [taskId],
    });

    const task = created.rows[0] as any;

    return Response.json({
      task: {
        ...task,
        recurrence: task.recurrence ? JSON.parse(task.recurrence) : null,
        tags: task.tags ? JSON.parse(task.tags) : [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error creating task:", error);
    return Response.json({ error: "Failed to create task" }, { status: 500 });
  }
}

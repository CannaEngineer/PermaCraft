import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  task_type: z.enum(["planting", "watering", "harvesting", "maintenance", "observation", "pruning", "mulching", "custom"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "skipped"]).optional(),
  priority: z.number().min(1).max(4).optional(),
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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, taskId } = await params;
    const body = await request.json();

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const validated = updateTaskSchema.parse(body);

    const setClauses: string[] = [];
    const args: any[] = [];

    if (validated.title !== undefined) { setClauses.push("title = ?"); args.push(validated.title); }
    if (validated.description !== undefined) { setClauses.push("description = ?"); args.push(validated.description); }
    if (validated.task_type !== undefined) { setClauses.push("task_type = ?"); args.push(validated.task_type); }
    if (validated.priority !== undefined) { setClauses.push("priority = ?"); args.push(validated.priority); }
    if (validated.due_date !== undefined) { setClauses.push("due_date = ?"); args.push(validated.due_date); }
    if (validated.assigned_to !== undefined) { setClauses.push("assigned_to = ?"); args.push(validated.assigned_to); }
    if (validated.related_planting_id !== undefined) { setClauses.push("related_planting_id = ?"); args.push(validated.related_planting_id); }
    if (validated.related_zone_id !== undefined) { setClauses.push("related_zone_id = ?"); args.push(validated.related_zone_id); }
    if (validated.recurrence !== undefined) { setClauses.push("recurrence = ?"); args.push(validated.recurrence ? JSON.stringify(validated.recurrence) : null); }
    if (validated.tags !== undefined) { setClauses.push("tags = ?"); args.push(validated.tags ? JSON.stringify(validated.tags) : null); }

    if (validated.status !== undefined) {
      setClauses.push("status = ?");
      args.push(validated.status);
      if (validated.status === "completed") {
        setClauses.push("completed_at = unixepoch()");
      } else {
        setClauses.push("completed_at = NULL");
      }
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    setClauses.push("updated_at = unixepoch()");
    args.push(taskId, farmId);

    await db.execute({
      sql: `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = ? AND farm_id = ?`,
      args,
    });

    const result = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ?",
      args: [taskId],
    });

    if (result.rows.length === 0) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const task = result.rows[0] as any;
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
    console.error("Error updating task:", error);
    return Response.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: farmId, taskId } = await params;

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    await db.execute({
      sql: "DELETE FROM tasks WHERE id = ? AND farm_id = ?",
      args: [taskId, farmId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return Response.json({ error: "Failed to delete task" }, { status: 500 });
  }
}

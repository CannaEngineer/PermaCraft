import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const storyEntrySchema = z.object({
  type: z.enum(["task", "milestone", "phase", "manual"]),
  content: z.string().max(5000).optional().nullable(),
  taskId: z.string().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
  entry_date: z.number().optional(),
  photo_url: z.string().url().max(2000).optional().nullable(),
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

    const sourcePrefix = request.nextUrl.searchParams.get("source_prefix");

    let sql: string;
    let args: (string | number)[];

    if (sourcePrefix) {
      sql = `SELECT * FROM story_entries WHERE farm_id = ? AND source_id LIKE ? ORDER BY entry_date DESC, created_at DESC`;
      args = [farmId, `${sourcePrefix}%`];
    } else {
      sql = `SELECT * FROM story_entries WHERE farm_id = ? ORDER BY entry_date DESC, created_at DESC`;
      args = [farmId];
    }

    const result = await db.execute({ sql, args });
    return Response.json({ entries: result.rows });
  } catch (error) {
    console.error("Error fetching story entries:", error);
    return Response.json({ error: "Failed to fetch story entries" }, { status: 500 });
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

    const validated = storyEntrySchema.parse(body);
    const entryId = crypto.randomUUID();

    let content = validated.content || "";
    let sourceId: string | null = null;

    // When type is 'task' and taskId is provided, fetch task title and build content
    if (validated.type === "task" && validated.taskId) {
      const taskResult = await db.execute({
        sql: "SELECT title FROM tasks WHERE id = ? AND farm_id = ?",
        args: [validated.taskId, farmId],
      });
      if (taskResult.rows.length === 0) {
        return Response.json({ error: "Task not found" }, { status: 404 });
      }
      const taskTitle = taskResult.rows[0].title as string;
      const note = validated.note ? ` ${validated.note}` : "";
      content = `Completed task: ${taskTitle}.${note}`;
      sourceId = `task:${validated.taskId}`;
    }

    const entryDate = validated.entry_date || Math.floor(Date.now() / 1000);

    await db.execute({
      sql: `INSERT INTO story_entries (id, farm_id, type, content, photo_url, source_id, status, entry_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      args: [
        entryId,
        farmId,
        validated.type,
        content,
        validated.photo_url || null,
        sourceId,
        validated.status,
        entryDate,
      ],
    });

    const result = await db.execute({ sql: "SELECT * FROM story_entries WHERE id = ?", args: [entryId] });
    return Response.json({ entry: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error creating story entry:", error);
    return Response.json({ error: "Failed to create story entry" }, { status: 500 });
  }
}

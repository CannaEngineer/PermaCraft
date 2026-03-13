import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { z } from "zod";

const updateStoryEntrySchema = z.object({
  status: z.enum(["draft", "published"]).optional(),
  content: z.string().max(5000).optional(),
  photo_url: z.string().url().max(2000).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, entryId } = await params;
    const body = await request.json();

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const entryResult = await db.execute({
      sql: "SELECT id FROM story_entries WHERE id = ? AND farm_id = ?",
      args: [entryId, farmId],
    });
    if (entryResult.rows.length === 0) {
      return Response.json({ error: "Story entry not found" }, { status: 404 });
    }

    const validated = updateStoryEntrySchema.parse(body);

    const setClauses: string[] = [];
    const args: (string | null)[] = [];

    if (validated.status !== undefined) {
      setClauses.push("status = ?");
      args.push(validated.status);
    }
    if (validated.content !== undefined) {
      setClauses.push("content = ?");
      args.push(validated.content);
    }
    if (validated.photo_url !== undefined) {
      setClauses.push("photo_url = ?");
      args.push(validated.photo_url);
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    args.push(entryId);
    args.push(farmId);

    await db.execute({
      sql: `UPDATE story_entries SET ${setClauses.join(", ")} WHERE id = ? AND farm_id = ?`,
      args,
    });

    const result = await db.execute({ sql: "SELECT * FROM story_entries WHERE id = ?", args: [entryId] });
    return Response.json({ entry: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    console.error("Error updating story entry:", error);
    return Response.json({ error: "Failed to update story entry" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId, entryId } = await params;

    const farmResult = await db.execute({
      sql: "SELECT id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });
    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const entryResult = await db.execute({
      sql: "SELECT id FROM story_entries WHERE id = ? AND farm_id = ?",
      args: [entryId, farmId],
    });
    if (entryResult.rows.length === 0) {
      return Response.json({ error: "Story entry not found" }, { status: 404 });
    }

    await db.execute({
      sql: "DELETE FROM story_entries WHERE id = ? AND farm_id = ?",
      args: [entryId, farmId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting story entry:", error);
    return Response.json({ error: "Failed to delete story entry" }, { status: 500 });
  }
}

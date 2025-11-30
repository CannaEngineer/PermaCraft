import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await context.params;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT id, user_id FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found or access denied" }, { status: 404 });
    }

    // Delete all related data in correct order (respecting foreign key constraints)
    // 1. Delete AI analyses
    await db.execute({
      sql: "DELETE FROM ai_analyses WHERE farm_id = ?",
      args: [farmId],
    });

    // 2. Delete AI conversations
    await db.execute({
      sql: "DELETE FROM ai_conversations WHERE farm_id = ?",
      args: [farmId],
    });

    // 3. Delete map snapshots
    await db.execute({
      sql: "DELETE FROM map_snapshots WHERE farm_id = ?",
      args: [farmId],
    });

    // 4. Delete plantings
    await db.execute({
      sql: "DELETE FROM plantings WHERE farm_id = ?",
      args: [farmId],
    });

    // 5. Delete zones
    await db.execute({
      sql: "DELETE FROM zones WHERE farm_id = ?",
      args: [farmId],
    });

    // 6. Delete farm collaborators
    await db.execute({
      sql: "DELETE FROM farm_collaborators WHERE farm_id = ?",
      args: [farmId],
    });

    // 7. Finally delete the farm itself
    await db.execute({
      sql: "DELETE FROM farms WHERE id = ?",
      args: [farmId],
    });

    return Response.json({ success: true, message: "Farm deleted successfully" });
  } catch (error) {
    console.error("Delete farm error:", error);
    return Response.json({ error: "Failed to delete farm" }, { status: 500 });
  }
}

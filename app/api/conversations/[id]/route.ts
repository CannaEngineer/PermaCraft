import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// DELETE /api/conversations/[id] - Delete a conversation and all its analyses
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: conversationId } = await params;

    // Get conversation and verify access via user_id column
    const conversationResult = await db.execute({
      sql: `SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?`,
      args: [conversationId, session.user.id],
    });

    if (conversationResult.rows.length === 0) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Delete all analyses in this conversation (cascade)
    await db.execute({
      sql: `DELETE FROM ai_analyses WHERE conversation_id = ?`,
      args: [conversationId],
    });

    // Delete the conversation
    await db.execute({
      sql: `DELETE FROM ai_conversations WHERE id = ?`,
      args: [conversationId],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return Response.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}

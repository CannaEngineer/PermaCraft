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

    // Get conversation and verify access
    const conversationResult = await db.execute({
      sql: `SELECT ac.*, f.user_id
            FROM ai_conversations ac
            JOIN farms f ON ac.farm_id = f.id
            WHERE ac.id = ?`,
      args: [conversationId],
    });

    if (conversationResult.rows.length === 0) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    const conversation = conversationResult.rows[0] as any;
    if (conversation.user_id !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
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

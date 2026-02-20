import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import type { AIAnalysis } from "@/lib/db/schema";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/conversations/[id]/messages - Get all messages for a conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const conversationId = params.id;

    // Get conversation and verify access via user_id column
    const conversationResult = await db.execute({
      sql: `SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?`,
      args: [conversationId, session.user.id],
    });

    if (conversationResult.rows.length === 0) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get all messages in this conversation
    const messagesResult = await db.execute({
      sql: `SELECT * FROM ai_analyses
            WHERE conversation_id = ?
            ORDER BY created_at ASC`,
      args: [conversationId],
    });

    const messages = messagesResult.rows as unknown as AIAnalysis[];

    return Response.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

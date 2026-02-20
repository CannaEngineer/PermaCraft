import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import type { AIConversation, AIAnalysis } from "@/lib/db/schema";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/farms/[id]/conversations - Get all conversations for a farm with message preview
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Get farm-specific conversations only (not general Q&A)
    const conversationsResult = await db.execute({
      sql: `SELECT id, title, created_at, updated_at
            FROM ai_conversations
            WHERE farm_id = ? AND conversation_type = 'farm'
            ORDER BY updated_at DESC
            LIMIT 50`,
      args: [farmId],
    });

    // Get first message from each conversation for preview
    const conversations = await Promise.all(
      conversationsResult.rows.map(async (conv: any) => {
        const messagesResult = await db.execute({
          sql: `SELECT user_query FROM ai_analyses
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                LIMIT 1`,
          args: [conv.id],
        });

        const firstMessage = messagesResult.rows[0] as any;

        return {
          id: conv.id,
          title: conv.title,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          preview: firstMessage?.user_query?.substring(0, 100) || 'No messages',
        };
      })
    );

    return Response.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return Response.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

// POST /api/farms/[id]/conversations - Create a new conversation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: farmId } = await params;
    const body = await request.json();
    const { title } = body;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Create new conversation
    const conversationId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO ai_conversations (id, farm_id, user_id, conversation_type, title, created_at, updated_at)
            VALUES (?, ?, ?, 'farm', ?, unixepoch(), unixepoch())`,
      args: [conversationId, farmId, session.user.id, title || "New Conversation"],
    });

    // Fetch the created conversation
    const result = await db.execute({
      sql: "SELECT * FROM ai_conversations WHERE id = ?",
      args: [conversationId],
    });

    const conversation = result.rows[0] as unknown as AIConversation;

    return Response.json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return Response.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}

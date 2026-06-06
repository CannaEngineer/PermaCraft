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

    // Single query: join conversations with their first message for preview
    const conversationsResult = await db.execute({
      sql: `SELECT c.id, c.title, c.created_at, c.updated_at,
                   SUBSTR(first_msg.user_query, 1, 100) AS preview
            FROM ai_conversations c
            LEFT JOIN (
              SELECT conversation_id, user_query,
                     ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at ASC) AS rn
              FROM ai_analyses
            ) first_msg ON first_msg.conversation_id = c.id AND first_msg.rn = 1
            WHERE c.farm_id = ?
            ORDER BY c.updated_at DESC
            LIMIT 50`,
      args: [farmId],
    });

    const conversations = conversationsResult.rows.map((conv: any) => ({
      id: conv.id,
      title: conv.title,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      preview: conv.preview || 'No messages',
    }));

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
      sql: `INSERT INTO ai_conversations (id, farm_id, title, created_at, updated_at)
            VALUES (?, ?, ?, unixepoch(), unixepoch())`,
      args: [conversationId, farmId, title || "New Conversation"],
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

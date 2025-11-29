import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import type { AIConversation, AIAnalysis } from "@/lib/db/schema";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/farms/[id]/conversations - Get all conversations for a farm
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const farmId = params.id;

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    // Get all conversations for this farm, ordered by most recent
    const conversationsResult = await db.execute({
      sql: `SELECT * FROM ai_conversations
            WHERE farm_id = ?
            ORDER BY updated_at DESC`,
      args: [farmId],
    });

    const conversations = conversationsResult.rows as unknown as AIConversation[];

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
    const farmId = params.id;
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

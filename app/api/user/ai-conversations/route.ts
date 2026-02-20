import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

/**
 * GET /api/user/ai-conversations
 *
 * Fetch all AI conversations across all user's farms, ordered by most recent.
 * Used for cross-farm AI insight post creation.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Get all conversations for this user (including general ones without a farm)
    const result = await db.execute({
      sql: `
        SELECT
          c.id,
          c.farm_id,
          c.conversation_type,
          c.created_at,
          f.name as farm_name,
          (
            SELECT user_query
            FROM ai_analyses
            WHERE conversation_id = c.id
            ORDER BY created_at ASC
            LIMIT 1
          ) as first_query
        FROM ai_conversations c
        LEFT JOIN farms f ON c.farm_id = f.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `,
      args: [session.user.id],
    });

    const conversations = result.rows.map((row: any) => ({
      id: row.id,
      farm_id: row.farm_id,
      farm_name: row.farm_name || null,
      conversation_type: row.conversation_type,
      created_at: row.created_at,
      preview: row.first_query || 'New conversation',
    }));

    return Response.json({
      conversations,
      has_any: conversations.length > 0,
    });
  } catch (error) {
    console.error("Failed to fetch user AI conversations:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return Response.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

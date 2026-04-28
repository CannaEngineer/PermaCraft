import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { openrouter, FREE_VISION_MODELS, FALLBACK_VISION_MODEL } from "@/lib/ai/openrouter";
import { GENERAL_PERMACULTURE_SYSTEM_PROMPT, createGeneralChatPrompt } from "@/lib/ai/prompts";
import { manageConversationContext } from "@/lib/ai/context-manager";
import { checkRateLimit, rateLimitHeaders } from "@/lib/ai/rate-limit";
import { getFarmPlanningModel } from "@/lib/ai/model-settings";
import { getGoalsForAIContext } from "@/lib/ai/goals-context";
import { getRAGContext } from "@/lib/ai/rag-context";
import { isComplexPlanningQuery } from "@/lib/ai/planning-detection";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Farm } from "@/lib/db/schema";

export const dynamic = 'force-dynamic';

const chatSchema = z.object({
  query: z.string().min(1).max(5000),
  conversationId: z.string().max(100).optional(),
  farmId: z.string().max(100).optional(),
});

/**
 * POST /api/ai/chat
 *
 * Text-only AI chat endpoint for general permaculture Q&A.
 * When farmId is provided, includes farm metadata in the prompt.
 * No screenshots — uses text models only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Rate limit
    const rateLimit = checkRateLimit(session.user.id, 'ai-chat');
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { query, conversationId, farmId } = chatSchema.parse(body);

    // If farmId provided, verify ownership and fetch metadata
    let farm: Farm | null = null;
    let zoneCount = 0;
    let plantingCount = 0;
    let zonesResult: Awaited<ReturnType<typeof db.execute>> | null = null;
    let plantingsResult: Awaited<ReturnType<typeof db.execute>> | null = null;
    let linesResult: Awaited<ReturnType<typeof db.execute>> | null = null;
    let goalsContext = '';
    let nativeSpeciesData: Array<{ common_name: string; scientific_name: string; layer: string; mature_height_ft: number }> = [];
    let ragContext = '';

    if (farmId) {
      const farmResult = await db.execute({
        sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
        args: [farmId, session.user.id],
      });

      if (farmResult.rows.length === 0) {
        return Response.json({ error: "Farm not found" }, { status: 404 });
      }

      farm = farmResult.rows[0] as unknown as Farm;

      // Fetch actual composition for richer AI context
      [zonesResult, plantingsResult, linesResult] = await Promise.all([
        db.execute({
          sql: "SELECT name, zone_type FROM zones WHERE farm_id = ?",
          args: [farmId],
        }),
        db.execute({
          sql: `SELECT s.common_name, s.scientific_name, s.layer, s.is_native,
                       s.permaculture_functions
                FROM plantings p JOIN species s ON p.species_id = s.id
                WHERE p.farm_id = ?`,
          args: [farmId],
        }),
        db.execute({
          sql: `SELECT line_type, label FROM lines WHERE farm_id = ?`,
          args: [farmId],
        }),
      ]);
      zoneCount = zonesResult.rows.length;
      plantingCount = plantingsResult.rows.length;

      // Fetch goals and native species for richer recommendations
      goalsContext = await getGoalsForAIContext(farmId);

      if (farm.climate_zone) {
        const zoneNum = farm.climate_zone.replace(/[ab]/i, '');
        const nativeResult = await db.execute({
          sql: `SELECT common_name, scientific_name, layer, mature_height_ft
                FROM species
                WHERE is_native = 1
                  AND (
                    (min_hardiness_zone IS NOT NULL AND max_hardiness_zone IS NOT NULL
                     AND CAST(REPLACE(REPLACE(min_hardiness_zone, 'a', ''), 'b', '') AS INTEGER) <= ?
                     AND CAST(REPLACE(REPLACE(max_hardiness_zone, 'a', ''), 'b', '') AS INTEGER) >= ?)
                    OR hardiness_zones LIKE ?
                  )
                LIMIT 10`,
          args: [parseInt(zoneNum) || 0, parseInt(zoneNum) || 0, `%${farm.climate_zone}%`],
        });
        if (nativeResult.rows.length > 0) {
          nativeSpeciesData = nativeResult.rows.map((s: any) => ({
            common_name: s.common_name as string,
            scientific_name: s.scientific_name as string,
            layer: s.layer as string,
            mature_height_ft: s.mature_height_ft as number,
          }));
        }
      }

      // Fetch RAG context
      ragContext = await getRAGContext(query, 3);
    }

    // Get or create conversation
    const conversationType = farm ? 'farm' : 'general';
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      const newId = crypto.randomUUID();
      const title = query.length > 50 ? query.substring(0, 47) + "..." : query;

      await db.execute({
        sql: `INSERT INTO ai_conversations (id, farm_id, user_id, conversation_type, title, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
        args: [newId, farmId || null, session.user.id, conversationType, title],
      });
      activeConversationId = newId;
    } else {
      await db.execute({
        sql: `UPDATE ai_conversations SET updated_at = unixepoch() WHERE id = ?`,
        args: [activeConversationId],
      });
    }

    // Build prompt with actual farm composition data
    const userPrompt = createGeneralChatPrompt(query, farm ? {
      name: farm.name,
      acres: farm.acres,
      climateZone: farm.climate_zone,
      soilType: farm.soil_type,
      rainfallInches: farm.rainfall_inches,
      zoneCount,
      plantingCount,
      zones: zonesResult?.rows.map((z: any) => ({
        name: z.name as string | null,
        zone_type: z.zone_type as string,
      })),
      plantings: plantingsResult?.rows.map((p: any) => ({
        common_name: p.common_name as string,
        scientific_name: p.scientific_name as string,
        layer: p.layer as string,
        is_native: p.is_native as number,
        permaculture_functions: p.permaculture_functions as string | null,
      })),
      lines: linesResult?.rows.map((l: any) => ({
        line_type: l.line_type as string,
        label: l.label as string | null,
      })),
      goalsContext,
      nativeSpecies: nativeSpeciesData.length > 0 ? nativeSpeciesData : undefined,
      ragContext: ragContext || undefined,
    } : undefined);

    // Load conversation history
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (activeConversationId) {
      const historyResult = await db.execute({
        sql: `SELECT user_query, ai_response FROM ai_analyses
              WHERE conversation_id = ?
              ORDER BY created_at DESC LIMIT 50`,
        args: [activeConversationId],
      });
      historyResult.rows.reverse();

      for (const row of historyResult.rows) {
        conversationHistory.push({ role: "user", content: row.user_query as string });
        conversationHistory.push({ role: "assistant", content: row.ai_response as string });
      }

      const { managedHistory } = manageConversationContext(conversationHistory);
      conversationHistory = managedHistory;
    }

    // Detect complex planning queries — route to MiniMax M2.5 for optimized planning
    const isPlanningQuery = isComplexPlanningQuery(query);

    let completion;
    let usedModel = FREE_VISION_MODELS[0];

    if (isPlanningQuery) {
      // Use MiniMax M2.5 for planning queries (better structured output, planning optimization)
      const planningModel = await getFarmPlanningModel();
      try {
        completion = await openrouter.chat.completions.create({
          model: planningModel,
          messages: [
            { role: "system", content: GENERAL_PERMACULTURE_SYSTEM_PROMPT },
            ...conversationHistory,
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3, // Lower temperature for structured planning output
          max_tokens: 6000, // Planning queries need more tokens for detailed plans
        });

        if (completion?.choices?.[0]?.message?.content) {
          usedModel = planningModel;
        }
      } catch (error: any) {
        console.warn(`Planning model ${planningModel} failed, falling back to standard chain:`, error?.status);
        completion = undefined; // Fall through to standard chain
      }
    }

    // Standard model fallback chain (used for non-planning queries, or if planning model fails)
    if (!completion?.choices?.[0]?.message?.content) {
      for (const model of FREE_VISION_MODELS) {
        try {
          completion = await openrouter.chat.completions.create({
            model,
            messages: [
              { role: "system", content: GENERAL_PERMACULTURE_SYSTEM_PROMPT },
              ...conversationHistory,
              { role: "user", content: userPrompt },
            ],
            max_tokens: 4000,
          });

          if (completion?.choices?.[0]?.message?.content) {
            usedModel = model;
            break;
          }
        } catch (error: any) {
          const isRetryable = error?.status === 429 || error?.status === 413 ||
                              error?.status === 404 || error?.error?.message?.includes('unsupported');
          if (!isRetryable) throw error;
          continue;
        }
      }
    }

    // Paid fallback
    if (!completion?.choices?.[0]?.message?.content) {
      completion = await openrouter.chat.completions.create({
        model: FALLBACK_VISION_MODEL,
        messages: [
          { role: "system", content: GENERAL_PERMACULTURE_SYSTEM_PROMPT },
          ...conversationHistory,
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
      });
      usedModel = FALLBACK_VISION_MODEL;
    }

    const response = completion?.choices?.[0]?.message?.content || "No response generated";

    // Store in ai_analyses
    const analysisId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO ai_analyses (id, farm_id, conversation_id, user_query, ai_response, model, created_at)
            VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
      args: [analysisId, farmId || null, activeConversationId, query, response, usedModel],
    });

    return Response.json({
      response,
      analysisId,
      conversationId: activeConversationId,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }

    return Response.json({
      error: "Chat failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

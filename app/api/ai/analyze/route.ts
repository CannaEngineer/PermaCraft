import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { openrouter, FREE_VISION_MODEL } from "@/lib/ai/openrouter";
import { PERMACULTURE_SYSTEM_PROMPT, createAnalysisPrompt } from "@/lib/ai/prompts";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Farm } from "@/lib/db/schema";

const analyzeSchema = z.object({
  farmId: z.string(),
  query: z.string().min(1),
  imageData: z.string(), // Base64 data URI
  mapLayer: z.string().optional(),
  zones: z.array(z.object({
    type: z.string(),
    name: z.string(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { farmId, query, imageData, mapLayer, zones } = analyzeSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as unknown as Farm;

    // Build context about zones
    let zoneContext = "";
    if (zones && zones.length > 0) {
      zoneContext = "\n\nDRAWN ZONES ON MAP:\n" + zones.map(z =>
        `- ${z.name} (${z.type})`
      ).join("\n");
    }

    // Build context about map layer
    let mapContext = "";
    if (mapLayer) {
      const layerDescriptions: Record<string, string> = {
        satellite: "showing satellite/aerial imagery",
        terrain: "showing terrain and topographic features",
        topo: "showing detailed topographic contours and elevation",
        street: "showing street-level map view"
      };
      mapContext = `\n\nMAP VIEW: ${layerDescriptions[mapLayer] || mapLayer}`;
    }

    // Create analysis prompt with additional context
    const userPrompt = createAnalysisPrompt(
      {
        name: farm.name,
        acres: farm.acres || undefined,
        climateZone: farm.climate_zone || undefined,
        rainfallInches: farm.rainfall_inches || undefined,
        soilType: farm.soil_type || undefined,
      },
      query
    ) + mapContext + zoneContext;

    // Call OpenRouter with base64 image data
    const completion = await openrouter.chat.completions.create({
      model: FREE_VISION_MODEL,
      messages: [
        {
          role: "system",
          content: PERMACULTURE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageData } },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || "No response generated";

    // Save analysis to database
    const analysisId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO ai_analyses (id, farm_id, user_query, ai_response, model)
            VALUES (?, ?, ?, ?, ?)`,
      args: [analysisId, farmId, query, response, FREE_VISION_MODEL],
    });

    return Response.json({ response });
  } catch (error) {
    console.error("AI analysis error:", error);
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}

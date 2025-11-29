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
  screenshotUrl: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { farmId, query, screenshotUrl } = analyzeSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as unknown as Farm;

    // Create analysis prompt
    const userPrompt = createAnalysisPrompt(
      {
        name: farm.name,
        acres: farm.acres || undefined,
        climateZone: farm.climate_zone || undefined,
        rainfallInches: farm.rainfall_inches || undefined,
        soilType: farm.soil_type || undefined,
      },
      query
    );

    // Call OpenRouter
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
            { type: "image_url", image_url: { url: screenshotUrl } },
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

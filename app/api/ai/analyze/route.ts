import { requireAuth } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { openrouter, FREE_VISION_MODELS } from "@/lib/ai/openrouter";
import { PERMACULTURE_SYSTEM_PROMPT, createAnalysisPrompt } from "@/lib/ai/prompts";
import { uploadScreenshot } from "@/lib/storage/r2";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Farm } from "@/lib/db/schema";

const analyzeSchema = z.object({
  farmId: z.string(),
  conversationId: z.string().optional(), // Optional - will create new if not provided
  query: z.string().min(1),
  screenshots: z.array(z.object({
    type: z.string(), // 'satellite', 'usgs', 'topo', etc.
    data: z.string(), // Base64 data URI
  })),
  mapLayer: z.string().optional(),
  zones: z.array(z.object({
    type: z.string(),
    name: z.string(),
    geometryType: z.string().optional(),
    gridCoordinates: z.string().optional(),
    gridCells: z.array(z.string()).optional(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { farmId, conversationId, query, screenshots, mapLayer, zones } = analyzeSchema.parse(body);

    // Verify farm ownership
    const farmResult = await db.execute({
      sql: "SELECT * FROM farms WHERE id = ? AND user_id = ?",
      args: [farmId, session.user.id],
    });

    if (farmResult.rows.length === 0) {
      return Response.json({ error: "Farm not found" }, { status: 404 });
    }

    const farm = farmResult.rows[0] as unknown as Farm;

    // Get or create conversation
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      // Create new conversation with auto-generated title
      const newConversationId = crypto.randomUUID();
      const conversationTitle = query.length > 50
        ? query.substring(0, 47) + "..."
        : query;

      await db.execute({
        sql: `INSERT INTO ai_conversations (id, farm_id, title, created_at, updated_at)
              VALUES (?, ?, ?, unixepoch(), unixepoch())`,
        args: [newConversationId, farmId, conversationTitle],
      });

      activeConversationId = newConversationId;
    } else {
      // Update existing conversation timestamp
      await db.execute({
        sql: `UPDATE ai_conversations SET updated_at = unixepoch() WHERE id = ?`,
        args: [activeConversationId],
      });
    }

    // Create analysis prompt with farm and map context
    const userPrompt = createAnalysisPrompt(
      {
        name: farm.name,
        acres: farm.acres || undefined,
        climateZone: farm.climate_zone || undefined,
        rainfallInches: farm.rainfall_inches || undefined,
        soilType: farm.soil_type || undefined,
        centerLat: farm.center_lat,
        centerLng: farm.center_lng,
      },
      query,
      {
        layer: mapLayer,
        screenshots: screenshots,
        zones: zones,
      }
    );

    // Upload screenshots to R2 storage
    const screenshotUrls: string[] = [];
    try {
      console.log("Uploading screenshots to R2...", {
        screenshotCount: screenshots.length,
        types: screenshots.map(s => s.type),
        hasR2PublicUrl: !!process.env.R2_PUBLIC_URL,
      });

      for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        try {
          const url = await uploadScreenshot(
            farmId,
            screenshot.data,
            `${screenshot.type}-${i}`
          );
          screenshotUrls.push(url);
          console.log(`Screenshot ${i + 1} (${screenshot.type}) uploaded:`, url.substring(0, 100));
        } catch (error) {
          console.error(`Failed to upload screenshot ${i + 1} to R2:`, error);
          // Fallback: use base64 data if R2 upload fails
          screenshotUrls.push(screenshot.data);
          console.log(`Using base64 fallback for screenshot ${i + 1}`);
        }
      }
    } catch (error) {
      console.error("Failed to upload screenshots:", error);
      // Fallback: use base64 data for all screenshots
      screenshots.forEach(s => screenshotUrls.push(s.data));
    }

    // Verify image data is present
    console.log("AI Analysis Request:", {
      farmId,
      query: query.substring(0, 50) + "...",
      screenshotCount: screenshots.length,
      screenshotTypes: screenshots.map(s => s.type),
      screenshotUrls: screenshotUrls.map(url => url.substring(0, 100)),
      zonesCount: zones?.length || 0,
      mapLayer,
    });

    // Call OpenRouter with base64 image data - try models with fallback on rate limit
    let completion;
    let usedModel = FREE_VISION_MODELS[0];
    let lastError;

    for (const model of FREE_VISION_MODELS) {
      try {
        console.log(`Attempting AI analysis with model: ${model}`);

        // Build content array with text + multiple images
        const userContent: any[] = [{ type: "text", text: userPrompt }];

        // Add all screenshot images
        screenshots.forEach((screenshot, idx) => {
          userContent.push({
            type: "image_url",
            image_url: { url: screenshot.data },
          });
        });

        completion = await openrouter.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: PERMACULTURE_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: userContent,
            },
          ],
          max_tokens: 4000,
        });

        usedModel = model;
        console.log(`AI Response received from ${model}:`, {
          hasResponse: !!completion.choices[0]?.message?.content,
          responseLength: completion.choices[0]?.message?.content?.length || 0,
        });
        break; // Success! Exit loop

      } catch (error: any) {
        lastError = error;
        console.error(`Model ${model} failed:`, error?.status, error?.error?.message);

        // If rate limited (429) or unsupported content/modality, try next model
        const isRateLimited = error?.status === 429 || error?.code === 429;
        const isUnsupported = error?.error?.message?.includes('unsupported') ||
                             error?.error?.message?.includes('does not support') ||
                             error?.error?.message?.includes('vision');

        if (isRateLimited) {
          console.log(`Rate limited on ${model}, trying next model...`);
          continue;
        } else if (isUnsupported) {
          console.log(`Model ${model} doesn't support vision, trying next model...`);
          continue;
        } else {
          // For other errors, throw immediately
          throw error;
        }
      }
    }

    // If we exhausted all models, throw the last error
    if (!completion) {
      console.error("All vision models failed or rate limited");
      throw lastError || new Error("All AI models are currently rate limited. Please try again in a few moments.");
    }

    const response = completion.choices[0]?.message?.content || "No response generated";

    // Prepare zones context as JSON
    const zonesContext = zones ? JSON.stringify(zones) : null;

    // Save analysis to database with R2 URLs as JSON array
    const analysisId = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO ai_analyses (
              id, farm_id, conversation_id, user_query, screenshot_data,
              map_layer, zones_context, ai_response, model, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      args: [
        analysisId,
        farmId,
        activeConversationId,
        query,
        JSON.stringify(screenshotUrls), // Store array of R2 URLs as JSON
        mapLayer || "satellite",
        zonesContext,
        response,
        usedModel // Store which model actually responded
      ],
    });

    return Response.json({
      response,
      analysisId,
      conversationId: activeConversationId,
    });
  } catch (error) {
    console.error("AI analysis error:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    if (error instanceof z.ZodError) {
      console.error("Validation errors:", error.errors);
      return Response.json({
        error: "Invalid input",
        details: error.errors
      }, { status: 400 });
    }

    return Response.json({
      error: "Analysis failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
